/**
 * @file restoredFileState.js
 * @overview
 * This class mirrors the C structure `t_fproc`, which is the File Processor Descriptor.
 * It manages the state of a partially or fully reconstructed file, collecting decoded
 * blocks from all scanned pages into a single logical file structure, tracking missing
 * blocks, and handling the final decryption/decompression process.
 *
 * It is located in the C source code in `wikinaut/paperback-cli/paperbak.h`.
 *
 * C Reference:
 * typedef struct t_fproc
 */
class RestoredFileState {
    /**
     * @typedef {object} FileTimePortable
     * @property {number} dwLowDateTime - Low 32-bits of the 64-bit file time.
     * @property {number} dwHighDateTime - High 32-bits of the 64-bit file time.
     */

    /**
     * Creates an instance of RestoredFileState, initializing properties to their C-style defaults (zeroed memory).
     * @param {object} [props={}] - Optional initial property values.
     */
    constructor(props = {}) {
        /**
         * @public
         * @type {number}
         * @description Flag indicating if this descriptor slot is currently in use (1: in work, 0: free).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.busy = props.busy !== undefined ? props.busy : 0;

        // --- General file data ---

        /**
         * @public
         * @type {string}
         * @description The final reconstructed file name (may use all 64 characters).
         * @default ""
         * @see C_TYPE: char[64]
         */
        this.name = props.name !== undefined ? props.name : "";

        /**
         * @public
         * @type {FileTimePortable}
         * @description Last modification time of the original file.
         * @default {dwLowDateTime: 0, dwHighDateTime: 0}
         * @see C_TYPE: FileTimePortable
         */
        this.modified = props.modified !== undefined
            ? { dwLowDateTime: props.modified.dwLowDateTime || 0, dwHighDateTime: props.modified.dwHighDateTime || 0 }
            : { dwLowDateTime: 0, dwHighDateTime: 0 };

        /**
         * @public
         * @type {number}
         * @description Basic file attributes of the original file.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.attributes = props.attributes !== undefined ? props.attributes : 0;

        /**
         * @public
         * @type {number}
         * @description Size of the compressed data.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.datasize = props.datasize !== undefined ? props.datasize : 0;

        /**
         * @public
         * @type {number}
         * @description Size of compressed data that fits onto one page, based on printing settings.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.pagesize = props.pagesize !== undefined ? props.pagesize : 0;

        /**
         * @public
         * @type {number}
         * @description Size of the original (uncompressed) data.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.origsize = props.origsize !== undefined ? props.origsize : 0;

        /**
         * @public
         * @type {number}
         * @description Special mode bits, set of PBM_xxx flags (e.g., compressed, encrypted).
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.mode = props.mode !== undefined ? props.mode : 0;

        /**
         * @public
         * @type {number}
         * @description Total number of pages for the file.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.npages = props.npages !== undefined ? props.npages : 0;

        /**
         * @public
         * @type {number}
         * @description 16-bit CRC of the compressed, decrypted file.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.filecrc = props.filecrc !== undefined ? props.filecrc : 0;

        // --- Properties of currently processed page ---

        /**
         * @public
         * @type {number}
         * @description The currently processed page number (1-based).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.page = props.page !== undefined ? props.page : 0;

        /**
         * @public
         * @type {number}
         * @description Actual redundancy group size (NGROUP) for the current page.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.ngroup = props.ngroup !== undefined ? props.ngroup : 0;

        /**
         * @public
         * @type {number}
         * @description Minimal address (offset) of a block recognized on the current page. Initialized to 0xFFFFFFFF.
         * @default 0xFFFFFFFF
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.minpageaddr = props.minpageaddr !== undefined ? props.minpageaddr : 0xFFFFFFFF;

        /**
         * @public
         * @type {number}
         * @description Maximal address (offset) of a block recognized on the current page.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.maxpageaddr = props.maxpageaddr !== undefined ? props.maxpageaddr : 0;

        // --- Gathered data ---

        /**
         * @public
         * @type {number}
         * @description Total number of data blocks required for the file (calculated as datasize/NDATA).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.nblock = props.nblock !== undefined ? props.nblock : 0;

        /**
         * @public
         * @type {number}
         * @description Number of data blocks successfully decoded/recovered so far.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.ndata = props.ndata !== undefined ? props.ndata : 0;

        /**
         * @public
         * @type {null | Uint8Array}
         * @description Array indicating the validity status for each block (0: invalid, 1: valid data, 2: valid recovery data).
         * @default null
         * @see C_TYPE: uchar *
         */
        this.datavalid = props.datavalid !== undefined ? props.datavalid : null;

        /**
         * @public
         * @type {null | Uint8Array}
         * @description The main buffer holding the assembled raw file data.
         * @default null
         * @see C_TYPE: uchar *
         */
        this.data = props.data !== undefined ? props.data : null;

        // --- Statistics ---

        /**
         * @public
         * @type {number}
         * @description Total cumulative number of good blocks read across all scans.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.goodblocks = props.goodblocks !== undefined ? props.goodblocks : 0;

        /**
         * @public
         * @type {number}
         * @description Total cumulative number of unreadable blocks (before recovery) across all scans.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.badblocks = props.badblocks !== undefined ? props.badblocks : 0;

        /**
         * @public
         * @type {number}
         * @description Total cumulative number of bytes restored by ECC (Reed-Solomon) across all scans.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.restoredbytes = props.restoredbytes !== undefined ? props.restoredbytes : 0;

        /**
         * @public
         * @type {number}
         * @description Total cumulative number of whole blocks recovered using the checksum/redundancy block method.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.recoveredblocks = props.recoveredblocks !== undefined ? props.recoveredblocks : 0;

        /**
         * @public
         * @type {Array<number>}
         * @description A 1-based list of the first 8 remaining incomplete pages that should be scanned next.
         * @default [0, 0, 0, 0, 0, 0, 0, 0]
         * @see C_TYPE: int[8]
         */
        this.rempages = props.rempages !== undefined
            ? (Array.isArray(props.rempages) ? props.rempages : new Array(8).fill(0))
            : new Array(8).fill(0);
    }
}