// src/ecc/galoisField.js

import { rs_alpha, rs_index } from './tables.js';

/**
 * Adds two numbers in GF(2^8). This is a simple XOR operation.
 * @param {number} a - First operand.
 * @param {number} b - Second operand.
 * @returns {number} The result of a ^ b.
 */
export function gf_add(a, b) {
    return a ^ b;
}

/**
 * Multiplies two numbers in GF(2^8) using the log/antilog tables.
 * This is equivalent to `rs_alpha[(rs_index[a] + rs_index[b]) % 255]`.
 * @param {number} a - First operand.
 * @param {number} b - Second operand.
 * @returns {number} The product of a and b in GF(2^8).
 */
export function gf_multiply(a, b) {
    if (a === 0 || b === 0) {
        return 0;
    }
    const log_a = rs_index[a];
    const log_b = rs_index[b];
    return rs_alpha[(log_a + log_b) % 255];
}

/**
 * Divides two numbers in GF(2^8) using the log/antilog tables.
 * This is equivalent to `rs_alpha[(rs_index[a] - rs_index[b] + 255) % 255]`.
 * @param {number} a - The dividend.
 * @param {number} b - The divisor.
 * @returns {number} The quotient of a and b in GF(2^8).
 */
export function gf_divide(a, b) {
    if (b === 0) {
        throw new Error("Division by zero in Galois Field");
    }
    if (a === 0) {
        return 0;
    }
    const log_a = rs_index[a];
    const log_b = rs_index[b];
    return rs_alpha[(log_a - log_b + 255) % 255];
}