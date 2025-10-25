// src/fileproc/dataRecovery.js

import { NDATA } from '../include/paperbak/index.js';

/**
 * Attempts to restore missing data blocks using available redundancy blocks.
 * @param {object} pf - The FileProcessor instance for the current file.
 */
export function recoverData(pf) {
    if (!pf.ngroup || pf.ngroup <= 0) {
        return; // No redundancy information available
    }

    // Determine the range of block groups to check based on the data received for this page.
    const groupSizeInBlocks = pf.ngroup;
    const firstGroupIndex = Math.floor(pf.minpageaddr / (NDATA * groupSizeInBlocks));
    const lastGroupIndex = Math.floor(pf.maxpageaddr / (NDATA * groupSizeInBlocks));

    // Iterate through each group of blocks that was touched on the current page.
    for (let g = firstGroupIndex; g <= lastGroupIndex; g++) {
        const firstBlock = g * groupSizeInBlocks;
        if (firstBlock + groupSizeInBlocks > pf.nblock) {
            continue; // This group is incomplete, can't process.
        }

        let missingBlockIndex = -1;
        let missingBlockCount = 0;
        let recoveryBlockFound = false;

        // Analyze the group to find exactly one missing block and one recovery block.
        for (let i = 0; i < groupSizeInBlocks; i++) {
            const blockIndex = firstBlock + i;
            const status = pf.datavalid[blockIndex];

            if (status === 0) { // Data is missing
                missingBlockCount++;
                missingBlockIndex = blockIndex;
            } else if (status === 2) { // This is a recovery block
                recoveryBlockFound = true;
            }
        }

        // If we have exactly one missing block and a recovery block, we can proceed.
        if (missingBlockCount === 1 && recoveryBlockFound) {
            // The recovery block itself is XOR'd with all other valid data blocks in the group.
            // The recovery block is stored where the missing block should be.
            const recoveryData = pf.data.subarray(missingBlockIndex * NDATA, (missingBlockIndex + 1) * NDATA);

            // First, invert the recovery data (it was XOR'd with 0xFF during creation).
            for (let i = 0; i < NDATA; i++) {
                recoveryData[i] ^= 0xFF;
            }

            // XOR with all other valid data blocks in the group.
            for (let i = 0; i < groupSizeInBlocks; i++) {
                const blockIndex = firstBlock + i;
                if (pf.datavalid[blockIndex] === 1) { // It's a valid data block
                    const dataBlock = pf.data.subarray(blockIndex * NDATA, (blockIndex + 1) * NDATA);
                    for (let j = 0; j < NDATA; j++) {
                        recoveryData[j] ^= dataBlock[j];
                    }
                }
            }

            // The `recoveryData` subarray now holds the reconstructed data. Since it's a view
            // into the main `pf.data` buffer, the data is already in the correct place.
            pf.datavalid[missingBlockIndex] = 1; // Mark the block as valid
            pf.recoveredblocks++;
            pf.ndata++;
        }
    }
}