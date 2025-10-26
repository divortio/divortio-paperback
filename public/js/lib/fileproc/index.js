// public/js/lib/fileproc/index.js

import { pb, NFILE, NDATA, min, max } from '../include/paperbak/index.js';
import { FileProcessor } from './fileManager.js';
import { recoverData } from './dataRecovery.js';
import { saveRestoredFile } from './fileSaver.js';

/**
 * Finds an existing file processing slot or creates a new one for a given superblock.
 * @param {object} superblock - The superblock identifying the file page.
 * @returns {number} The index (slot) of the file processor, or -1 on error.
 */
export function startNextPage(superblock) {
    let freeslot = -1;

    for (let i = 0; i < NFILE; i++) {
        const pf = pb.fproc[i];

        if (!pf || !pf.busy) {
            if (freeslot < 0) freeslot = i;
            continue;
        }

        // Check if the superblock matches an existing file being processed.
        if (pf.name === superblock.name &&
            pf.mode === superblock.mode &&
            pf.modified.dwLowDateTime === superblock.modified.dwLowDateTime &&
            pf.modified.dwHighDateTime === superblock.modified.dwHighDateTime &&
            pf.datasize === superblock.datasize &&
            pf.origsize === superblock.origsize)
        {
            // File found. Update page-specific info.
            pf.page = superblock.page;
            pf.ngroup = superblock.ngroup;
            pf.minpageaddr = 0xFFFFFFFF;
            pf.maxpageaddr = 0;
            return i;
        }
    }

    // No matching file found, create a new one in a free slot.
    if (freeslot < 0) {
        // This should use the reportError function if available, but it's deep in the library
        console.error("Maximal number of processed files exceeded.");
        return -1;
    }

    try {
        pb.fproc[freeslot] = new FileProcessor(superblock);
        return freeslot;
    } catch (e) {
        console.error("Low memory: Cannot create new file processor.", e);
        return -1;
    }
}

/**
 * Adds a decoded data or recovery block to the correct file processor.
 * @param {object} block - The block object from the decoder.
 * @param {number} slot - The index of the file processor.
 */
export function addBlock(block, slot) {
    const pf = pb.fproc[slot];
    if (!pf || !pf.busy) return;

    if (block.recsize === 0) { // Ordinary data block
        const blockIndex = block.addr / NDATA;
        if (blockIndex * NDATA !== block.addr || blockIndex >= pf.nblock) return;

        if (pf.datavalid[blockIndex] !== 1) {
            pf.data.set(block.data, block.addr);
            pf.datavalid[blockIndex] = 1; // Mark as valid data
            pf.ndata++;
        }
    } else { // Data recovery block
        const groupIndex = block.addr / block.recsize;
        if (groupIndex * block.recsize !== block.addr) return;

        const startBlock = block.addr / NDATA;
        for (let j = 0; j < pf.ngroup; j++) {
            const blockIndex = startBlock + j;
            if (blockIndex >= pf.nblock) return;

            if (pf.datavalid[blockIndex] === 0) {
                pf.data.set(block.data, blockIndex * NDATA);
                pf.datavalid[blockIndex] = 2; // Mark as valid recovery data
            }
        }
    }

    pf.minpageaddr = min(pf.minpageaddr, block.addr);
    pf.maxpageaddr = max(pf.maxpageaddr, block.addr + (block.recsize || NDATA));
}

/**
 * Finalizes processing for a page, attempts data recovery, and checks if the file is complete.
 * @param {number} slot - The index of the file processor.
 * @param {number} ngood - Number of good blocks found on the page.
 * @param {number} nbad - Number of bad blocks found on the page.
 * @param {number} nrestored - Number of bytes restored by ECC on the page.
 * @returns {object|null} - Returns a result object if the file is complete, otherwise null.
 */
export function finishPage(slot, ngood, nbad, nrestored) {
    const pf = pb.fproc[slot];
    if (!pf || !pf.busy) return null;

    pf.goodblocks += ngood;
    pf.badblocks += nbad;
    pf.restoredbytes += nrestored;

    recoverData(pf);

    if (pf.ndata === pf.nblock) {
        if (pb.autosave) {
            // In a UI context, we don't save automatically. We return the data.
            // saveRestoredFile(slot, false, { reportError: console.error });
            const blob = new Blob([pf.data.subarray(0, pf.origsize)], { type: 'application/octet-stream' });
            closeFproc(slot);
            return { blob, filename: pf.name };
        }
    }
    return null;
}

/**
 * Clears a file processor slot.
 * @param {number} slot - The index of the slot to clear.
 */
export function closeFproc(slot) {
    if (slot >= 0 && slot < NFILE) {
        pb.fproc[slot] = null;
    }
}