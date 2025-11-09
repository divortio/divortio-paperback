/**
 * @file dataBlock.js
 * @overview
 * This class mirrors the C structure `t_data`, which represents a single, 128-byte
 * physical data block as it is arranged on the printed page. This is the fundamental
 * unit of data used for storage, containing the payload, an address/identifier, CRC,
 * and Reed-Solomon Error Correction Code (ECC).
 *
 * C Reference:
 * typedef struct __attribute__ ((packed)) t_data
 */
import { NDATA, ECC_SIZE, SUPERBLOCK } from './constants.js';

export class DataBlock {
    /**
     * Creates an instance of DataBlock, initializing properties to their C-style defaults.
     * @param {object} [props={}] - Optional initial property values.
     */
    constructor(props = {}) {
        /**
         * @public
         * @type {number}
         * @description Offset of the block in the overall file data, or the special identifier SUPERBLOCK (0xFFFFFFFF).
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.addr = props.addr !== undefined ? props.addr : 0;

        /**
         * @public
         * @type {Uint8Array}
         * @description The actual useful data payload extracted from the file.
         * @default new Uint8Array(NDATA)
         * @see C_TYPE: uchar[NDATA] (90 bytes)
         */
        this.data = props.data instanceof Uint8Array && props.data.length === NDATA
            ? props.data
            : new Uint8Array(NDATA);

        /**
         * @public
         * @type {number}
         * @description Cyclic redundancy of address and data (CRC-16/CCITT).
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
     * Packs the contents of the DataBlock instance into a new 128-byte contiguous buffer,
     * assuming all properties (addr, data, crc, and ecc) have been finalized
     * and are ready for drawing.
     *
     * @returns {Uint8Array} A 128-byte buffer representing the raw, packed t_data block.
     * @throws {Error} If the final packed length does not match DataBlock.byteLength (128 bytes).
     * @see C_EQUIVALENT: Emulates the memory contiguity of `t_data block` in C memory.
     */
    pack() {
        const BLOCK_SIZE = DataBlock.byteLength;
        const buffer = new ArrayBuffer(BLOCK_SIZE);
        const bytes = new Uint8Array(buffer);
        const view = new DataView(buffer);
        let offset = 0;

        // 1. Pack addr (4 bytes)
        view.setUint32(offset, this.addr, true); offset += 4;

        // 2. Pack data payload (NDATA bytes = 90 bytes)
        bytes.set(this.data, offset);
        offset += NDATA; // 94

        // 3. Pack crc (2 bytes)
        // ACTION: Pack the instance's calculated CRC value.
        view.setUint16(offset, this.crc, true);
        offset += 2; // 96

        // 4. Pack ecc (ECC_SIZE bytes = 32 bytes)
        // ACTION: Pack the instance's calculated ECC buffer.
        bytes.set(this.ecc, offset);
        offset += ECC_SIZE; // 128

        // 5. Validation Check
        if (offset !== BLOCK_SIZE) {
            throw new Error(`Packing Error: DataBlock size mismatch. Expected ${BLOCK_SIZE} bytes but packed ${offset}.`);
        }

        return bytes;
    }

    /**
     * Retrieves the total fixed size of the DataBlock structure in bytes.
     * @returns {number} The size of the block (4 + NDATA + 2 + ECC_SIZE) in bytes.
     * @see C_TYPE: sizeof(t_data)
     */
    static get byteLength() {
        // 4 bytes (addr) + NDATA (90 bytes) + 2 bytes (crc) + ECC_SIZE (32 bytes)
        return 4 + NDATA + 2 + ECC_SIZE;
    }
}