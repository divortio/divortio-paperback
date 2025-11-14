// NOTE: Assuming fillBlock is imported from the same directory.
import { fillBlock } from './fillBlock.js';

/**
 * Orchestrates the drawing of the alignment raster in the page borders.
 * Mirrors the conditional loops found in Printnextpage.c.
 *
 * @param {boolean} printBorderEnabled - Flag indicating if the border is being printed.
 * @param {number} blackValue - The pixel intensity value for a "black" dot (e.g., 64).
 * @param {Uint8Array} bits - The raw pixel buffer (drawbits) to modify.
 * @param {number} width - The final image width/stride (finalImageWidth).
 * @param {number} height - The final image height (finalImageHeight).
 * @param {number} border - The pixel width of the grid border (gridBorderPixels).
 * @param {number} nx - The number of blocks that fit horizontally (blocksX).
 * @param {number} ny - The number of blocks that fit vertically (blocksY).
 * @param {number} dx - The horizontal distance between dots (dotCellSizeX).
 * @param {number} dy - The vertical distance between dots (dotCellSizeY).
 * @param {number} px - The width of a single dot mark (dotMarkSizeX).
 * @param {number} py - The height of a single dot mark (dotMarkSizeY).
 * @returns {Uint8Array} The modified pixel buffer (bits).
 * @see C_EQUIVALENT: Border fill loop in Printnextpage (Printer.c)
 */
export function drawAlignmentBlock(
    printBorderEnabled,
    blackValue,
    bits,
    width,
    height,
    border,
    nx,
    ny,
    dx,
    dy,
    px,
    py
) {
    if (printBorderEnabled) {
        // C: for (j=-1; j<=ny; j++) {
        // Draws the left border (blockX = -1) and right border (blockX = nx)
        for (let j = -1; j <= ny; j++) {
            // Draw Left Border: blockX = -1
            fillBlock(-1, j, blackValue, bits, width, height, border, nx, ny, dx, dy, px, py);

            // Draw Right Border: blockX = nx
            fillBlock(nx, j, blackValue, bits, width, height, border, nx, ny, dx, dy, px, py);
        }

        // C: for (i=0; i<nx; i++) {
        // Draws the top border (blockY = -1) and bottom border (blockY = ny)
        for (let i = 0; i < nx; i++) {
            // Draw Top Border: blockY = -1
            fillBlock(i, -1, blackValue, bits, width, height, border, nx, ny, dx, dy, px, py);

            // Draw Bottom Border: blockY = ny
            fillBlock(i, ny, blackValue, bits, width, height, border, nx, ny, dx, dy, px, py);
        }
    }

    // Note: If printBorderEnabled is false, this function does nothing and returns the unmodified 'bits'.
    return bits;
}