/**
 * @file drawBlock.js
 * @overview
 * Implements the Drawblock service function, which is State 7's core drawing routine.
 * FIX: Ensures safe memory access regardless of whether the block argument is a
 * structured class instance (with a .data property) or a raw Uint8Array buffer.
 *
 * C Reference:
 * - Function: static void Drawblock(...) (in Printer.c)
 */

import { crc16 } from '../crc16/crc16.js';
import { encode8 } from '../ecc/encode8.js';
import { NDATA, ECC_SIZE, NDOT } from '../classes/constants.js';

// Constants for buffer offsets and lengths
const CRC_INPUT_LENGTH = 4 + NDATA;       // 94 bytes (Addr + Data)
const ECC_INPUT_LENGTH = 4 + NDATA + 2;   // 96 bytes (Addr + Data + CRC)
const BLOCK_SIZE = 128;                   // 96 + 32 (ECC_SIZE)

/**
 * Puts a block of data onto the bitmap as a 32x32 grid of dots.
 *
 * @param {number} index - The linear index of the block on the page.
 * @param {any} block - The data structure (must expose the raw 128-byte memory block).
 * @param {Uint8Array} bits - The pixel buffer of the bitmap to draw on.
 * @param {number} width - The total width of the bitmap in pixels.
 * @param {number} height - The total height of the bitmap in pixels.
 * @param {number} border - The border size around the grid in pixels.
 * @param {number} nx - The number of blocks horizontally on the page.
 * @param {number} ny - The number of blocks vertically on the page.
 * @param {number} dx - The horizontal distance between dots (dot pitch).
 * @param {number} dy - The vertical distance between dots (dot pitch).
 * @param {number} px - The width of a single dot in pixels.
 * @param {number} py - The height of a single dot in pixels.
 * @param {number} black - The grayscale value for a black dot (0-255).
 */
export function drawBlock(index, block, bits, width, height, border, nx, ny, dx, dy, px, py, black) {

    // --- FIX: Safely determine the raw buffer source ---
    // This logic handles two cases:
    // 1. Block is already a Uint8Array (pre-packed HeaderBlock).
    // 2. Block is a DataBlock/ChecksumBlock class instance (data is in .data property).
    const rawBufferSource = (block instanceof Uint8Array) ? block : block.data;

    if (!rawBufferSource || !rawBufferSource.buffer) {
        throw new Error("drawBlock ERROR: Input block is missing required internal buffer (.data or is not a Uint8Array).");
    }

    // Create memory views for high-speed access
    const blockBytes = new Uint8Array(rawBufferSource.buffer, rawBufferSource.byteOffset, BLOCK_SIZE);
    const blockView = new DataView(blockBytes.buffer, blockBytes.byteOffset);

    let t; // 32-bit row value

    // 1. Calculate CRC (C: block->crc = Crc16(...) ^ 0x55AA;)
    const calculated_crc = crc16(blockBytes.buffer, CRC_INPUT_LENGTH) ^ 0x55AA;
    blockView.setUint16(CRC_INPUT_LENGTH, calculated_crc, true);

    // 2. Generate ECC (C: Encode8((uchar *)block, block->ecc, 127);)
    const ecc_input_data = blockBytes.subarray(0, ECC_INPUT_LENGTH);
    const ecc_output_parity = blockBytes.subarray(ECC_INPUT_LENGTH, BLOCK_SIZE);

    encode8(ecc_input_data, ecc_output_parity, 127);

    // 3. Calculate top-left pixel coordinate for the block drawing area.
    const block_width_px = (NDOT + 3) * dx;
    const x_start = (index % nx) * block_width_px + 2 * dx + border;
    let y_base = height - 1 - ((Math.floor(index / nx)) * block_width_px + 2 * dy + border);

    // 4. Draw the 32x32 grid, row by row.
    for (let j = 0; j < 32; j++) {
        t = blockView.getUint32(j * 4, true);

        // Apply XOR checkerboard pattern
        t ^= (j & 1) ? 0xAAAAAAAA : 0x55555555;

        for (let i = 0; i < 32; i++) {
            if (t & 1) {

                const dot_start_x = x_start + i * dx;
                const dot_start_y = y_base - j * dy;

                for (let m = 0; m < py; m++) { // Vertical dot thickness (py)
                    for (let n = 0; n < px; n++) { // Horizontal dot thickness (px)
                        const x = dot_start_x + n;
                        const y = dot_start_y - m;

                        if (x >= 0 && x < width && y >= 0 && y < height) {
                            bits[y * width + x] = black;
                        }
                    }
                }
            }
            t >>>= 1;
        }
    }
}