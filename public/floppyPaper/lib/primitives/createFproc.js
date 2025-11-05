import { FILENAME_SIZE, NDATA } from './constants.js';


/**
 * Creates a new, zero-filled t_fproc object (file processor state).
 * C: t_fproc
 */
export function createFproc() {
    return {
        busy: 0,
        name: new Uint8Array(FILENAME_SIZE),
        modified: 0n,
        attributes: 0,
        datasize: 0,
        pagesize: 0,
        origsize: 0,
        mode: 0,
        npages: 0,
        filecrc: 0,
        page: 0,
        ngroup: 0,
        minpageaddr: 0,
        maxpageaddr: 0,
        nblock: 0,
        ndata: 0,
        datavalid: null, // Will be new Uint8Array(nblock)
        data: null,      // Will be new Uint8Array(nblock * NDATA)
        goodblocks: 0,
        badblocks: 0,
        restoredbytes: 0,
        recoveredblocks: 0,
        rempages: new Uint8Array(8), // C: int rempages[8]
    };
}