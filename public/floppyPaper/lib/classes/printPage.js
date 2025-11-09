/**
 * @fileoverview Encapsulates all geometric and capacity calculations for the
 * PaperBack encoding process, mirroring the logic of the C source's
 * Initializeprinting function (for bitmap output).
 * * It determines the precise pixel dimensions of the output image, the arrangement
 * of data blocks, and the maximum payload capacity per page, accounting for
 * redundancy and overhead.
 */

/**
 * The fixed data payload size of a single block in bytes.
 * NDATA = 90 bytes of compressed/encrypted data.
 * @type {number}
 * @const
 */
const NDATA = 90;

/**
 * Calculates all dimensions for the paper backup encoding process,
 * mirroring the exact logic and sequencing of the C source code (Printer.c).
 */
export class PrintPage {
    /**
     * Global constant for the block size in dots (32x32).
     * @type {number}
     * @const
     */
    static NDOT = 32;

    // --- Private Property for Lazy Initialization ---

    /**
     * The allocated raw pixel buffer (drawbits). Initialized only when the getter is called.
     * @private
     * @type {Uint8Array | null}
     */
    _drawbits = null;

    // --- Public Properties (Built-in Types Only) ---

    /**
     * The horizontal size of a logical dot cell in pixels (dx).
     * @type {number}
     */
    dotCellSizeX;

    /**
     * The vertical size of a logical dot cell in pixels (dy).
     * @type {number}
     */
    dotCellSizeY;

    /**
     * The horizontal size of the actual printed dot mark in pixels (px).
     * @type {number}
     */
    dotMarkSizeX;

    /**
     * The vertical size of the actual printed dot mark in pixels (py).
     * @type {number}
     */
    dotMarkSizeY;

    /**
     * The pixel width of the border around the data grid (print->border).
     * @type {number}
     */
    gridBorderPixels;

    /**
     * The calculated number of data blocks that fit horizontally (nx).
     * @type {number}
     */
    blocksX;

    /**
     * The calculated number of data blocks that fit vertically (ny).
     * @type {number}
     */
    blocksY;

    /**
     * The data redundancy ratio (pb_redundancy).
     * @type {number}
     */
    redundancy;

    /**
     * The final, 4-byte aligned pixel width of the output image.
     * @type {number}
     */
    finalImageWidth;

    /**
     * The final pixel height of the output image.
     * @type {number}
     */
    finalImageHeight;

    /**
     * The maximum number of useful compressed bytes that fit on the page (print->pagesize).
     * @type {number}
     */
    pagesize;

    /**
     * The total size of the output BMP file in bytes.
     * Calculated as: 1078 (Header + Palette) + (Final Width * Final Height).
     * @type {number}
     */
    imageSizeBytes;

    // --- Utility Methods ---

