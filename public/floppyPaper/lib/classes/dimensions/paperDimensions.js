/**
 * @file PaperDimensions.js
 * @overview
 * This class handles all base paper dimension calculations, converting the
 * 1/1000th inch dimensions and DPI into final printable pixel areas, and manages
 * getters for human-readable sizing.
 */
import { PixelDimensions } from './base/pixelDimensions.js';

/**
 * @augments PixelDimensions
 */
export class PaperDimensions extends PixelDimensions {

    /**
     * @param {number} [dpi=300] - Target resolution in dots per inch.
     * @param {number} [width1000=8270] - Paper width in 1/1000th of an inch (A4 standard).
     * @param {number} [height1000=11690] - Paper height in 1/1000th of an inch (A4 standard)
     */
    constructor(dpi = 300, width1000 = 8270, height1000 = 11690) {
        const targetDpiX = dpi;
        const targetDpiY = dpi;

        // --- 1. Calculate Initial Total Pixels (Before Margins) ---
        let widthPixels = Math.floor((targetDpiX * width1000) / 1000);
        let heightPixels = Math.floor((targetDpiY * height1000) / 1000);

        // --- 2. Calculate Margins ---
        const borderLeft = targetDpiX;
        const borderRight = Math.floor(targetDpiX / 2);
        const borderTop = Math.floor(targetDpiY / 2);
        const borderBottom = Math.floor(targetDpiY / 2);

        const extraTop = 0;
        const extraBottom = 0;

        // --- 3. Calculate Final Printable Area Pixels (Margin Subtraction) ---
        widthPixels -= (borderLeft + borderRight);
        heightPixels -= (borderTop + borderBottom + extraTop + extraBottom);

        super(widthPixels, heightPixels, dpi);

    }
}