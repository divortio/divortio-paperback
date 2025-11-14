/**
 * @file superData.js
 * @overview
 * This class mirrors the C structure `t_superdata`, which represents the 128-byte
 * physical header block printed on the paper. It contains critical file metadata
 * used for verification, reconstruction, and assembly of the entire backup.
 *
 * It is located in the C source code in `wikinaut/paperback-cli/paperback-cli-429f365367e30df6b66c8eec30029341117e5921/include/paperbak.h`.
 *
 * C Reference:
 * typedef struct __attribute__ ((packed)) t_superdata
 */
import { ECC_SIZE, FILENAME_SIZE, SUPERBLOCK } from './constants.js';

export class DecodedHeaderBlock {
    /**
     * @typedef {object} FileTimePortable
     * @property {number} dwLowDateTime - Low 32-bits of the 64-bit file time.
     * @property {number} dwHighDateTime - High 32-bits of the 64-bit file time.
     */

    /**
     * Creates an instance of SuperData, initializing properties to their C-style defaults.
     * @param {object} [props={}] - Optional initial property values.
     */
    constructor(props = {}) {
        /**
         * @public
         * @type {number}
         * @description The block offset or special code. Expected to be SUPERBLOCK (0xFFFFFFFF).
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.addr = props.addr !== undefined ? props.addr : 0;

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
         * @description Size of compressed data that fits onto a single page.
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
         * @description Special mode bits, a set of PBM_xxx flags (e.g., compressed, encrypted).
         * @default 0
         * @see C_TYPE: uchar (uint8_t - 1 byte)
         */
        this.mode = props.mode !== undefined ? props.mode : 0;

        /**
         * @public
         * @type {number}
         * @description Basic file attributes of the original file.
         * @default 0
         * @see C_TYPE: uchar (uint8_t - 1 byte)
         */
        this.attributes = props.attributes !== undefined ? props.attributes : 0;

        /**
         * @public
         * @type {number}
         * @description Actual page number (1-based).
         * @default 0
         * @see C_TYPE: ushort (uint16_t - 2 bytes)
         */
        this.page = props.page !== undefined ? props.page : 0;

        /**
         * @public
         * @type {FileTimePortable}
         * @description Last modification time of the original file (64-bit value split into two 32-bit parts).
         * @default {dwLowDateTime: 0, dwHighDateTime: 0}
         * @see C_TYPE: FileTimePortable (struct - 8 bytes total)
         */
        this.modified = props.modified !== undefined
            ? { dwLowDateTime: props.modified.dwLowDateTime || 0, dwHighDateTime: props.modified.dwHighDateTime || 0 }
            : { dwLowDateTime: 0, dwHighDateTime: 0 };

        /**
         * @public
         * @type {number}
         * @description 16-bit CRC of the compressed, decrypted file.
         * @default 0
         * @see C_TYPE: ushort (uint16_t - 2 bytes)
         */
        this.filecrc = props.filecrc !== undefined ? props.filecrc : 0;

        /**
         * @public
         * @type {string}
         * @description File name (may use all 64 characters).
         * @default ""
         * @see C_TYPE: char[FILENAME_SIZE] (64 bytes)
         */
        this.name = props.name !== undefined ? props.name : "";

        /**
         * @public
         * @type {number}
         * @description Cyclic redundancy (CRC) of previous fields before ECC.
         * @default 0
         * @see C_TYPE: ushort (uint16_t - 2 bytes)
         */
        this.crc = props.crc !== undefined ? props.crc : 0;

        /**
         * @public
         * @type {Uint8Array}
         * @description Reed-Solomon's error correction code (ECC).
         * @default new Uint8Array(ECC_SIZE)
         * @see C_TYPE: uchar[ECC_SIZE] (32 bytes)
         */
        this.ecc = props.ecc instanceof Uint8Array && props.ecc.length === ECC_SIZE
            ? props.ecc
            : new Uint8Array(ECC_SIZE);
    }

    /**
     * Retrieves the total fixed size of the SuperData structure in bytes.
     * @returns {number} The size of the block (which is 128 bytes, same as t_data).
     */
    static get byteLength() {
        return 128;
    }
}