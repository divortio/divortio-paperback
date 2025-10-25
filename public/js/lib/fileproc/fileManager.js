// src/fileproc/fileManager.js

import { Reporterror } from '../paperbak/user-interface.js';
import { NDATA } from '../include/paperbak/index.js';

/**
 * Represents and manages the state of a single file being restored from decoded blocks.
 * This is the equivalent of the t_fproc struct.
 */
export class FileProcessor {
    /**
     * @param {object} superblock - The first superblock found for this file.
     */
    constructor(superblock) {
        this.busy = true;

        // General file data from the superblock
        this.name = superblock.name;
        this.modified = superblock.modified;
        this.attributes = superblock.attributes;
        this.datasize = superblock.datasize;
        this.pagesize = superblock.pagesize;
        this.origsize = superblock.origsize;
        this.mode = superblock.mode;
        this.filecrc = superblock.filecrc;

        // Calculate total number of pages and blocks
        this.npages = this.pagesize > 0 ? Math.ceil(this.datasize / this.pagesize) : 0;
        this.nblock = Math.ceil(this.datasize / NDATA);

        // Properties of the currently processed page
        this.page = superblock.page;
        this.ngroup = superblock.ngroup;
        this.minpageaddr = 0xFFFFFFFF;
        this.maxpageaddr = 0;

        // Assembled data and validation map
        this.ndata = 0; // Number of valid data blocks received so far
        try {
            // 0: invalid, 1: valid data, 2: valid recovery data
            this.datavalid = new Uint8Array(this.nblock).fill(0);
            this.data = new Uint8Array(this.nblock * NDATA);
        } catch (e) {
            Reporterror("Low memory: Cannot allocate buffers for file assembly.");
            throw e;
        }

        // Statistics
        this.goodblocks = 0;
        this.badblocks = 0;
        this.restoredbytes = 0;
        this.recoveredblocks = 0;

        // A list of the first few pages that are still missing data
        this.rempages = [];
        for (let i = 0; i < this.npages && i < 8; i++) {
            this.rempages.push(i + 1);
        }
    }
}