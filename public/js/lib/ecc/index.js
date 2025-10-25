// src/ecc/index.js

import { rs_alpha, rs_index, poly } from './tables.js';
import { gf_add, gf_multiply, gf_divide } from './galoisField.js';

/**
 * Generates the 32-byte Reed-Solomon error correction code for a data block.
 * @param {Uint8Array} data - The input data block. The first (223-pad) bytes are used.
 * @param {Uint8Array} parity - A 32-byte output array to store the generated parity code.
 * @param {number} pad - The number of padding bytes at the end of the 255-byte block.
 */
export function encode8(data, parity, pad) {
    const bb = new Uint8Array(32);
    const dataLength = 255 - 32 - pad;

    for (let i = 0; i < dataLength; i++) {
        const feedback = rs_index[data[i] ^ bb[0]];

        if (feedback !== 255) { // 255 is the log of 0
            for (let j = 1; j < 32; j++) {
                bb[j] ^= rs_alpha[(feedback + poly[32 - j]) % 255];
            }
        }

        // Shift the register
        bb.set(bb.subarray(1), 0);

        if (feedback !== 255) {
            bb[31] = rs_alpha[(feedback + poly[0]) % 255];
        } else {
            bb[31] = 0;
        }
    }
    parity.set(bb);
}


/**
 * Decodes and corrects a Reed-Solomon coded block, including handling for known error locations (erasures).
 * @param {Uint8Array} data - The 255-byte block (data + parity) to be decoded. The length used is (255-pad).
 * @param {number[] | null} eras_pos - An array of known error locations (erasures).
 * @param {number} no_eras - The number of erasures.
 * @param {number} pad - The number of padding bytes.
 * @returns {number} The number of corrected errors, or -1 on decoding failure.
 */
export function decode8(data, eras_pos, no_eras = 0, pad = 0) {
    // State variables for the decoding algorithm
    const s = new Uint8Array(32);      // Syndromes
    const lambda = new Uint8Array(33); // Error Locator Polynomial
    const b = new Uint8Array(33);      // Corrector Polynomial
    const t = new Uint8Array(33);      // Temporary copy of lambda
    const omega = new Uint8Array(33);  // Error Evaluator Polynomial
    const root = new Uint8Array(32);   // Roots of the locator polynomial
    const loc = new Uint8Array(32);    // Error locations
    const dataLength = 255 - pad;

    // =========================================================================
    // STEP 1: Calculate Syndromes
    // If all syndromes are zero, there are no errors.
    // =========================================================================
    let syn_error = false;
    for (let i = 0; i < 32; i++) {
        let sum = data[0];
        for (let j = 1; j < dataLength; j++) {
            if (sum === 0) {
                sum = data[j];
            } else {
                sum = data[j] ^ rs_alpha[(rs_index[sum] + (112 + i) * 11) % 255];
            }
        }
        s[i] = sum;
        if (s[i] !== 0) {
            syn_error = true;
        }
    }

    if (!syn_error) {
        return 0; // No errors detected
    }

    // Convert syndromes to log form for faster processing in subsequent steps
    for (let i = 0; i < 32; i++) s[i] = rs_index[s[i]];

    // =========================================================================
    // STEP 2: Berlekamp-Massey Algorithm
    // This iterative algorithm finds the Error Locator Polynomial (lambda).
    // =========================================================================
    lambda.fill(0);
    lambda[0] = 1;

    // Incorporate known erasures into the initial lambda polynomial
    if (no_eras > 0 && eras_pos) {
        lambda[1] = rs_alpha[(11 * (254 - eras_pos[0])) % 255];
        for (let i = 1; i < no_eras; i++) {
            const u = (11 * (254 - eras_pos[i])) % 255;
            for (let j = i + 1; j > 0; j--) {
                const tmp = rs_index[lambda[j - 1]];
                if (tmp !== 255) {
                    lambda[j] ^= rs_alpha[(u + tmp) % 255];
                }
            }
        }
    }

    for (let i = 0; i < 33; i++) b[i] = rs_index[lambda[i]];

    let el = no_eras;
    for (let r = no_eras; r < 32; r++) {
        // Calculate the discrepancy
        let discr_r = 0;
        for (let i = 0; i < r + 1; i++) {
            if (lambda[i] !== 0 && s[r - i] !== 255) {
                discr_r ^= rs_alpha[(rs_index[lambda[i]] + s[r - i]) % 255];
            }
        }
        discr_r = rs_index[discr_r];

        if (discr_r === 255) { // Discrepancy is zero, shift corrector polynomial
            b.copyWithin(1, 0, 32);
            b[0] = 255;
        } else {
            t.set(lambda); // Update lambda
            for (let i = 0; i < 32; i++) {
                if (b[i] !== 255) {
                    t[i + 1] ^= rs_alpha[(discr_r + b[i]) % 255];
                }
            }
            if (2 * el <= r + no_eras) {
                const old_el = el;
                el = r + no_eras - el + 1;
                for (let i = 0; i < 33; i++) {
                    b[i] = (lambda[i] === 0) ? 255 : (rs_index[lambda[i]] - discr_r + 255) % 255;
                }
            } else {
                b.copyWithin(1, 0, 32);
                b[0] = 255;
            }
            lambda.set(t);
        }
    }

    let deg_lambda = 0;
    for (let i = 0; i < 33; i++) {
        if (lambda[i] !== 0) deg_lambda = i;
    }

    // =========================================================================
    // STEP 3: Chien Search
    // Test all possible values to find the roots of the error locator polynomial.
    // The roots indicate the locations of the errors.
    // =========================================================================
    let count = 0;
    for (let i = 1, k = 115; i <= 255; i++, k = (k + 116) % 255) {
        let q = 1;
        for (let j = 1; j <= deg_lambda; j++) {
            q ^= gf_multiply(lambda[j], rs_alpha[(i * j) % 255]);
        }
        if (q === 0) {
            root[count] = i;
            loc[count] = k;
            if (++count === deg_lambda) break;
        }
    }

    if (deg_lambda !== count) {
        return -1; // Decoding failure: Number of roots doesn't match degree of polynomial
    }

    // =========================================================================
    // STEP 4: Forney's Algorithm
    // Calculate the magnitude (value) of the error at each found location.
    // =========================================================================
    for (let j = count - 1; j >= 0; j--) {
        // Calculate the error evaluator polynomial (omega)
        let num1 = 0;
        const deg_omega = deg_lambda - 1;
        for (let i = 0; i <= deg_omega; i++) {
            let tmp = 0;
            for (let k = i; k >= 0; k--) {
                if (s[i - k] !== 255 && rs_index[lambda[k]] !== 255) {
                    tmp ^= rs_alpha[(s[i - k] + rs_index[lambda[k]]) % 255];
                }
            }
            if (tmp !== 0) {
                num1 ^= rs_alpha[(rs_index[tmp] + i * root[j]) % 255];
            }
        }

        // Calculate the formal derivative of lambda
        let den = 0;
        for (let i = 1; i <= deg_lambda; i += 2) {
            if(rs_index[lambda[i]] !== 255) {
                den ^= rs_alpha[(rs_index[lambda[i]] + (i - 1) * root[j]) % 255];
            }
        }

        // Calculate error magnitude and apply the correction to the data
        if (num1 !== 0 && loc[j] >= pad) {
            const err_mag = gf_divide(num1, den);
            data[loc[j] - pad] ^= err_mag;
        }
    }

    return count;
}