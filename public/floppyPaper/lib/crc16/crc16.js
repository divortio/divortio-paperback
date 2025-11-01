/**
 * @fileoverview
 * Fast 16-bit CRC (CCITT/XMODEM version) calculation.
 * This is a direct port of Crc16.c from the original paperback-cli.
 * The CRC table has been moved to crcTable.js.
 */

import { crctab } from "./crcTable.js";

/**
 * Calculates a fast 16-bit CRC (CCITT/XMODEM version) on a block of data.
 *
 * Corresponds to the Crc16 function in Crc16.c.
 * This function is called with an ArrayBuffer and a specific length,
 * not a Uint8Array.
 *
 * @param {ArrayBuffer} data - The input data, expected to be an ArrayBuffer.
 * @param {number} length - The number of bytes to process from the start of the buffer.
 * @returns {number} The calculated 16-bit CRC value.
 */
export function crc16(data, length) {
    // Create a Uint8Array view to read bytes from the ArrayBuffer
    const dataView = new Uint8Array(data);

    let crc = 0;
    let dataIndex = 0;

    // Loop for the specified 'length', which may be shorter than the full buffer.
    // This matches the C function's (uchar *data, int length) signature.
    for (; length > 0; length--) {
        // Get the byte from the Uint8Array view
        const byte = dataView[dataIndex++];

        // Calculate CRC using the lookup table
        const tableIndex = ((crc >> 8) ^ byte) & 0xFF;
        crc = ((crc << 8) ^ crctab[tableIndex]) & 0xFFFF;
    }

    // Return the final 16-bit value
    return crc & 0xFFFF;
}