/**
 * @file blockDimensions.js
 * @overview
 * This class calculates the pitch (spacing) dimensions of a single data block,
 * defining the required pixel offset to draw the next block on the page grid.
 * It also encapsulates the dot's geometry (cell and mark) necessary for drawing calculations.
 */

import {PixelDimensions} from './base/pixelDimensions.js';
import {CellDimensions} from './cellDimensions.js';

// Constant required for pitch calculation
const NDOT = 32;

/**
 * Calculates the horizontal and vertical pitch (spacing) for blocks on the grid.
 * This pitch is the pixel dimension of one repeating unit (32 data dots + 3 dot gap).
 * @augments PixelDimensions
 */
export class BlockDimensions extends PixelDimensions {
    /**
     * @public
     * @type {CellDimensions}
     * @description The geometric configuration of the logical dot cell (dx, dy),
     * required for calculating the block pitch.
     */
    cell;


    /**
     * @param {number} dpi - Target and raster DPI for the dot calculation.
     * @param {number} dotPercent - The configured dot percentage.
     */
    constructor(dpi, dotPercent) {
        // Step 1: Calculate the logical cell size
        const cell = new CellDimensions(dotPercent, dpi);

        // --- Core C Calculation (Pitch) ---
        // Block Pitch = (NDOT + 3) * dotCellSize;
        const blockPitchX = (NDOT + 3) * cell.width.pixels;
        const blockPitchY = (NDOT + 3) * cell.height.pixels;

        // The block pitch values are passed to the base class, making them accessible via:
        // this.width.pixels (blockPitchX) and this.height.pixels (blockPitchY).
        super(blockPitchX, blockPitchY, dpi);

        // Assign calculated properties
        this.cell = cell;
    }
}