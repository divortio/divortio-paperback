// src/printer/drawBlock.js

import { crc16 } from '../crc16/crc16.js';
import { encode8 } from '../ecc/encode8.js';
import { NDATA, NDOT } from '../primitives/constants.js';

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

    // --- START OF FIX ---
    //
    // C: 1. Add CRC.
    // block->crc=(ushort)(Crc16((uchar *)block,NDATA+sizeof(uint32_t))^0x55AA);
    // We calculate CRC on addr (4 bytes) and data (90 bytes)
    const crc = crc16(blockBytes.subarray(0, NDATA + 4)) ^ 0x55AA;
    blockView.setUint16(NDATA + 4, crc, true); // Offset 94 (4 + 90)

    // C: 2. Add error correction code.
    // Encode8((uchar *)block,block->ecc,127);
    const ecc = new Uint8Array(32);
    encode8(blockBytes, ecc, 127); // pad is 127 for the full block
    blockBytes.set(ecc, NDATA + 6); // Offset 96 (4 + 90 + 2)
    //
    // --- END OF FIX ---


    // 3. Calculate the top-left pixel coordinate of the block.
    // C: x=(index%nx)*(NDOT+3)*dx+2*dx+border;
    // C: y=(index/nx)*(NDOT+3)*dy+2*dy+border;
    let x_start = (index % nx) * (NDOT + 3) * dx + 2 * dx + border;
    let y_start = Math.floor(index / nx) * (NDOT + 3) * dy + 2 * dy + border;

    // C: bits+=(height-y-1)*width+x;
    // (This C pointer logic is correctly re-implemented inside the loop)

    // 4. Draw the 32x32 grid, row by row.
    // C: for (j=0; j<32; j++) {
    for (let j = 0; j < 32; j++) {
        // C: t=((uint32_t *)block)[j];
        // Now we read the *fully populated* buffer
        let t = blockView.getUint32(j * 4, true); // Read a 32-bit row

        // C: t^=(j & 1?0xAAAAAAAA:0x55555555);
        t ^= (j & 1) ? 0xAAAAAAAA : 0x55555555;

        // C: for (i=0; i<32; i++) {
        for (let i = 0; i < 32; i++) {
            // C: if (t & 1) {
            if (t & 1) { // If the LSB is 1, draw a dot.
                // Draw a px-by-py rectangle for the dot.
                // C: for (m=0; m<py; m++) {
                for (let m = 0; m < py; m++) {
                    // C: for (n=0; n<px; n++) {
                    for (let n = 0; n < px; n++) {
                        // C: x=...; y=...;
                        const y = y_start + j * dy + m;
                        const x = x_start + i * dx + n;

                        // C: bits[x-m*width+n]=(uchar)black;
                        // (The C code's pointer logic resolves to this exact bottom-up calculation)
                        bits[(height - y - 1) * width + x] = black;
                    }
                }
            }
            // C: t>>=1;
            t >>= 1; // Move to the next bit
        }
        // C: bits-=dy*width;
        // (This is handled by our absolute 'y' calculation)
    }
}