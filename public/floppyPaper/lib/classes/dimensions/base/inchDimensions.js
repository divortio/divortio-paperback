/**
 * @file InchDimensions.js
 * @overview
 * This class handles the conversion from physical paper dimensions (in 1/1000th of an inch)
 * to calculated pixel dimensions, implementing C-parity floor rounding.
 * @augments baseDimensions
 */

import { baseDimensions } from './baseDimensions.js';

export class InchDimensions extends baseDimensions {
    /**
     * @param {number} [dpi=300] - Target resolution in dots per inch.
     * @param {number} [width1000=8270] - Paper width in 1/1000th of an inch (A4 standard).
     * @param {number} [height1000=11690] - Paper height in 1/1000th of an inch (A4 standard).
     */
    constructor(dpi = 300, width1000 = 8270, height1000 = 11690) {


        // --- 1. C-Parity Conversion: Inches/1000ths to Pixels ---
        // C logic: width=print->ppix*8270/1000; (Uses Math.floor for truncation)
        const widthPixels = Math.floor((dpi * width1000) / 1000);
        const heightPixels = Math.floor((dpi * height1000) / 1000);
        const widthInches = width1000 / 1000
        const heightInches = height1000 / 1000;

        // --- 2. Call Base Constructor ---
        // Sets up pixel properties and calculates initial derived inch values.
        super(widthPixels, heightPixels,widthInches, heightInches, dpi);


    }
}