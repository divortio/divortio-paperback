/**
 * @fileoverview
 * Port of the Chien search algorithm from the `Decode8` function in `Ecc.c`.
 * This function finds the roots of the error locator polynomial (lambda)
 * to determine the exact locations of errors in the data block.
 */

import { rs_alpha } from './rsAlpha.js';

/**
 * Finds the locations of errors by finding the roots of the lambda polynomial.
 * This is the third step of the Reed-Solomon decoding process.
 * Corresponds to the Chien search section of `Decode8` in `Ecc.c`.
 *
 * @param {Uint8Array} lambda - The 33-byte error locator polynomial (in log form).
 * @param {number} deg_lambda - The degree of the lambda polynomial.
 * @returns {{
 * success: boolean,
 * loc: Uint8Array,
 * root: Uint8Array,
 * count: number
 * }} An object containing:
 * - `success`: True if the number of roots found matches the polynomial degree.
 * - `loc`: A 32-byte array of error locations.
 * - `root`: A 32-byte array of error roots.
 * - `count`: The number of errors found.
 */
export function findErrorLocations(lambda, deg_lambda) {
    // C: uchar root[32],reg[33],loc[32];
    const root = new Uint8Array(32);
    const loc = new Uint8Array(32);
    const reg = new Uint8Array(33);
    let count = 0;

    // C: memcpy(reg+1,lambda+1,32);
    // This initializes the Chien search register with the lambda coefficients.
    reg.set(lambda.subarray(1), 1);

    // C: count=0;

    // C: for (i=1,k=115; i<=255; i++,k=(k+116)%255) {
    // i = 1 to 255 (all possible roots)
    // k = 115, 231, 92, 208, ... (the corresponding locations)
    for (let i = 1, k = 115; i <= 255; i++, k = (k + 116) % 255) {
        // C: q=1;
        let q_poly = 1; // q is in polynomial form (1 is the 0th coefficient)

        // C: for (j=deg_lambda; j>0; j--) {
        // This loop evaluates the polynomial `lambda(i)`
        for (let j = deg_lambda; j > 0; j--) {
            // C: if (reg[j]!=255) {
            if (reg[j] !== 255) { // if reg[j] (log-form) is not 0
                // C: reg[j]=(uchar)((reg[j]+j)%255);
                // This is log(lambda_j * i^j)
                reg[j] = (reg[j] + j) % 255;
                // C: q^=rs_alpha[reg[j]];
                // This is q = q + (lambda_j * i^j) in polynomial form
                q_poly ^= rs_alpha[reg[j]];
            }
            // C: };
        }
        // C: };

        // C: if (q!=0) continue;
        if (q_poly !== 0) {
            continue; // This `i` is not a root, try next
        }

        // C: // Root found
        // C: root[count]=(uchar)i;
        root[count] = i; // Store the root
        // C: loc[count]=(uchar)k;
        loc[count] = k; // Store the corresponding location

        // C: if (++count==deg_lambda) break;
        if (++count === deg_lambda) {
            break; // Found all the roots we expected
        }
        // C: };
    }

    // C: if (deg_lambda!=count) {
    if (deg_lambda !== count) {
        // C: count=-1;
        // C: goto finish; };
        // Failure: The number of roots found doesn't match the
        // degree of the polynomial. This means the block is unrecoverable.
        return { success: false, loc: null, root: null, count: -1 };
    }

    // Success
    return { success: true, loc, root, count };
}