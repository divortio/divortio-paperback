/**
 * @fileoverview
 * Provides general-purpose utility functions (`max`, `min`)
 * ported from the C service functions.
 */

/**
 * C: int max (int a, int b)
 *
 * @param {number} a
 * @param {number} b
 * @returns {number} The greater of the two numbers.
 */
export function max(a, b) {
    return a > b ? a : b;
}

/**
 * C: int min (int a, int b)
 *
 * @param {number} a
 * @param {number} b
 * @returns {number} The smaller of the two numbers.
 */
export function min(a, b) {
    return a < b ? a : b;
}