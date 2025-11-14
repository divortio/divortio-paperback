import { DataBlock } from '../classes/blocks/dataBlock.js';
import { SuperData } from '../classes/blocks/superData.js';
import { NDOT, NDATA } from '../classes/constants.js';
import { crc16 } from '../crc16/crc16.js';
import { encode8 } from '../ecc/encode8.js';

/**
 * Service function, puts a block of data onto the raw pixel buffer (drawbits)
 * as a grid of 32x32 dots in the specified position.
 * @param {Uint8Array} bits - The raw pixel buffer (drawbits) to modify.
 * @param {number} index - The linear index of the block on the page.
 * @param {DataBlock | SuperData} block - The data structure to be calculated, packed, and drawn.
 * @param {number} width - The final image width/stride (finalImageWidth).
 * @param {number} height - The final image height (finalImageHeight).
 * @param {number} border - The pixel width of the grid border (gridBorderPixels).
 * @param {number} dx - The horizontal distance between dots (dotCellSizeX).
 * @param {number} dy - The vertical distance between dots (dotCellSizeY).
 * @param {number} px - The width of a single dot mark (dotMarkSizeX).
 * @param {number} py - The height of a single dot mark (dotMarkSizeY).
 * @param {number} nx - The number of blocks that fit horizontally (blocksX).
 * @param {number} blackValue - The pixel intensity value for a "black" dot (e.g., 64).
 * @returns {Uint8Array} The raw pixel buffer (bits) after drawing.
 * @see C_EQUIVALENT: Drawblock(int index, t_data *block, ...) in Printer.c
 */
export function drawBlock(
    bits,
    index,
    block,
    width,
    height,
    border,
    dx,
    dy,
    px,
    py,
    nx,
    blackValue=64
) {
    // Local variables
    let i, j, x, y, m, n;
    let t;

    // Lengths for CRC and ECC calculation
    const CRC_LENGTH = 4 + NDATA; // 94 bytes (addr + data)
    const ECC_SOURCE_LENGTH = 4 + NDATA + 2; // 96 bytes (addr + data + crc)

    // --- 1. Calculate CRC and Update Block Property ---

    // Pack #1: Get the full block buffer.
    const initialBlockBuffer = block.pack();

    // block->crc=(ushort)(Crc16((uchar *)block,NDATA+sizeof(uint32_t))^0x55AA);
    block.crc = (crc16(initialBlockBuffer.buffer, CRC_LENGTH) ^ 0x55AA);

    // --- 2. Calculate ECC and Update Block Property ---

    // Pack #2: Get the buffer slice (first 96 bytes) which NOW includes the updated block.crc.
    const preEccBuffer = block.pack().subarray(0, ECC_SOURCE_LENGTH);

    // Encode8((uchar *)block,block->ecc,127);
    encode8(preEccBuffer, block.ecc, 127);

    // --- 3. Final Pack and Cache (Single Cached Buffer for Drawing Loop) ---
    const finalBlockBuffer = block.pack();
    const blockView = new DataView(finalBlockBuffer.buffer);

    // --- 4. Calculate Initial Pixel Offset (C Pointer Arithmetic) ---
    x = (index % nx) * (NDOT + 3) * dx + 2 * dx + border;
    y = Math.floor(index / nx) * (NDOT + 3) * dy + 2 * dy + border;
    let bitsOffset = (height - y - 1) * width + x;

    // --- 5. Drawing Loop (32 rows x 32 columns) ---
    for (j = 0; j < 32; j++) {

        // t=((uint32_t *)block)[j];
        const readOffset = j * 4;
        t = blockView.getUint32(readOffset, true); // little-endian

        // XOR with 0x55/0xAA checkerboard pattern
        if ((j & 1) === 0)
            t ^= 0x55555555;
        else
            t ^= 0xAAAAAAAA;

        x = 0; // X offset reset

        // for (i=0; i<32; i++) {
        for (i = 0; i < 32; i++) {

            // if (t & 1) {
            if (t & 1) {
                // Draw the dot mark (px * py pixels)
                for (m = 0; m < py; m++) {
                    for (n = 0; n < px; n++) {
                        // bits[x - m*width + n] = (uchar)black;
                        const pixelIndex = bitsOffset + x - (m * width) + n;
                        bits[pixelIndex] = blackValue;
                    }
                }
            }

            t = t >>> 1; // Unsigned right shift

            x += dx; // Move to the next dot cell column
        }

        // bits-=dy*width; (Move the base offset up one block row)
        bitsOffset -= dy * width;
    }

    // Return the modified pixel buffer
    return bits;
}