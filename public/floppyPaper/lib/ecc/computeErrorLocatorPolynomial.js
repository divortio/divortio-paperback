/**
 * @fileoverview
 * Port of the Berlekamp-Massey algorithm from the `Decode8` function in `Ecc.c`.
 * This function computes the error locator polynomial (lambda) from the
 * syndromes calculated in the previous step.
 */

import { rs_alpha } from './rsAlpha.js';
import { rs_index } from './rsIndex.js';

/**
 * Computes the error locator polynomial (lambda) from the syndromes.
 * This is the second step of the Reed-Solomon decoding process.
 * Corresponds to the Berlekamp-Massey algorithm section of `Decode8` in `Ecc.c`.
 *
 * @param {Uint8Array} s - The 32-byte syndrome array (in log form, 255=0).
 * @param {Uint8Array | null} eras_pos - An array of erasure locations (not used by paperback).
 * @param {number} no_eras - The number of erasures (0 for paperback).
 * @returns {{lambda: Uint8Array, deg_lambda: number}} An object containing:
 * - `lambda`: The 33-byte error locator polynomial (in log form).
 * - `deg_lambda`: The degree of the lambda polynomial.
 */
export function computeErrorLocatorPolynomial(s, eras_pos, no_eras) {
    // C: int i,j,r,k,deg_lambda,el,deg_omega;
    // C: uchar u,q,tmp,num1,num2,den,discr_r;
    // C: uchar lambda[33],s[32],b[33],t[33],omega[33];

    // lambda and t are in polynomial form (values 0-255)
    const lambda = new Uint8Array(33);
    const t = new Uint8Array(33);
    // b is in log form (values 0-254, with 255 representing 0)
    const b = new Uint8Array(33);

    // C: memset(lambda+1,0,32);
    // C: lambda[0]=1;
    // (new Uint8Array is 0-filled by default)
    lambda[0] = 1;

    // C: if (no_eras>0) {
    if (no_eras > 0 && eras_pos) {
        // C: lambda[1]=rs_alpha[(11*(254-eras_pos[0]))%255];
        lambda[1] = rs_alpha[(11 * (254 - eras_pos[0])) % 255];
        // C: for (i=1; i<no_eras; i++) {
        for (let i = 1; i < no_eras; i++) {
            // C: u=(uchar)((11*(254-eras_pos[i]))%255);
            const u = (11 * (254 - eras_pos[i])) % 255;
            // C: for (j=i+1; j>0; j--) {
            for (let j = i + 1; j > 0; j--) {
                // C: tmp=rs_index[lambda[j-1]];
                const tmp = rs_index[lambda[j - 1]];
                // C: if (tmp!=255) lambda[j]^=rs_alpha[(u+tmp)%255];
                if (tmp !== 255) {
                    lambda[j] ^= rs_alpha[(u + tmp) % 255];
                }
            }
            // C: };
        }
        // C: };
    }

    // C: for (i=0; i<33; i++)
    // C:   b[i]=rs_index[lambda[i]];
    // Initialize 'b' (log form) from 'lambda' (poly form)
    for (let i = 0; i < 33; i++) {
        b[i] = rs_index[lambda[i]];
    }

    // C: r=el=no_eras;
    let r = no_eras;
    let el = no_eras;

    // C: while (++r<=32) {
    while (++r <= 32) {
        // C: discr_r=0;
        let discr_r_poly = 0; // Discrepancy in polynomial form

        // C: for (i=0; i<r; i++) {
        for (let i = 0; i < r; i++) {
            // C: if ((lambda[i]!=0) && (s[r-i-1]!=255)) {
            // (lambda[i] is poly form, s[r-i-1] is log form)
            if (lambda[i] !== 0 && s[r - i - 1] !== 255) {
                // C: discr_r^=rs_alpha[(rs_index[lambda[i]]+s[r-i-1])%255];
                // This is poly(lambda) * poly(s)
                // (log[lambda] + log[s]) % 255 = log[lambda * s]
                // rs_alpha[...] = poly[lambda * s]
                // discr_r_poly is accumulating the poly values
                discr_r_poly ^= rs_alpha[(rs_index[lambda[i]] + s[r - i - 1]) % 255];
            }
            // C: };
        }
        // C: };

        // C: discr_r=rs_index[discr_r];
        // Convert discrepancy to log form
        const discr_r_log = rs_index[discr_r_poly];

        // C: if (discr_r==255) {
        if (discr_r_log === 255) { // if discrepancy is 0
            // C: memmove(b+1,b,32);
            // b.set(b.subarray(0, 32), 1) -> JS equivalent
            b.copyWithin(1, 0, 32);
            // C: b[0]=255; }
            b[0] = 255; // Set b[0] to log(0)
        } else {
            // C: t[0]=lambda[0];
            t[0] = lambda[0];
            // C: for (i=0; i<32; i++) {
            for (let i = 0; i < 32; i++) {
                // C: if (b[i]!=255)
                if (b[i] !== 255) { // if b[i] is not 0
                    // C: t[i+1]=lambda[i+1]^rs_alpha[(discr_r+b[i])%255];
                    // This is: t = lambda ^ (discr_r * b)
                    // (log[discr_r] + log[b]) % 255 = log[discr_r * b]
                    // rs_alpha[...] = poly[discr_r * b]
                    t[i + 1] = lambda[i + 1] ^ rs_alpha[(discr_r_log + b[i]) % 255];
                } else {
                    // C: t[i+1]=lambda[i+1];
                    t[i + 1] = lambda[i + 1];
                }
                // C: ;
            }
            // C: };

            // C: if (2*el<=r+no_eras-1) {
            if (2 * el <= r + no_eras - 1) {
                // C: el=r+no_eras-el;
                el = r + no_eras - el;
                // C: for (i=0; i<=32; i++)
                for (let i = 0; i <= 32; i++) {
                    // C: b[i]=(uchar)(lambda[i]==0?255:(rs_index[lambda[i]]-discr_r+255)%255);
                    // This is: b = lambda / discr_r (in log space)
                    // (log[lambda] - log[discr_r])
                    b[i] = (lambda[i] === 0) ? 255 : (rs_index[lambda[i]] - discr_r_log + 255) % 255;
                }
                // C: ; }
            } else {
                // C: memmove(b+1,b,32);
                b.copyWithin(1, 0, 32);
                // C: b[0]=255; };
                b[0] = 255;
            }
            // C: memcpy(lambda,t,33);
            lambda.set(t);
        }
        // C: };
    }
    // C: };

    // C: deg_lambda=0;
    let deg_lambda = 0;
    // C: for (i=0; i<33; i++) {
    for (let i = 0; i < 33; i++) {
        // C: lambda[i]=rs_index[lambda[i]];
        // Convert the final lambda polynomial from poly form to log form
        // for the next steps (Chien search and Forney algorithm).
        lambda[i] = rs_index[lambda[i]];
        // C: if (lambda[i]!=255) deg_lambda=i; };
        if (lambda[i] !== 255) {
            deg_lambda = i; // Record the highest degree
        }
    }

    // C: memcpy(reg+1,lambda+1,32);
    // This is part of the C Chien search, so we will do it in the next file.

    return { lambda, deg_lambda };
}