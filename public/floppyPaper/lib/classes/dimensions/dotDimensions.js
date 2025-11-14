
/**
 * @file DotDimensions.js
 * @overview
 * This module defines the geometric classes for an individual dot unit, managing
 * the logical cell size, physical mark size, and their derived physical dimensions (inches/megapixels)
 * by extending the base PixelDimensions class.
 */

import {PixelDimensions} from "./base/pixelDimensions.js";


// Replicates the C max macro behavior.
const _max = (a, b) => (a > b ? a : b);


/**
 * Calculates the dimensions of the actual ink mark (px, py) drawn within the dot cell.
 * Inherits all dimensional properties and getters from PixelDimensions.
 * @augments PixelDimensions
 */
export class DotDimensions extends PixelDimensions {
    /**
     * @public
     * @type {number}
     * @description The configured dot percentage (50-100).
     */
    dotPercent;

    /**
     * @param {number} dotCellSizeX - Input dx from CellDimensions.
     * @param {number} dotCellSizeY - Input dy from CellDimensions.
     * @param {number} dotPercent - The configured dot percentage (50-100).
     * @param {number} dpi - Target and raster DPI for the calculation.
     */
    constructor(dotCellSizeX, dotCellSizeY, dotPercent, dpi) {


        // Core C calculation: px=max((dx*pb_dotpercent)/100, 1);
        const widthPixels = _max(Math.floor((dotCellSizeX * dotPercent) / 100), 1);
        const heightPixels = _max(Math.floor((dotCellSizeY * dotPercent) / 100), 1);

        // Call base class constructor: super(widthPixels, heightPixels, dpi)
        super(widthPixels, heightPixels, dpi);
        this.dotPercent = dotPercent;
    }
}
