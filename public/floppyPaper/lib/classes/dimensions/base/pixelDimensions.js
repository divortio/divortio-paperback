/**
 * @file pixelDimensions.js
 * @overview
 * A low-level primitive class used to encapsulate all dimensional metrics for a given axis (width/height),
 * including pixel count, DPI, and the derived inch value.
 * @augments baseDimensions
 */
import { baseDimensions } from './baseDimensions.js'; // Assuming baseDimensions.js is in the same directory

export class PixelDimensions extends baseDimensions {

    /**
     * @param {number} widthPixels - The width in pixels.
     * @param {number} heightPixels - The height in pixels.
     * @param {number} dpi - The resolution (dots per inch).
     */
    constructor(widthPixels, heightPixels, dpi) {

        // Helper function for conversion. Truncates the result to 3 decimal places (C-parity).
        const calculateInches = (pixels, dpi) => {
            const value = pixels / dpi;
            // Truncates to 3 decimal places using Math.floor(value * 1000) / 1000
            return Math.floor(value * 1000) / 1000;
        };

        const calculatedWidthInches = calculateInches(widthPixels, dpi);
        const calculatedHeightInches = calculateInches(heightPixels, dpi);

        // Call base class constructor: super(widthPixels, heightPixels, widthInches, heightInches, dpi)
        // This initializes this.dpi, this.width, and this.height properties.
        super(widthPixels, heightPixels, calculatedWidthInches, calculatedHeightInches, dpi);
    }

}