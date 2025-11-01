// src/printer/drawBlock.js

import { crc16 } from '../crc16/crc16.js';
import { encode8 } from '../ecc/encode8.js';
import { NDATA, NDOT } from '../include/paperbak/constants.js';

/**
 * Puts a block of data onto the bitmap as a 32x32 grid of dots.
 * @param {number} index - The linear index of the block on the page.
 * @param {ArrayBuffer} blockBuffer - A 128-byte ArrayBuffer for the t_data structure.
 * @param {Uint8Array} bits - The pixel buffer of the bitmap to draw on.
 * @param {number} width - The total width of the bitmap in pixels.
 * @param {number} height - The total height of the bitmap in pixels.
 * @param {number} border - The border size around the grid in pixels.
 * @param {number} nx - The number of blocks horizontally on the page.
 * @param {number} dx - The horizontal distance between dots (dot pitch).
 * @param {number} dy - The vertical distance between dots (dot pitch).
 * @param {number} px - The width of a single dot in pixels.
 * @param {number} py - The height of a single dot in pixels.
 * @param {number} black - The grayscale value for a black dot (0-255).
 */
export function drawBlock(index, blockBuffer, bits, width, height, border, nx, dx, dy, px, py, black) {
    const blockView = new DataView(blockBuffer);
    const blockBytes = new Uint8Array(blockBuffer);

    // 1. Calculate CRC and add it to the block.
    // The CRC is calculated over the first 94 bytes (address + data).
    const crc = crc16(blockBytes.subarray(0, NDATA + 4)) ^ 0x55AA;
    blockView.setUint16(NDATA + 4, crc, true); // true for little-endian

    // 2. Add Reed-Solomon error correction code.
    const ecc = new Uint8Array(32);
    encode8(blockBytes, ecc, 127); // pad is 127 for the full block
    blockBytes.set(ecc, NDATA + 6);

    // 3. Calculate the top-left pixel coordinate of the block.
    let x_start = (index % nx) * (NDOT + 3) * dx + 2 * dx + border;
    let y_start = Math.floor(index / nx) * (NDOT + 3) * dy + 2 * dy + border;
    let baseOffset = (height - y_start - 1) * width + x_start;

    // 4. Draw the 32x32 grid, row by row.
    for (let j = 0; j < 32; j++) {
        let t = blockView.getUint32(j * 4, true); // Read a 32-bit row

        // XOR with a pattern to balance black/white distribution.
        t ^= (j & 1) ? 0xAAAAAAAA : 0x55555555;

        let x_offset = 0;
        for (let i = 0; i < 32; i++) {
            if (t & 1) { // If the LSB is 1, draw a dot.
                // Draw a px-by-py rectangle for the dot.
                for (let m = 0; m < py; m++) {
                    for (let n = 0; n < px; n++) {
                        const pixelIndex = baseOffset + (x_offset + n) - (m * width);
                        if(pixelIndex >= 0 && pixelIndex < bits.length) {
                            bits[pixelIndex] = black;
                        }
                    }
                }
            }
            t >>>= 1; // Unsigned right shift to process the next bit.
            x_offset += dx;
        }
        baseOffset -= dy * width; // Move up to the next row in the bitmap.
    }
}