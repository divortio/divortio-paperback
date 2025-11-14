
import { GridBlockDimensions } from './base/gridBlockDimensions.js';
import {BlockDimensions} from "./blockDimensions.js";


/**
 * @augments GridBlockDimensions
 */
export class GridDimensions extends GridBlockDimensions {

    /**
     * Composite object containing the dimensions of a grid block, cell, and mark
     * @public
     * @type {BlockDimensions}
     */
    block;

    /**
     * @public
     * @type {number}
     */
    borderPixels;

    /**
     * @param {number} [widthPixels] - paper width in pixels
     * @param {number} [heightPixels] -paper height in pixels
     * @param {number} [dpi] - Target resolution in dots per inch.
     * @param {number} [dotPercent] - Percentage in whole integer of cell size to use as dot mark
     * @param {boolean} [border=true] -
     */
    constructor(widthPixels,
                heightPixels,
                dpi,
                dotPercent,
                border = true) {

        // const printDot = new CellDimensions(dpi, dotPercent);
        // const printDotMark = new DotDimensions(dpi, printDot.cell.width.pixels, printDot.cell.height.pixels, dotPercent);
        const gridBlock = new BlockDimensions(dpi, dotPercent);

        const borderPixels = border === true ? (gridBlock.cell.width.pixels  * 16) : 0;
        const blocksX = Math.floor((widthPixels- gridBlock.cell.mark.width.pixels - (2 * borderPixels)) / gridBlock.width.pixels);
        const blocksY = Math.floor((heightPixels - gridBlock.cell.mark.height.pixels - (2 * borderPixels)) / gridBlock.height.pixels);

        // Final Alignment: width=(X+3) & 0xFFFFFFFC;
        const adjWidthPixels = (widthPixels + 3) & 0xFFFFFFFC;
        const adjHeightPixels = (heightPixels * gridBlock.height + gridBlock.cell.mark.height.pixels  + 2 * borderPixels);

        super(adjWidthPixels, adjHeightPixels, blocksX, blocksY, borderPixels, dpi);
        this.block = gridBlock;
        this.borderPixels = borderPixels;
    }
}