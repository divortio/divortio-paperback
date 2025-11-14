/**
 * @file borderDimensions.js
 * @overview
 * A low-level primitive class used to encapsulate the width dimensions for the grid border
 * including pixel count, DPI, and the derived inch value.
 */

export class BorderDimensions {
    /**
     * @public
     * @type {number}
     * @description Resolution of the data, dots per inch.
     */
    dpi;

    /**
     * @public
     * @type {{pixels: number, inches: number}}
     * @description Composite object for width metrics. 'inches' stores the high-precision float value (e.g., 3 decimal places).
     */
    width;


    /**
     * @param {number} widthPixels - The width of the object in pixels.
     * @param {number} dpi - The resolution (dots per inch).
     */
    constructor(widthPixels, dpi) {
        /**
         * @private
         * @returns {number} The calculated inch value using C-parity floor truncation (3 decimal places).
         */
        const _calculateInches = function(pixels, dpi) {
            const value = pixels / dpi;
            // Truncates to 3 decimal places using Math.floor(value * 1000) / 1000
            return Math.floor(value * 1000) / 1000;
        }
        this.dpi = dpi;
        this.width = {
            pixels: widthPixels,
            inches: _calculateInches(widthPixels, dpi)
        };
    }

    /**
     * @public
     * @returns {string} The formatted dimensions string (e.g., '8.3x11.7'). Uses 1 decimal place for display.
     */
    get dimensions() {
        // Use the stored high-precision inch value for formatting
        const widthInches = parseFloat(this.width.inches.toFixed(1));
        return `${widthInches}`;
    }


    /**
     * Overrides the default toString method for helpful logging.
     * @public
     * @returns {string} The formatted dimensions string.
     */
    toString() {
        return this.dimensions;
    }

    /**
     * Overrides the default symbol tag to return the formatted dimensions.
     * @public
     * @returns {string} The formatted dimensions string.
     */
    get [Symbol.toStringTag]() {
        return this.dimensions;
    }
}