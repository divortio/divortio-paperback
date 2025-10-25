// src/fileproc/index.js

import { Reporterror, Message } from '../paperbak/user-interface.js';
import { pb, NFILE, NDATA, min } from '../include/paperbak/index.js';
import { FileProcessor } from './fileManager.js';
import { recoverData } from './dataRecovery.js';
import { saveRestoredFile } from './fileSaver.js';

// This array holds the active file processing instances, equivalent to pb_fproc.
const fileSlots = new Array(NFILE).fill(null);

/**
 * Finds an existing file processing slot or creates a new one for a given superblock.
 * @param {object} superblock - The superblock identifying the file page.
 * @returns {number} The index (slot) of the file processor, or -1 on error.
 */
export function startNextPage(superblock) {
    let freeslot = -1;

    for (let i = 0; i < NFILE; i++) {
        const pf = fileSlots[i];

        if (!pf || !pf.busy) {
            if (freeslot < 0) freeslot = i;
            continue;
        }

        // Check if the superblock matches an existing file being processed.
        if (pf.name === superblock.name &&
            pf.mode === superblock.mode &&
            pf.modified === superblock.modified &&
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
        Reporterror("Maximal number of processed files exceeded.");
        return -1;
    }

    try {
        fileSlots[freeslot] = new FileProcessor(superblock);
        return freeslot;
    } catch (e) {
        return -1; // Error during initialization (e.g., low memory)
    }
}

/**
 * Adds a decoded data or recovery block to the correct file processor.
 * @param {object} block - The block object from the decoder.
 * @param {number} slot - The index of the file processor.
 */
export function addBlock(block, slot) {
    const pf = fileSlots[slot];
    if (!pf || !pf.busy) return;

    if (block.recsize === 0) { // Ordinary data block
        const blockIndex = block.addr / NDATA;
        if (blockIndex * NDATA !== block.addr || blockIndex >= pf.nblock) return; // Invalid alignment or out of bounds

        if (pf.datavalid[blockIndex] !== 1) {
            pf.data.set(block.data, block.addr);
            pf.datavalid[blockIndex] = 1; // Mark as valid data
            pf.ndata++;
        }
    } else { // Data recovery block
        const groupIndex = block.addr / block.recsize;
        if (groupIndex * block.recsize !== block.addr) return; // Invalid alignment

        const startBlock = block.addr / NDATA;
        for (let j = 0; j < pf.ngroup; j++) {
            const blockIndex = startBlock + j;
            if (blockIndex >= pf.nblock) return; // Out of bounds

            // Only fill if the slot is currently empty
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
 */
export function finishPage(slot, ngood, nbad, nrestored) {
    const pf = fileSlots[slot];
    if (!pf || !pf.busy) return;

    // Update statistics
    pf.goodblocks += ngood;
    pf.badblocks += nbad;
    pf.restoredbytes += nrestored;

    // Attempt to recover missing data using the redundancy blocks
    recoverData(pf);

    // Check if the file is now complete
    if (pf.ndata === pf.nblock) {
        Message("File restoration complete.", 100);
        if (pb.autosave) {
            saveRestoredFile(slot);
        }
        // In a real UI, you would enable a "Save" button here.
    } else {
        const missing = pf.nblock - pf.ndata;
        Message(`Page processed. ${missing} data blocks still missing.`, 99);
    }
}

/**
 * Clears a file processor slot.
 * @param {number} slot - The index of the slot to clear.
 */
export function closeFproc(slot) {
    if (slot >= 0 && slot < NFILE) {
        fileSlots[slot] = null;
    }
}