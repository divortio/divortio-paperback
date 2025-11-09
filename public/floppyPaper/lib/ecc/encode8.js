/**
 * @file encode8.js
 * @overview
 * Port of the `Encode8` function from `Ecc.c`.
 * This function calculates the 32-byte Reed-Solomon error correction
 * code (ECC) for a 96-byte data block and writes it into the designated parity buffer.
 * * Corresponds to the C signature: `void Encode8(uchar *data, uchar *parity, int pad)`.
 * The input `data` is 96 bytes (addr, payload, crc).
 */

import { rs_alpha } from './rsAlpha.js';
import { rs_index } from './rsIndex.js';
import { poly } from './poly.js';

/**
 * Encodes the input data block with Reed-Solomon ECC and writes the parity to the output buffer.
 *
 * @param {Uint8Array} dataBlock - The 96-byte input data (addr, payload, crc) to be encoded. (Read-only for this function).
 * @param {Uint8Array} parityBuffer - The 32-byte buffer (the 'ecc' field) where the calculated parity must be written. (Write-only output).
 * @param {number} pad - The padding value (127 for paperback, meaning 96 bytes of data).
 * @returns {void}
 * @see C_EQUIVALENT: Encode8(uchar *data, uchar *parity, int pad)
 */
export function encode8(dataBlock, parityBuffer, pad) {
    let feedback;
    let i, j;

    // Internal 32-byte buffer (bb) used for intermediate polynomial calculations.
    // C's internal logic uses the 'parity' pointer for this accumulator, but in JS
    // we use a temporary buffer to avoid accidental mutation of the output during calc.
    const bb = new Uint8Array(32);

    // The length of the input data block is 223 - pad = 96 bytes.
    const dataLength = 223 - pad; // 96

    // C: for (i=0; i<223-pad; i++) {
    for (i = 0; i < dataLength; i++) {
        // C: feedback=rs_index[data[i]^bb[0]];
        feedback = rs_index[dataBlock[i] ^ bb[0]];

        if (feedback !== 255) { // 255 is the log of 0
            // C: for (j=1; j<32; j++) {
            for (j = 1; j < 32; j++) {
                // C: bb[j]^=rs_alpha[(feedback+poly[32-j])%255];
                bb[j] ^= rs_alpha[(feedback + poly[32 - j]) % 255];
            }
        }

        // C: memmove(bb,bb+1,31);
        // Shift the buffer 1 byte to the left (polynomial multiplication equivalent).
        bb.set(bb.subarray(1));

        // C: if (feedback!=255) bb[31]=rs_alpha[(feedback+poly[0])%255]; else bb[31]=0;
        if (feedback !== 255) {
            bb[31] = rs_alpha[(feedback + poly[0]) % 255];
        } else {
            bb[31] = 0;
        }
    }

    // --- Final Step: Write Result to Parity Buffer ---
    // C code implicitly writes the result via the 'parity' pointer (which was 'bb').
    // JS equivalent: copy the calculated temporary buffer (bb) to the output (parityBuffer).
    parityBuffer.set(bb);
}