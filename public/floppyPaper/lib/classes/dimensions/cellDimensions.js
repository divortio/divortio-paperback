/**
 * @file CellDimensions.js
 * @overview
 * This module defines the geometric classes for an individual dot unit, managing
 * the logical cell size, physical mark size, and their derived physical dimensions (inches/megapixels)
 * by extending the base PixelDimensions class.
 */

import { PixelDimensions } from './base/pixelDimensions.js'; // Assuming pixelDimensions.js is in the same directory
import {DotDimensions} from "./dotDimensions.js";
// --- Internal Utility Functions ---

// Replicates the C max macro behavior.
const _max = (a, b) => (a > b ? a : b);

// --- 1. Logical Space: CellDimensions ---

/**
 * Calculates the dimensions of the logical area allocated for a single dot (dx, dy).
 * Inherits all dimensional properties and getters from PixelDimensions.
 */
export class CellDimensions extends PixelDimensions {

    /**
     * @public
     * @type {DotDimensions}
     * @description The geometric configuration of the actual printed dot mark (px, py).
     */
    mark;


    /**
     * @param {number} dotPercent - The configured dot percentage (50-100).
     * @param {number} dpi - Target and raster DPI for the calculation.
     */
    constructor(dotPercent, dpi) {
        const targetDpiX = dpi;
        const rasterDpi = dpi;

        // Core C calculation: dx=max(print->ppix/pb_dpi, 2);
        const widthPixels = _max(Math.floor(targetDpiX / rasterDpi), 2);
        const heightPixels = _max(Math.floor(targetDpiX / rasterDpi), 2);

        const mark = new DotDimensions(widthPixels, heightPixels, dotPercent, dpi)
        // Call base class constructor: super(widthPixels, heightPixels, dpi)
        super(widthPixels, heightPixels, dpi);
        this.mark = mark;
    }
}
