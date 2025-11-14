import {GridDimensions} from "./gridDimensions.js";

/**
 * The fixed data payload size of a single block in bytes.
 * NDATA = 90 bytes of compressed/encrypted data.
 * @type {number}
 * @const
 */
const NDATA = 90;


/**
 * @augments GridDimensions
 */
export class ImageDimensions extends GridDimensions {

    /**
     * The data redundancy ratio (pb_redundancy).
     * @type {number}
     */
    redundancy;

    /**
     * The maximum number of useful compressed bytes that fit on the page (print->pagesize).
     * @type {number}
     */
    pagesize;

    /**
     * @param widthPixels {number} - paper width in pixels
     * @param heightPixels {number} - paper height in pixels
     * @param redundancy {number} - The data redundancy ratio (pb_redundancy).
     * @param dotPercent {number} - Percentage in whole integer of cell size to use as dot mark
     * @param dpi {number} - Target resolution in dots per inch.
     * @param border {boolean=true}
     */
    constructor(widthPixels, heightPixels, redundancy= 5, dotPercent=70,  dpi=300,border=true) {

        super(widthPixels, heightPixels, dpi, dotPercent, border);

        const numerator = this.totalBlocks - redundancy - 2;
        const denominator = redundancy + 1;
        this.pagesize = Math.floor(numerator / denominator) * redundancy * NDATA;
        this.redundancy = redundancy;
    }

}



