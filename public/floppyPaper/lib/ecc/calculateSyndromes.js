/**
 * @fileoverview
 * Port of the syndrome calculation logic from the `Decode8` function in `Ecc.c`.
 * This function calculates the 32 syndrome bytes from a received data block.
 * If all syndromes are zero, the block has no detectable errors.
 */

import { rs_alpha } from './rsAlpha.js';
import { rs_index } from './rsIndex.js';

/**
 * Calculates the 32 syndrome bytes for a given data block.
 * This is the first step of the Reed-Solomon decoding process.
 * Corresponds to the first part of `Decode8` in `Ecc.c`.
 *
 * @param {Uint8Array} dataBlock - The 128-byte block (t_data) to check.
 * @param {number} pad - The padding value. In paperback, this is 127.
 * @returns {{syndromes: Uint8Array, hasError: boolean}} An object containing:
 * - `syndromes`: A 32-byte Uint8Array of the *log-form* syndromes.
 * - `hasError`: A boolean that is true if any errors were detected.
 */
export function calculateSyndromes(dataBlock, pad) {
    // C: uchar s[32];
    const s = new Uint8Array(32);

    // C: int syn_error;
    let hasError = false;

    // C: for (i=0; i<32; i++)
    // C:   s[i]=data[0];
    for (let i = 0; i < 32; i++) {
        s[i] = dataBlock[0];
    }

    // C: for (j=1; j<255-pad; j++) {
    // With pad=127, this is (255-127) = 128.
    // This loop processes all 128 bytes of the dataBlock.
    const dataLength = 255 - pad;
    for (let j = 1; j < dataLength; j++) {
        // C: for (i=0; i<32; i++) {
        for (let i = 0; i < 32; i++) {
            // C: if (s[i]==0)
            if (s[i] === 0) {
                // C: s[i]=data[j];
                s[i] = dataBlock[j];
            } else {
                // C: s[i]=data[j]^rs_alpha[(rs_index[s[i]]+(112+i)*11)%255];
                // This is the core Galois Field polynomial evaluation
                s[i] = dataBlock[j] ^ rs_alpha[(rs_index[s[i]] + (112 + i) * 11) % 255];
            }
            // C: ;
        }
        // C: };
    }

    // C: // Check for errors and convert syndromes to log form for next step
    // C: syn_error=0;
    // C: for (i=0; i<32; i++) {
    for (let i = 0; i < 32; i++) {
        // C: syn_error|=s[i];
        if (s[i] !== 0) {
            hasError = true;
        }
        // C: s[i]=rs_index[s[i]]; };
        // Convert the syndrome value to its log (index) representation
        // for the Berlekamp-Massey algorithm.
        s[i] = rs_index[s[i]];
    }

    // C: if (syn_error==0) {
    // C:   count=0; goto finish; };
    // The calling function (`decode8.js`) will handle this check.

    return { syndromes: s, hasError };
}