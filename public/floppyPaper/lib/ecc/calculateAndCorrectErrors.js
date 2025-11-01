/**
 * @fileoverview
 * Port of the error correction logic (Forney's algorithm) from `Ecc.c`.
 * This is the final step in the RS decoding pipeline. It calculates
 * the error magnitudes and applies them (via XOR) to the data block
 * to correct the errors in place.
 */

import { rs_alpha } from './rsAlpha.js';
import { rs_index } from './rsIndex.js';

/**
 * Calculates the error evaluator polynomial (omega) and then uses it
 * to find the error magnitudes and correct the data block in-place.
 *
 * Corresponds to the final section of `Decode8` in `Ecc.c`.
 *
 * @param {Uint8Array} dataBlock - The 128-byte block (t_data) to correct (modified in-place).
 * @param {number} pad - The padding value (127 for paperback).
 * @param {Uint8Array} s - The 32-byte syndrome array (in log form).
 * @param {Uint8Array} lambda - The 33-byte error locator polynomial (in log form).
 * @param {Uint8Array} loc - The 32-byte array of error locations.
 * @param {Uint8Array} root - The 32-byte array of error roots.
 * @param {number} count - The number of errors found.
 * @param {number} deg_lambda - The degree of the lambda polynomial.
 */
export function calculateAndCorrectErrors(dataBlock, pad, s, lambda, loc, root, count, deg_lambda) {
    // C: int i,j,r,k,deg_lambda,el,deg_omega;
    // C: uchar u,q,tmp,num1,num2,den,discr_r;
    // C: uchar omega[33];

    // omega is in log form (255=0)
    const omega = new Uint8Array(33);

    // C: // First, calculate the error evaluator polynomial 'omega'
    // C: deg_omega=deg_lambda-1;
    const deg_omega = deg_lambda - 1;

    // C: for (i=0; i<=deg_omega; i++ ) {
    for (let i = 0; i <= deg_omega; i++) {
        // C: tmp=0;
        let tmp_poly = 0; // tmp is in polynomial form

        // C: for (j=i; j>=0; j--) {
        for (let j = i; j >= 0; j--) {
            // C: if ((s[i-j]!=255) && (lambda[j]!=255)) {
            // (s and lambda are both in log form)
            if (s[i - j] !== 255 && lambda[j] !== 255) {
                // C: tmp^=rs_alpha[(s[i-j]+lambda[j])%255];
                // This is (s * lambda) in polynomial form
                tmp_poly ^= rs_alpha[(s[i - j] + lambda[j]) % 255];
            }
            // C: };
        }
        // C: };
        // C: omega[i]=rs_index[tmp];
        omega[i] = rs_index[tmp_poly]; // Convert result to log form
        // C: };
    }

    // C: // Now, correct the errors in the data block
    // C: for (j=count-1; j>=0; j--) {
    for (let j = count - 1; j >= 0; j--) {
        // C: num1=0;
        let num1_poly = 0; // Numerator 1 (from omega) in polynomial form

        // C: for (i=deg_omega; i>=0; i--) {
        for (let i = deg_omega; i >= 0; i--) {
            // C: if (omega[i]!=255) {
            if (omega[i] !== 255) {
                // C: num1^=rs_alpha[(omega[i]+i*root[j])%255];
                // This is log(omega_i * root^i)
                num1_poly ^= rs_alpha[(omega[i] + i * root[j]) % 255];
            }
            // C: };
        }
        // C: };

        // C: num2=rs_alpha[(root[j]*111+255)%255];
        // This is log(root^111)
        const num2_poly = rs_alpha[(root[j] * 111 + 255) % 255];

        // C: den=0;
        let den_poly = 0; // Denominator (from lambda') in polynomial form

        // C: for (i=(deg_lambda<31?deg_lambda:31) & ~1; i>=0; i-=2) {
        // This iterates over the odd-powered terms of lambda
        for (let i = (Math.min(deg_lambda, 31)) & ~1; i >= 0; i -= 2) {
            // C: if (lambda[i+1]!=255) {
            if (lambda[i + 1] !== 255) {
                // C: den^=rs_alpha[(lambda[i+1]+i*root[j])%255];
                // This is log(lambda_{i+1} * root^i)
                den_poly ^= rs_alpha[(lambda[i + 1] + i * root[j]) % 255];
            }
            // C: };
        }
        // C: };

        // C: if (num1!=0 && loc[j]>=pad) {
        // C's `pad` is 127. `loc[j]` is 0-254.
        // `loc[j] - pad` gives the 0-127 index into the data block.
        if (num1_poly !== 0 && loc[j] >= pad) {
            // C: data[loc[j]-pad]^=rs_alpha[(rs_index[num1]+rs_index[num2]+255-rs_index[den])%255];
            // This is the error magnitude calculation:
            // error_poly = (num1 * num2) / den
            // In log form: log(num1) + log(num2) - log(den)
            const error_log = (rs_index[num1_poly] + rs_index[num2_poly] + 255 - rs_index[den_poly]) % 255;
            const error_poly = rs_alpha[error_log];

            // Apply the correction to the data block in-place
            dataBlock[loc[j] - pad] ^= error_poly;
        }
        // C: };
    }
    // C: };
}