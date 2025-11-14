/**
 * @file superData.js
 * @overview
 * This class mirrors the C structure `t_superdata`, which represents the 128-byte
 * physical header block printed on the paper. It contains critical file metadata
 * used for verification, reconstruction, and assembly of the entire backup.
 *
 * C Reference:
 * typedef struct __attribute__ ((packed)) t_superdata
 */
import { ECC_SIZE, FILENAME_SIZE, SUPERBLOCK } from '../constants.js';
// Import the external class
import { FileTimePortable } from './fileTimePortable.js';


/**
 * @public
 * @type {number}
 * @description Bit flag (0x01) indicating the file data is compressed. Used in the 'mode' bitmask.
 * @see C_VAR: PBM_COMPRESSED (0x01)
 */
export const PBM_COMPRESSED = 0x01;

/**
 * @public
 * @type {number}
 * @description Bit flag (0x02) indicating the file data is encrypted. Used in the 'mode' bitmask.
 * @see C_VAR: PBM_ENCRYPTED (0x02)
 */
export const PBM_ENCRYPTED = 0x02;

/**
 *
 * @param path {string}
 * @returns {{full: string}}
 */
function fnsplit(path) {
    const parts = path.split(/[/\\]/);
    const fullFileName = parts.pop() || 'backup';
    return { full: fullFileName };
}

export class SuperData {
    // REMOVED REDUNDANT JSDOC type definition for FileTimePortable

    /**
     * Creates an instance of SuperData, initializing properties to their C-style defaults.
     * @param pageNum {number}
     * @param origSize {number} - Size of the original (uncompressed) data.
     * @param dataSize {number} -  Size of the compressed data.
     * @param pageSize {number} - Size of compressed data that fits onto a single page.
     * @param fileCrc {number}
     * @param modified {FileTimePortable}
     * @param fileName {string}
     * @param compression {boolean|number}
     * @param encryption {boolean}
     */
    constructor(pageNum,
                origSize,
                dataSize,
                pageSize,
                fileCrc,
                modified,
                fileName,
                compression=9,
                encryption=false
    ) {
        /**
         * @public
         * @type {number}
         * @description The block offset or special code. Expected to be SUPERBLOCK (0xFFFFFFFF).
         * @default  0xFFFFFFFF
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.addr =  0xFFFFFFFF;

        /**
         * @public
         * @type {number}
         * @description Size of the original (uncompressed) data.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.origsize = origSize !== undefined ? origSize : 0;

        /**
         * @public
         * @type {number}
         * @description Size of the compressed data.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.datasize = dataSize !== undefined ? dataSize : 0;

        /**
         * @public
         * @type {number}
         * @description Size of compressed data that fits onto a single page.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.pagesize = pageSize !== undefined ? pageSize : 0;

        /**
         * @public
         * @type {number}
         * @description Special mode bits, a set of PBM_xxx flags (e.g., compressed, encrypted).
         * @default 0
         * @see C_TYPE: uchar (uint8_t - 1 byte)
         */

        this.mode = 0;
        if (compression) {
            this.mode |= 0x01;
        }
        if (encryption) {
            this.mode |= 0x02;
        }

        /**
         * @public
         * @type {number}
         * @description Basic file attributes of the original file.
         * @default 0
         * @see C_TYPE: uchar (uint8_t - 1 byte)
         */
        this.attributes = 0x00000080;

        /**
         * @public
         * @type {number}
         * @description Actual page number (1-based).
         * @default 0
         * @see C_TYPE: ushort (uint16_t - 2 bytes)
         */
        this.page = pageNum !== undefined ? pageNum : 0;

        /**
         * @public
         * @type {FileTimePortable}
         * @description Last modification time of the original file (64-bit value split into two 32-bit parts).
         * @default new FileTimePortable(0, 0)
         * @see C_TYPE: FileTimePortable (struct - 8 bytes total)
         */
        // Use FileTimePortable class instance for initialization
        this.modified = modified instanceof FileTimePortable ? modified : new FileTimePortable(modified?.dwLowDateTime || 0, modified?.dwHighDateTime || 0);

        /**
         * @public
         * @type {number}
         * @description 16-bit CRC of the compressed, decrypted file.
         * @default 0
         * @see C_TYPE: ushort (uint16_t - 2 bytes)
         */
        this.filecrc = fileCrc !== undefined ? fileCrc : 0;

        /**
         * @public
         * @type {string}
         * @description File name (may use all 64 characters).
         * @default ""
         * @see C_TYPE: char[FILENAME_SIZE] (64 bytes)
         */
        this.name = fileName !== undefined ? fnsplit(fileName).full.substring(0,64 ): "";

        /**
         * @public
         * @type {number}
         * @description Cyclic redundancy (CRC) of previous fields before ECC.
         * @default 0
         * @see C_TYPE: ushort (uint16_t - 2 bytes)
         */
        this.crc =  0;

        /**
         * @public
         * @type {Uint8Array}
         * @description Reed-Solomon's error correction code (ECC).
         * @default new Uint8Array(ECC_SIZE)
         * @see C_TYPE: uchar[ECC_SIZE] (32 bytes)
         */
        this.ecc = new Uint8Array(ECC_SIZE);
    }

    // REMOVED: setDateTime is now handled by the FileTimePortable class itself

    /**
     * Packs the contents of the SuperData instance into a 128-byte contiguous buffer,
     * ready for drawing or CRC/ECC calculation.
     *
     * @returns {Uint8Array} A 128-byte buffer representing the raw, packed t_superdata block.
     * @throws {Error} If the final packed length does not match SuperData.byteLength (128 bytes).
     * @see C_EQUIVALENT: Emulates the memory layout of the C structure __attribute__((packed)) t_superdata.
     */
    pack() {
        const BLOCK_SIZE = SuperData.byteLength; // 128
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
        // Accessing properties of the FileTimePortable instance
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
        view.setUint16(offset, this.crc, true);
        offset += 2; // 96

        // 6. ECC Field (32 bytes, Offset 96 to 128)
        bytes.set(this.ecc, offset);
        offset += ECC_SIZE; // 128

        // 7. Validation Check
        if (offset !== BLOCK_SIZE) {
            throw new Error(`Packing Error: HeaderBlock size mismatch. Expected ${BLOCK_SIZE} bytes but packed ${offset}.`);
        }
        return bytes;
    }

    /**
     * Retrieves the total fixed size of the SuperData structure in bytes.
     * @returns {number} The size of the block (128 bytes).
     */
    static get byteLength() {
        return 128;
    }
}