/**
 * @fileoverview
 * Port of the `Finishpage` function from `Fileproc.c`.
 * This function finalizes the processing for a single scanned page.
 * It triggers data recovery, updates statistics, and checks if the
 * file is complete and ready to be saved.
 */

import { pb_fproc } from './fileState.js';
import { NDATA, NFILE } from '../include/paperbak/constants.js';
import { Message } from '../logging/log.js';
import { recoverData } from './dataRecovery.js';
import { saveRestoredFile } from './fileSaver.js';

/**
 * Finalizes a page scan, attempts data recovery, and checks for file completion.
 * Corresponds to `Finishpage` in `Fileproc.c`.
 *
 * @param {number} slot - The index of the file processor (t_fproc) to update.
 * @param {number} ngood - The number of good blocks found on this page.
 * @param {number} nbad - The number of unreadable blocks on this page.
 * @param {number} nrestored - The total number of bytes restored by ECC on this page.
 * @returns {number} 0 on success, -1 on error.
 */
export function finishPage(slot, ngood, nbad, nrestored) {
    // C: int i,j,r,rmin,rmax,nrec,irec,firstblock,nrempages;
    // C: uchar *pr,*pd;
    // C: t_fproc *pf;

    // C: if (slot<0 || slot>=NFILE)
    // C:   return -1;                         // Invalid index of file descriptor
    if (slot < 0 || slot >= NFILE || !pb_fproc[slot]) {
        return -1;
    }

    // C: pf=pb_fproc+slot;
    const pf = pb_fproc[slot];
    // C: if (pf->busy==0)
    // C:   return -1;                         // Index points to unused descriptor
    if (pf.busy === 0) {
        return -1;
    }

    // C: // Update statistics.
    // C: pf->goodblocks+=ngood;
    pf.goodblocks += ngood;
    // C: pf->badblocks+=nbad;
    pf.badblocks += nbad;
    // C: pf->restoredbytes+=nrestored;
    pf.restoredbytes += nrestored;

    // C: // Restore bad blocks if corresponding recovery blocks are available
    // C: if (pf->ngroup>0) {
    // This entire block of logic is ported to dataRecovery.js
    const recoveredCount = recoverData(pf);
    // C: ... (inside recovery logic) pf->recoveredblocks++; pf->ndata++;
    pf.recoveredblocks += recoveredCount;
    pf.ndata += recoveredCount;
    // C: };

    // C: // Check whether there are still bad blocks on the page.
    // C: firstblock=(pf->page-1)*(pf->pagesize/NDATA);
    // We must use floor for JS, as C's integer division truncates.
    const firstblock = Math.floor((pf.page - 1) * (pf.pagesize / NDATA));
    const pageBlockCount = Math.floor(pf.pagesize / NDATA);
    const endblock = firstblock + pageBlockCount;
    let hasBadBlocks = false;

    // C: for (j=firstblock; j<firstblock+pf->pagesize/NDATA && j<pf->nblock; j++) {
    for (let j = firstblock; j < endblock && j < pf.nblock; j++) {
        // C: if (pf->datavalid[j]!=1) break; };
        if (pf.datavalid[j] !== 1) { // 1 = valid data
            hasBadBlocks = true;
            break;
        }
    }

    // C: if (j<firstblock+pf->pagesize/NDATA && j<pf->nblock)
    if (hasBadBlocks) {
        // C: Message("Unrecoverable errors on page, please scan it again\n",0);
        Message("Unrecoverable errors on page, please scan it again", 0);
    }
    // C: else if (nbad>0)
    else if (nbad > 0) {
        // C: Message("Page processed\n, all bad blocks successfully restored",0);
        Message("Page processed, all bad blocks successfully restored", 0);
    }
    // C: else
    else {
        // C: Message("Page processed\n",0);
        Message("Page processed", 0);
    }

    // C: // Calculate list of (partially) incomplete pages.
    let nrempages = 0;
    // C: if (pf->pagesize>0) {
    if (pf.pagesize > 0) {
        // C: for (i=0; i<pf->npages && nrempages<8; i++) {
        for (let i = 0; i < pf.npages && nrempages < 8; i++) {
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
        if (!pb_autosave) {
            // C: Message("File restored.",0);
            Message("File restored.", 0);
        } else {
            // C: Message("File complete",0);
            Message("File complete. Saving...", 0);
            // C: Saverestoredfile(slot,0);
            saveRestoredFile(slot, false); // false = not forced
        }
    }
    // C: return 0;
    return 0;
    // C: };
}