/**
 * @fileoverview
 * Port of the `Addblock` function from `Fileproc.c`.
 * This function adds a single decoded data or recovery block to the
 * appropriate file processing slot in the `pb_fproc` state.
 */

import { pb_fproc} from './fileState.js';

import {NDATA, NFILE} from '../include/paperbak/constants.js';

import {min, max} from '../include/paperbak/utils.js';

/**
 * @typedef {import('../include/paperbak/index.js').t_block} t_block
 */

/**
 * Adds a decoded data or recovery block to its file slot.
 * Corresponds to `Addblock` in `Fileproc.c`.
 *
 * @param {t_block} block - The decoded block (from pdata.blocklist).
 * @param {number} slot - The index of the file processor (t_fproc) to add to.
 * @returns {number} 0 on success, -1 on error.
 */
export function addBlock(block, slot) {
    // C: int i,j;
    // C: t_fproc *pf;

    // C: if (slot<0 || slot>=NFILE)
    // C:   return -1;                         // Invalid index of file descriptor
    if (slot < 0 || slot >= NFILE || !pb_fproc[slot]) {
        return -1;
    }

    // C: pf=pb_fproc[slot];
    const pf = pb_fproc[slot];

    // C: if (pf->busy==0)
    // C:   return -1;                         // Index points to unused descriptor
    if (pf.busy === 0) {
        return -1;
    }

    // C: // Add block to descriptor.
    // C: if (block->recsize==0) {
    if (block.recsize === 0) {
        // C: // Ordinary data block.
        // C: i=block->addr/NDATA;
        const i = Math.floor(block.addr / NDATA);

        // C: if ((uint32_t)(i*NDATA)!=block->addr)
        // C:   return -1;                       // Invalid data alignment
        if ((i * NDATA) !== block.addr) {
            return -1;
        }

        // C: if (i>=pf->nblock)
        // C:   return -1;                       // Data outside the data size
        if (i >= pf.nblock) {
            return -1;
        }

        // C: if (pf->datavalid[i]!=1) {
        if (pf.datavalid[i] !== 1) { // 1 = valid data
            // C: memcpy(pf->data+block->addr,block->data,NDATA);
            // Use TypedArray.set() for the JS equivalent of memcpy
            pf.data.set(block.data, block.addr);

            // C: pf->datavalid[i]=1;              // Valid data
            pf.datavalid[i] = 1;
            // C: pf->ndata++; };
            pf.ndata++;
        }

        // C: pf->minpageaddr=min(pf->minpageaddr,block->addr);
        pf.minpageaddr = min(pf.minpageaddr, block.addr);
        // C: pf->maxpageaddr=max(pf->maxpageaddr,block->addr+NDATA); }
        pf.maxpageaddr = max(pf.maxpageaddr, block.addr + NDATA);
    } else {
        // C: // Data recovery block.
        // C: if (block->recsize!=(uint32_t)(pf->ngroup*NDATA))
        // C:   return -1;                       // Invalid recovery scope
        if (block.recsize !== (pf.ngroup * NDATA)) {
            return -1;
        }

        // C: i=block->addr/block->recsize;
        const i_group = Math.floor(block.addr / block.recsize);
        // C: if (i*block->recsize!=block->addr)
        // C:   return -1;                       // Invalid data alignment
        if (i_group * block.recsize !== block.addr) {
            return -1;
        }

        // C: i=block->addr/NDATA;
        const i_block = Math.floor(block.addr / NDATA);
        // C: for (j=i; j<i+pf->ngroup; j++) {
        for (let j = i_block; j < i_block + pf.ngroup; j++) {
            // C: if (j>=pf->nblock)
            // C:   return -1;                     // Data outside the data size
            // Note: The C code's `return -1` here is likely a bug.
            // It should `break` if the group overhangs the end of the file.
            if (j >= pf.nblock) {
                break;
            }

            // C: if (pf->datavalid[j]!=0) continue;
            if (pf.datavalid[j] === 0) { // 0 = empty/invalid
                // C: memcpy(pf->data+j*NDATA,block->data,NDATA);
                pf.data.set(block.data, j * NDATA);
                // C: pf->datavalid[j]=2; };           // Valid recovery data
                pf.datavalid[j] = 2; // 2 = valid recovery data
            }
        }

        // C: pf->minpageaddr=min(pf->minpageaddr,block->addr);
        pf.minpageaddr = min(pf.minpageaddr, block.addr);
        // C: pf->maxpageaddr=max(pf->maxpageaddr,block->addr+block->recsize);
        pf.maxpageaddr = max(pf.maxpageaddr, block.addr + block.recsize);
        // C: };
    }

    // C: // Report success.
    // C: return 0;
    return 0;
    // C: };
}