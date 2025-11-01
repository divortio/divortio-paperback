/**
 * @fileoverview
 * Port of the `Startnextpage` function from `Fileproc.c`.
 * This function finds or creates a file processing slot (t_fproc)
 * for a newly scanned page (superblock).
 */

import { pb_fproc } from './fileState.js';
import { NDATA, NFILE } from '../include/paperbak/constants.js';
import { createFproc } from '../include/paperbak/createFproc.js';
import { Reporterror } from '../logging/log.js';

/**
 * @typedef {import('../include/paperbak/createSuperBlock.js').t_superblock} t_superblock
 * @typedef {import('../include/paperbak/createFproc.js').t_fproc} t_fproc
 */

/**
 * Helper to compare two 64-byte name arrays (Uint8Array).
 * Replaces C's strnicmp(name1, name2, 64).
 * @param {Uint8Array} name1
 * @param {Uint8Array} name2
 * @returns {boolean} True if names are identical.
 */
function compareNames(name1, name2) {
    if (!name1 || !name2) return false;
    // C's strnicmp is case-insensitive, but file names are case-sensitive
    // and the original C code seems to assume this.
    // A direct byte-for-byte comparison is the correct port.
    for (let i = 0; i < 64; i++) {
        if (name1[i] !== name2[i]) return false;
    }
    return true;
}

/**
 * Finds or creates a file processing slot for a given superblock.
 * Corresponds to `Startnextpage` in `Fileproc.c`.
 *
 * @param {t_superblock} superblock - The superblock data from the scanned page.
 * @returns {number} The slot index (0 to NFILE-1) or -1 on error.
 */
export function startNextPage(superblock) {
    // C: int i,slot,freeslot;
    // C: t_fproc *pf;
    let freeslot = -1;
    let slot = -1;

    // C: // Check whether file is already in the list of processed files.
    // C: for (slot=0,pf=pb_fproc; slot<NFILE; slot++,pf++) {
    for (let i = 0; i < NFILE; i++) {
        const pf = pb_fproc[i];

        // C: if (pf->busy==0) {
        if (!pf || pf.busy === 0) { // Empty descriptor
            // C: if (freeslot<0) freeslot=slot;
            if (freeslot < 0) freeslot = i;
            // C: continue; };
            continue;
        }

        // C: if (strnicmp(pf->name,superblock->name,64)!=0)
        if (!compareNames(pf.name, superblock.name)) continue;
        // C: if (pf->mode!=superblock->mode)
        if (pf.mode !== superblock.mode) continue;
        // C: if (pf->modified.dwLowDateTime!=superblock->modified.dwLowDateTime ||
        // C:   pf->modified.dwHighDateTime!=superblock->modified.dwHighDateTime)
        // JS BigInt comparison handles the 64-bit FILETIME at once.
        if (pf.modified !== superblock.modified) continue;
        // C: if (pf->datasize!=superblock->datasize)
        if (pf.datasize !== superblock.datasize) continue;
        // C: if (pf->origsize!=superblock->origsize)
        if (pf.origsize !== superblock.origsize) continue;

        // C: // File found.
        slot = i;
        // C: break; };
        break;
    }

    // C: if (slot>=NFILE) {
    if (slot === -1) { // File not found, create new one
        // C: // No matching descriptor, create new one.
        // C: if (freeslot<0) {
        if (freeslot < 0) {
            // C: Reporterror("Maximal number of processed files exceeded");
            Reporterror("Maximal number of processed files exceeded");
            // C: return -1; };
            return -1;
        }

        // C: slot=freeslot;
        slot = freeslot;
        // C: pf=pb_fproc+slot;
        // C: memset(pf,0,sizeof(t_fproc));
        // Assumes createFproc() returns a new, zeroed t_fproc object
        const pf = createFproc();

        // C: // Allocate block and recovery tables.
        // C: pf->nblock=(superblock->datasize+NDATA-1)/NDATA;
        // This is a C-ism for integer ceiling division
        pf.nblock = Math.ceil(superblock.datasize / NDATA);

        try {
            // C: pf->datavalid=(uchar *)calloc(pf->nblock, sizeof(uchar));
            pf.datavalid = new Uint8Array(pf.nblock); // JS TypedArrays are 0-filled
            // C: pf->data=(uchar *)calloc(pf->nblock*NDATA, sizeof(uchar));
            pf.data = new Uint8Array(pf.nblock * NDATA);
        } catch (e) {
            // C: if (pf->datavalid==NULL || pf->data==NULL) {
            // C:   Reporterror("Low memory");
            Reporterror("Low memory");
            // C:   return -1;
            return -1;
            // C: };
        }

        // C: // Initialize remaining fields.
        // C: memcpy(pf->name,superblock->name,64);
        pf.name.set(superblock.name);
        // C: pf->modified=superblock->modified;
        pf.modified = superblock.modified;
        // C: pf->attributes=superblock->attributes;
        pf.attributes = superblock.attributes;
        // C: pf->filecrc=superblock->filecrc;
        pf.filecrc = superblock.filecrc;
        // C: pf->datasize=superblock->datasize;
        pf.datasize = superblock.datasize;
        // C: pf->pagesize=superblock->pagesize;
        pf.pagesize = superblock.pagesize;
        // C: pf->origsize=superblock->origsize;
        pf.origsize = superblock.origsize;
        // C: pf->mode=superblock->mode;
        pf.mode = superblock.mode;

        // C: if (pf->pagesize>0)
        if (pf.pagesize > 0) {
            // C: pf->npages=(pf->datasize+pf->pagesize-1)/pf->pagesize;
            pf.npages = Math.ceil(pf.datasize / pf.pagesize);
        } else {
            // C: pf->npages=0;
            pf.npages = 0;
        }

        // C: pf->ndata=0;
        pf.ndata = 0;

        // C: for (i=0; i<pf->npages && i<8; i++)
        // C:   pf->rempages[i]=i+1;
        for (let i = 0; i < pf.npages && i < 8; i++) {
            pf.rempages[i] = i + 1;
        }
        // (The rest of rempages are already 0 from createFproc)

        // C: // Initialize statistics and declare descriptor as busy.
        // C: pf->goodblocks=0;
        pf.goodblocks = 0;
        // C: pf->badblocks=0;
        pf.badblocks = 0;
        // C: pf->restoredbytes=0;
        pf.restoredbytes = 0;
        // C: pf->recoveredblocks=0;
        pf.recoveredblocks = 0;
        // C: pf->busy=1; };
        pf.busy = 1;

        // Save the new pf object to the global state array
        pb_fproc[slot] = pf;
    }

    // C: // Invalidate page limits and report success.
    // C: pf=pb_fproc+slot;
    const pf = pb_fproc[slot];
    // C: pf->page=superblock->page;
    pf.page = superblock.page;
    // C: pf->ngroup=superblock->ngroup;
    pf.ngroup = superblock.ngroup;
    // C: pf->minpageaddr=0xFFFFFFFF;
    pf.minpageaddr = 0xFFFFFFFF;
    // C: pf->maxpageaddr=0;
    pf.maxpageaddr = 0;

    // C: //Updatefileinfo(slot,pf);
    // C: return slot;
    return slot;
    // C: };
}