    /**
     * Replicates the C max macro behavior.
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    _max(a, b) {
        return a > b ? a : b;
    }

    /**
     * Replicates the C min macro behavior.
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    _min(a, b) {
        return a < b ? a : b;
    }

    /**
     * @param {number} [dpi=200] - Target and Raster resolution in dots per inch. (pb_dpi, print->ppix)
     * @param {number} [dotPercent=70] - Dot size as a percentage of cell size. (pb_dotpercent)
     * @param {boolean} [printBorderEnabled=false] - If the surrounding raster border is enabled. (pb_printborder)
     * @param {number} [redundancy=5] - Data redundancy ratio (e.g., 5 means 5 data blocks for 1 recovery block). (pb_redundancy)
     */
    constructor(
        dpi = 200,
        dotPercent = 70,
        printBorderEnabled = false,
        redundancy = 5
    ) {
        // --- Initialization Parameters ---
        const targetDpiX = dpi;
        const targetDpiY = dpi;
        const rasterDpi = dpi;

        // A4 Size in Pixels (width, height)
        let width = Math.floor((targetDpiX * 8270) / 1000);
        let height = Math.floor((targetDpiY * 11690) / 1000);

        // Margins (ppix, ppiy)
        const borderLeft = targetDpiX;
        const borderRight = Math.floor(targetDpiX / 2);
        const borderTop = Math.floor(targetDpiY / 2);
        const borderBottom = Math.floor(targetDpiY / 2);

        const extraTop = 0; // extratop and extrabottom are 0 when printing to bitmap
        const extraBottom = 0;

        // --- Calculate Printable Area (width, height) ---
        width -= (borderLeft + borderRight);
        height -= (borderTop + borderBottom + extraTop + extraBottom);

        // --- 1. Calculate Dot Cell Size (dx, dy) ---
        const dotCellSizeX = this._max(Math.floor(targetDpiX / rasterDpi), 2);
        const dotCellSizeY = this._max(Math.floor(targetDpiY / rasterDpi), 2);

        // --- 2. Calculate Dot Mark Size (px, py) ---
        const dotMarkSizeX = this._max(Math.floor((dotCellSizeX * dotPercent) / 100), 1);
        const dotMarkSizeY = this._max(Math.floor((dotCellSizeY * dotPercent) / 100), 1);

        // --- 3. Calculate Grid Border (print->border) ---
        const gridBorderPixels = printBorderEnabled ? (dotCellSizeX * 16) : 25;

        // --- 4. Calculate Block Pitch and Block Count (nx, ny) ---
        const blockPitchX = (PrintPage.NDOT + 3) * dotCellSizeX;
        const blockPitchY = (PrintPage.NDOT + 3) * dotCellSizeY;

        const blocksX = Math.floor((width - dotMarkSizeX - (2 * gridBorderPixels)) / blockPitchX);
        const blocksY = Math.floor((height - dotMarkSizeY - (2 * gridBorderPixels)) / blockPitchY);

        // --- 5. Calculate Final Image Dimensions (width, height) ---
        const unalignedWidth = (blocksX * blockPitchX + dotMarkSizeX + 2 * gridBorderPixels);

        // Final Alignment: width=(X+3) & 0xFFFFFFFC;
        const finalImageWidth = (unalignedWidth + 3) & 0xFFFFFFFC;
        const finalImageHeight = (blocksY * blockPitchY + dotMarkSizeY + 2 * gridBorderPixels);

        // --- 6. Calculate Payload Capacity (pagesize) ---
        const totalBlocks = blocksX * blocksY;
        const numerator = totalBlocks - redundancy - 2;
        const denominator = redundancy + 1;

        const pagesize = Math.floor(numerator / denominator) * redundancy * NDATA;

        // --- 7. Calculate BMP File Size (imageSizeBytes) ---
        const FIXED_BMP_OVERHEAD = 1078;
        const pixelDataSize = finalImageWidth * finalImageHeight;
        const imageSizeBytes = FIXED_BMP_OVERHEAD + pixelDataSize;

        // --- Store Final CamelCase Properties (Public Interface) ---
        this.dotCellSizeX = dotCellSizeX;
        this.dotCellSizeY = dotCellSizeY;
        this.dotMarkSizeX = dotMarkSizeX;
        this.dotMarkSizeY = dotMarkSizeY;
        this.gridBorderPixels = gridBorderPixels;
        this.blocksX = blocksX;
        this.blocksY = blocksY;
        this.redundancy = redundancy;
        this.finalImageWidth = finalImageWidth;
        this.finalImageHeight = finalImageHeight;
        this.pagesize = pagesize;
        this.imageSizeBytes = imageSizeBytes;
    }

    /**
     * Lazily allocates and returns the Uint8Array buffer that holds the raw pixel data (drawbits).
     * This saves memory until the buffer is absolutely needed for drawing.
     * * @returns {Uint8Array} The pixel buffer array, sized (finalImageWidth * finalImageHeight).
     */
    get drawbits() {
        if (this._drawbits === null) {
            const bufferSize = this.finalImageWidth * this.finalImageHeight;
            // The C equivalent uses malloc, but in JS we use new Uint8Array.
            this._drawbits = new Uint8Array(bufferSize);
            // Optionally check size: if (bufferSize === 0) Reporterror("Low memory", etc.)
        }
        return this._drawbits;
    }
}