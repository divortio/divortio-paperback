/**
 * @fileoverview
 * Port of the `Encode8` function from `Ecc.c`.
 * This function calculates the 32-byte Reed-Solomon error correction
 * code (ECC) for a 96-byte data block and writes it into the block.
 */

import { rs_alpha } from './rsAlpha.js';
import { rs_index } from './rsIndex.js';
import { poly } from './poly.js';

/**
 * Encodes a 128-byte data block with Reed-Solomon ECC in place.
 * It reads the first 96 bytes (addr, data, crc) and calculates
 * 32 parity bytes, which it then writes into the last 32 bytes
 * (the 'ecc' field) of the same data block.
 *
 * Corresponds to `Encode8` in `Ecc.c`.
 *
 * @param {Uint8Array} dataBlock - The 128-byte block (t_data) to encode.
 * This array is modified in place.
 * @param {number} pad - The padding value. In paperback, this is 127,
 * meaning we process (223 - 127) = 96 bytes of data.
 */
export function encode8(dataBlock, pad) {
    // C: int i,j;
    // C: uchar feedback;
    let feedback;

    // C: memset(bb,0,32);
    // This is the 32-byte parity buffer.
    // In JS, a new Uint8Array is 0-filled by default.
    const bb = new Uint8Array(32);

    // C: for (i=0; i<223-pad; i++) {
    // With pad=127, this loops from i=0 to 95 (96 bytes).
    const dataLength = 223 - pad;
    for (let i = 0; i < dataLength; i++) {
        // C: feedback=rs_index[data[i]^bb[0]];
        feedback = rs_index[dataBlock[i] ^ bb[0]];

        // C: if (feedback!=255) {
        if (feedback !== 255) { // 255 is the log of 0
            // C: for (j=1; j<32; j++) {
            for (let j = 1; j < 32; j++) {
                // C: bb[j]^=rs_alpha[(feedback+poly[32-j])%255];
                bb[j] ^= rs_alpha[(feedback + poly[32 - j]) % 255];
            }
            // C: };
        }

        // C: memmove(bb,bb+1,31);
        // Shift the buffer 1 byte to the left.
        // `bb.subarray(1)` is a view from index 1 to the end.
        // `bb.set(..., 0)` copies that view back to index 0.
        bb.set(bb.subarray(1), 0);

        // C: if (feedback!=255)
        if (feedback !== 255) {
            // C: bb[31]=rs_alpha[(feedback+poly[0])%255];
            bb[31] = rs_alpha[(feedback + poly[0]) % 255];
        } else {
            // C: bb[31]=0;
            bb[31] = 0;
        }
        // C: ;
    }
    // C: };

    // Now, write the resulting 32-byte `bb` buffer into the
    // 'ecc' field of the dataBlock, which starts at offset 96.
    dataBlock.set(bb, 96);
}