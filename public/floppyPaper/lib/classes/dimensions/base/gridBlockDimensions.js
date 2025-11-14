/**
 * @file gridBlockDimensions.js
 * @overview
 * This class extends the base baseDimensions primitive to store the final calculated
 * physical size and the block count (nx, ny) of the entire data grid area.
 * @augments PixelDimensions
 */

import {BorderDimensions} from "../borderDimensions.js";
import {PixelDimensions} from "./pixelDimensions.js";

export class GridBlockDimensions extends PixelDimensions {

    /**
     * @public
     * @type {number}
     * @description Resolution of the data, dots per inch. (Inherited from baseDimensions)
     */
    dpi;

    /**
     * @public
     * @type {{pixels: number, inches: number, blocks: number}}
     * @description Composite object for width metrics. Includes the calculated horizontal block count (nx).
     */
    width;


    /**
     * @public
     * @type {{pixels: number, inches: number, blocks: number}}
     * @description Composite object for height metrics. Includes the calculated vertical block count (ny).
     */
    height;

    /**
     * @public
     * @type {BorderDimensions}
     * @description Composite object for the width of the border.
     */
    border;

    /**
     * @param {number} widthPixels - The final horizontal pixel dimension of the grid area.
     * @param {number} heightPixels - The final vertical pixel dimension of the grid area.
     * @param {number} widthBlocks - The number of horizontal blocks (nx).
     * @param {number} heightBlocks - The number of vertical blocks (ny).
     * @param {number} borderPixels - The width of the border in number of pixels
     * @param {number} dpi - The resolution (dots per inch).
     */
    constructor(widthPixels,
                heightPixels,
                widthBlocks,
                heightBlocks,
                borderPixels,
                dpi
    ) {

        super(widthPixels, heightPixels, dpi);

        // Add the new block count properties to the composite objects
        this.width.blocks = widthBlocks;
        this.height.blocks = heightBlocks;
        this.border = new BorderDimensions(borderPixels, dpi);
    }

    /**
     * @public
     * @returns {number} The total number of block slots available on the page (nx * ny).
     */
    get totalBlocks() {
        return this.width.blocks * this.height.blocks;
    }

}