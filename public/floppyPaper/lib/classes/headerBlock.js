/**
 * @file headerBlock.js
 * @overview
 * This class mirrors the C structure `t_superdata`, which represents the 128-byte
 * physical header block printed on the paper. It contains critical file metadata
 * used for verification, reconstruction, and assembly of the entire backup.
 *
 * C Reference:
 * typedef struct __attribute__ ((packed)) t_superdata
 */
import { ECC_SIZE, FILENAME_SIZE, SUPERBLOCK } from './constants.js';

export class HeaderBlock {
    /**
     * @typedef {object} FileTimePortable
     * @property {number} dwLowDateTime - Low 32-bits of the 64-bit file time.
     * @property {number} dwHighDateTime - High 32-bits of the 64-bit file time.
     */

    /**
     * Creates an instance of HeaderBlock, initializing properties to their C-style defaults.
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
     * Converts a standard JavaScript millisecond timestamp into the Windows FileTimePortable format (100-nanosecond intervals since Jan 1, 1601).
     * @param {number} timestamp - The JavaScript timestamp in milliseconds (e.g., Date.now()).
     * @returns {void}
     */
    setDateTime(timestamp) {
        // Time difference between 1601 and 1970 in 100-nanosecond intervals
        const EPOCH_DIFFERENCE = 11644473600000; // Milliseconds from 1601 to 1970

        // Total 100-nanosecond intervals:
        const fileTime = BigInt(Math.floor(timestamp)) * 10000n + BigInt(EPOCH_DIFFERENCE) * 10000n;

        this.modified = {
            // Splitting 64-bit integer into two 32-bit components
            dwLowDateTime: Number(fileTime & 0xFFFFFFFFn),
            dwHighDateTime: Number(fileTime >> 32n)
        };
    }

    /**
     * Packs the contents of the HeaderBlock instance into a 128-byte contiguous buffer,
     * ready for drawing or CRC/ECC calculation.
     *
     * @returns {Uint8Array} A 128-byte buffer representing the raw, packed t_superdata block.
     * @throws {Error} If the final packed length does not match HeaderBlock.byteLength (128 bytes).
     * @see C_EQUIVALENT: Emulates the memory layout of the C structure __attribute__((packed)) t_superdata.
     */
    pack() {
        const BLOCK_SIZE = HeaderBlock.byteLength; // 128
        const buffer = new ArrayBuffer(BLOCK_SIZE);
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        let offset = 0;

        // 1. Core Metadata (Offset 0 to 20)
        view.setUint32(offset, this.addr, true); offset += 4; // 0
        view.setUint32(offset, this.datasize, true); offset += 4; // 4
        view.setUint32(offset, this.pagesize, true); offset += 4; // 8
        view.setUint32(offset, this.origsize, true); offset += 4; // 12
        view.setUint8(offset, this.mode); offset += 1; // 16
        view.setUint8(offset, this.attributes); offset += 1; // 17
        view.setUint16(offset, this.page, true); offset += 2; // 18

        // 2. Modified Time (FileTimePortable: 8 bytes, Offset 20 to 28)
        view.setUint32(offset, this.modified.dwLowDateTime, true); offset += 4;
        view.setUint32(offset, this.modified.dwHighDateTime, true); offset += 4;

        // 3. File CRC (2 bytes, Offset 28 to 30)
        view.setUint16(offset, this.filecrc, true); offset += 2;

        // 4. File Name + Padding (64 bytes, Offset 30 to 94)
        const nameBytes = new TextEncoder().encode(this.name);

        // Ensure name buffer is 64 bytes wide and zeroed, then set name content.
        const nameBuffer = new Uint8Array(buffer, offset, FILENAME_SIZE);
        nameBuffer.fill(0);
        nameBuffer.set(nameBytes.subarray(0, FILENAME_SIZE));

        offset += FILENAME_SIZE; // 94

        // 5. Cyclic Redundancy CRC (2 bytes, Offset 94 to 96)
        // ACTION: PACK THE INSTANCE'S CRC VALUE. (Was previously set to 0)
        view.setUint16(offset, this.crc, true);
        offset += 2; // 96

        // 6. ECC Field (32 bytes, Offset 96 to 128)
        // ACTION: PACK THE INSTANCE'S ECC BUFFER. (Was previously skipped/left as 0s)
        bytes.set(this.ecc, offset);
        offset += ECC_SIZE; // 128

        // 7. Validation Check
        if (offset !== BLOCK_SIZE) {
            throw new Error(`Packing Error: HeaderBlock size mismatch. Expected ${BLOCK_SIZE} bytes but packed ${offset}.`);
        }

        return bytes;
    }

    /**
     * Retrieves the total fixed size of the HeaderBlock structure in bytes.
     * @returns {number} The size of the block (128 bytes).
     */
    static get byteLength() {
        return 128;
    }
}