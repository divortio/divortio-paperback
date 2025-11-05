/**
 * @file decodedBlock.js
 * @overview
 * This class mirrors the C structure `t_block`, which represents a logical block of
 * data after it has been decoded from the scanned bitmap, but before it is assembled
 * into the final file. It is a temporary memory structure used primarily during the
 * file processing and assembly phase (managed by `t_fproc`).
 *
 * It is located in the C source code in `wikinaut/paperback-cli/paperback-cli-429f365367e30df6b66c8eec30029341117e5921/include/paperbak.h`.
 *
 * C Reference:
 * typedef struct t_block
 */
import { NDATA } from './constants.js';

export class DecodedBlock {
    /**
     * Creates an instance of DecodedBlock, initializing properties to their C-style defaults.
     * @param {object} [props={}] - Optional initial property values.
     */
    constructor(props = {}) {
        /**
         * @public
         * @type {number}
         * @description Offset of the block in the overall file data. This value is derived from the 'addr' in the physical block.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.addr = props.addr !== undefined ? props.addr : 0;

        /**
         * @public
         * @type {number}
         * @description Indicates the type of block: 0 for a standard data block, or the length of covered data (e.g., 5 * NDATA) for a recovery/checksum block.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.recsize = props.recsize !== undefined ? props.recsize : 0;

        /**
         * @public
         * @type {Uint8Array}
         * @description The useful data (payload) recovered from the block.
         * @default new Uint8Array(NDATA)
         * @see C_TYPE: uchar[NDATA] (90 bytes)
         */
        this.data = props.data instanceof Uint8Array && props.data.length === NDATA
            ? props.data
            : new Uint8Array(NDATA);
    }
}