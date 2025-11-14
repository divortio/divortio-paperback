/**
 * @file baseDimensions.js
 * @overview
 * A low-level primitive class used to encapsulate all dimensional metrics for a given object,
 * including pixel count, DPI, and the derived inch value.
 * This class serves as the base for geometry calculation classes like PaperDimensions and BlockDimensions.
 */

export class baseDimensions {
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
     * @public
     * @type {{pixels: number, inches: number}}
     * @description Composite object for height metrics. 'inches' stores the high-precision float value (e.g., 3 decimal places).
     */
    height;

    /**
     * @param {number} widthPixels - The width of the object in pixels.
     * @param {number} heightPixels - The height of the object in pixels.
     * @param {number} widthInches - The width of the object in inches (high-precision float).
     * @param {number} heightInches - The height of the object in inches (high-precision float).
     * @param {number} dpi - The resolution (dots per inch).
     */
    constructor(widthPixels, heightPixels, widthInches, heightInches, dpi) {
        this.dpi = dpi;

        this.width = {
            pixels: widthPixels,
            inches: widthInches
        };

        this.height = {
            pixels: heightPixels,
            inches: heightInches
        };
    }

    // --- GETTERS ---

    /**
     * @private
     * @returns {number} The total area of the object in pixels.
     */
    _getTotalPixels() {
        return this.width.pixels * this.height.pixels;
    }

    /**
     * @public
     * @returns {string} The formatted dimensions string (e.g., '8.3x11.7'). Uses 1 decimal place for display.
     */
    get dimensions() {
        // Use the stored high-precision inch value for formatting
        const widthInches = parseFloat(this.width.inches.toFixed(1));
        const heightInches = parseFloat(this.height.inches.toFixed(1));
        return `${widthInches}x${heightInches}`;
    }

    /**
     * @public
     * @returns {number} The total area in MegaPixels (MP), formatted to one decimal place.
     */
    get megapixels() {
        const totalPixels = this._getTotalPixels();
        return parseFloat((totalPixels / 1000000).toFixed(1));
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