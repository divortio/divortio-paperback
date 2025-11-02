/**
 * @fileoverview
 * Port of the `Finishpage` function from `Fileproc.c`.
 * This function finalizes the processing for a single scanned page.
 * It triggers data recovery, updates statistics, and checks if the
 * file is complete and ready to be saved.
 */

import { pb_fproc } from './fileState.js';
import { NDATA, NFILE } from '../primitives/constants.js';
import { Message } from '../logging/log.js';
import { recoverData } from './dataRecovery.js';
import { saveRestoredFile } from './fileSaver.js';
import { pb } from '../primitives/pb.js'; // Added to fix pb_autosave reference

/**
 * Finalizes a page scan, attempts data recovery, and checks for file completion.
 * Corresponds to `Finishpage` in `Fileproc.c`.
 *
 * @param {number} slot - The index of the file processor (t_fproc) to update.
 * @param {number} ngood - The number of good blocks found on this page.
 * @param {number} nbad - The number of unreadable blocks on this page.
 * @param {number} nrestored - The total number of bytes restored by ECC on this page.
 * @returns {Promise<object|null>} A promise that resolves to { blob, filename } if the file is
 * complete, or null otherwise. Returns -1 on critical error.
 */
export async function finishPage(slot, ngood, nbad, nrestored) {
    // C: int i,j,r,rmin,rmax,nrec,irec,firstblock,nrempages;
    // C: uchar *pr,*pd;
    // C: t_fproc *pf;

    // C: if (slot<0 || slot>=NFILE)
    // C:   return -1;
    if (slot < 0 || slot >= NFILE) {
        return -1; // Invalid index
    }
    // C: pf=pb_fproc+slot;
    const pf = pb_fproc[slot];
    // C: if (pf->busy==0)
    // C:   return -1;
    if (pf.busy === 0) {
        return -1; // Index points to unused descriptor
    }

    // C: pf->goodblocks+=ngood;
    pf.goodblocks += ngood;
    // C: pf->badblocks+=nbad;
    pf.badblocks += nbad;
    // C: pf->restoredbytes+=nrestored;
    pf.restoredbytes += nrestored;

    // C: if (pf->ngroup>0) {
    if (pf.ngroup > 0) {
        // C: rmin=(pf->minpageaddr/(NDATA*pf->ngroup))*pf->ngroup;
        const rmin = Math.floor(pf.minpageaddr / (NDATA * pf.ngroup)) * pf.ngroup;
        // C: rmax=(pf->maxpageaddr/(NDATA*pf->ngroup))*pf.ngroup;
        const rmax = Math.floor(pf.maxpageaddr / (NDATA * pf.ngroup)) * pf.ngroup;

        // C: for (r=rmin; r<=rmax; r+=pf->ngroup) {
        for (let r = rmin; r <= rmax; r += pf.ngroup) {
            // C: if (r+pf->ngroup>pf->nblock)
            // C:   break;
            if (r + pf.ngroup > pf.nblock) {
                break; // Inconsistent data
            }
            recoverData(pf, r);
        }
    }

    // C: firstblock=(pf->page-1)*(pf->pagesize/NDATA);
    const firstblock = (pf.page - 1) * (pf.pagesize / NDATA);
    let j;
    // C: for (j=firstblock; j<firstblock+pf->pagesize/NDATA && j<pf->nblock; j++) {
    for (j = firstblock; j < firstblock + pf.pagesize / NDATA && j < pf.nblock; j++) {
        // C: if (pf->datavalid[j]!=1) break;
        if (pf.datavalid[j] !== 1) break;
    }
    // C: if (j<firstblock+pf->pagesize/NDATA && j<pf->nblock)
    if (j < firstblock + pf.pagesize / NDATA && j < pf.nblock) {
        // C: Message("Unrecoverable errors on page, please scan it again\n",0);
        Message("Unrecoverable errors on page, please scan it again.", 0);
        // C: else if (nbad>0)
    } else if (nbad > 0) {
        // C: Message("Page processed\n, all bad blocks successfully restored",0);
        Message("Page processed, all bad blocks successfully restored.", 0);
        // C: else
    } else {
        // C: Message("Page processed\n",0);
        Message("Page processed.", 0);
    }

    // C: nrempages=0;
    let nrempages = 0;
    // C: if (pf->pagesize>0) {
    if (pf.pagesize > 0) {
        // C: for (i=0; i<pf->npages && nrempages<8; i++) {
        for (let i = 0; i < pf.npages && nrempages < 8; i++) {
            const pageBlockCount = pf.pagesize / NDATA;
            // C: firstblock=i*(pf->pagesize/NDATA);
            const pageFirstBlock = Math.floor(i * (pf.pagesize / NDATA));
            const pageEndBlock = pageFirstBlock + pageBlockCount;
            // C: for (j=firstblock; j<firstblock+pf->pagesize/NDATA && j<pf->nblock; j++) {
            for (let j = pageFirstBlock; j < pageEndBlock && j < pf.nblock; j++) {
                // C: if (pf->datavalid[j]==1)
                // C:   continue;
                if (pf.datavalid[j] === 1) {
                    continue;
                }
                // C: // Page incomplete.
                // C: pf->rempages[nrempages++]=i+1;
                pf.rempages[nrempages++] = i + 1; // Page number is 1-based
                // C: break;
                break;
            }
        }
    }
    // C: if (nrempages<8)
    if (nrempages < 8) {
        // C: pf->rempages[nrempages]=0;
        pf.rempages[nrempages] = 0; // Mark end of list
    }

    // C: //Updatefileinfo(slot,pf);
    // (UI logic would go here to display pf.rempages)

    // C: if (pf->ndata==pf->nblock) {
    if (pf.ndata === pf.nblock) {
        // C: if (pb_autosave==0) {
        if (!pb.pb_autosave) { // Use imported pb object
            // C: Message("File restored.",0);
            Message("File restored.", 0);
            return await saveRestoredFile(slot, 0); // await and return result
        } else {
            // C: Message("File complete",0);
            Message("File complete", 0);
            return await saveRestoredFile(slot, 0); // await and return result
        }
    }
    return null; // File is not yet complete
}