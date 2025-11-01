/**
 * @fileoverview
 * Port of the `Decode8` function from `Ecc.c`.
 * This is the main wrapper function for the Reed-Solomon (255,223)
 * decoder. It orchestrates the entire decoding and correction process.
 */

import { calculateSyndromes } from './calculateSyndromes.js';
import { computeErrorLocatorPolynomial } from './computeErrorLocatorPolynomial.js';
import { findErrorLocations } from './findErrorLocations.js';
import { calculateAndCorrectErrors } from './calculateAndCorrectErrors.js';

/**
 * Decodes and corrects a 128-byte data block in-place using Reed-Solomon.
 * Corresponds to the main `Decode8` function in `Ecc.c`.
 *
 * @param {Uint8Array} dataBlock - The 128-byte block (t_data) to decode and correct.
 * This array is modified in-place.
 * @param {Uint8Array | null} eras_pos - An array of erasure locations (not used by paperback).
 * @param {number} no_eras - The number of erasures (0 for paperback).
 * @param {number} pad - The padding value (127 for paperback).
 * @returns {number} The number of errors corrected (0 to 16), or -1 if
 * the block was unrecoverable.
 */
export function decode8(dataBlock, eras_pos, no_eras, pad) {
    // C: int i,j,r,k,deg_lambda,el,deg_omega;
    // C: int syn_error,count;
    // C: uchar lambda[33],s[32],b[33],t[33],omega[33];
    // C: uchar root[32],reg[33],loc[32];

    // --- Step 1: Calculate Syndromes ---
    // C: for (i=0; i<32; i++) s[i]=data[0]; ...
    // C: syn_error=0; ...
    // C: for (i=0; i<32; i++) { syn_error|=s[i]; s[i]=rs_index[s[i]]; };
    const { syndromes, hasError } = calculateSyndromes(dataBlock, pad);

    // C: if (syn_error==0) {
    // C:   count=0; goto finish; };
    if (!hasError) {
        return 0; // No errors found
    }

    // --- Step 2: Compute Error Locator Polynomial (Berlekamp-Massey) ---
    // C: memset(lambda+1,0,32);
    // C: lambda[0]=1;
    // C: ... (erasure handling) ...
    // C: for (i=0; i<33; i++) b[i]=rs_index[lambda[i]];
    // C: r=el=no_eras;
    // C: while (++r<=32) { ... }
    const { lambda, deg_lambda } = computeErrorLocatorPolynomial(syndromes, eras_pos, no_eras);

    // --- Step 3: Find Error Locations (Chien Search) ---
    // C: memcpy(reg+1,lambda+1,32);
    // C: count=0;
    // C: for (i=1,k=115; i<=255; i++,k=(k+116)%255) { ... }
    const { success, loc, root, count } = findErrorLocations(lambda, deg_lambda);

    // C: if (deg_lambda!=count) {
    // C:   count=-1;
    // C:   goto finish; };
    if (!success) {
        return -1; // Unrecoverable error
    }

    // --- Step 4: Calculate and Correct Errors (Forney's Algorithm) ---
    // C: deg_omega=deg_lambda-1;
    // C: for (i=0; i<=deg_omega; i++ ) { ... }
    // C: for (j=count-1; j>=0; j--) { ... }
    calculateAndCorrectErrors(
        dataBlock,
        pad,
        syndromes,
        lambda,
        loc,
        root,
        count,
        deg_lambda
    );

    // C: finish:
    // C: if (eras_pos!=NULL) {
    if (eras_pos) {
        // C: for (i=0; i<count; i++) eras_pos[i]=loc[i]; };
        for (let i = 0; i < count; i++) {
            eras_pos[i] = loc[i];
        }
    }

    // C: return count;
    return count;
    // C: };
}