
import { FILENAME_SIZE, NDATA } from './constants.js';

/**
 * Creates a new, zero-filled t_superblock object.
 * C: t_superblock
 * @returns {import('./index.js').t_superblock}
 */
export function createSuperblock() {
    return {
        addr: 0,
        datasize: 0,
        pagesize: 0,
        origsize: 0,
        mode: 0,
        page: 0,
        modified: 0n, // Use BigInt for 64-bit FILETIME
        attributes: 0,
        filecrc: 0,
        name: new Uint8Array(FILENAME_SIZE),
        ngroup: 0,
    };
}