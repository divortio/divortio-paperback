/**
 * @file packDataBlock.js
 * @overview
 * Utility function to manually convert the structured DataBlock or Checksum Block
 * instance into a contiguous, raw 128-byte binary buffer.
 * * This step is essential because low-level drawing primitives like drawBlock
 * and ECC functions (crc16, encode8) rely on the data being laid out exactly
 * as a C `t_data` struct in memory.
 * * C Reference:
 * This emulates the memory contiguity of `t_data block` in C memory.
 */
import { NDATA } from '../classes/constants.js';

/**
 * Packs the contents of a DataBlock instance into a new 128-byte contiguous buffer.
 * The CRC and ECC fields are left zeroed, as they are calculated later by drawBlock.
 *
 * @param {DataBlock} dataBlock - The structured DataBlock or Checksum Block instance.
 * @returns {Uint8Array} A 128-byte buffer representing the raw, packed t_data block.
 */
export function packDataBlock(dataBlock) {
    const BLOCK_SIZE = 128;
    const buffer = new ArrayBuffer(BLOCK_SIZE);
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    // 1. Pack addr (4 bytes)
    // Corresponds to bytes 0-3 of t_data.
    view.setUint32(0, dataBlock.addr, true);

    // 2. Pack data payload (NDATA bytes)
    // Corresponds to bytes 4-93 of t_data.
    // dataBlock.data is a Uint8Array of size NDATA (90).
    bytes.set(dataBlock.data, 4);

    // Bytes 94-127 (CRC and ECC) are initialized to 0, which is correct,
    // as drawBlock overwrites them instantly with calculated values.

    return bytes;
}