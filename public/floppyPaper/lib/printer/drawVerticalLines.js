// Assuming NDOT is imported from a constants file (value 32)
const NDOT = 32;

// The color value used for the dots when outputting to a bitmap file (Dark Gray)
const BLACK_COLOR = 64;

/**
 * Draws all vertical grid lines onto the pixel buffer based on page geometry.
 *
 * @param {Uint8Array} bits - The raw pixel buffer (drawbits) to modify.
 * @param {number} nx - The number of blocks that fit horizontally (blocksX).
 * @param {number} ny - The number of blocks that fit vertically (blocksY).
 * @param {number} dx - The horizontal distance between dots (dotCellSizeX).
 * @param {number} dy - The vertical distance between dots (dotCellSizeY).
 * @param {number} px - The thickness of the horizontal line dot mark (dotMarkSizeX).
 * @param {number} py - The thickness of the vertical line dot mark (dotMarkSizeY), used in border calculation.
 * @param {number} width - The final image width/stride (finalImageWidth).
 * @param {number} border - The pixel width of the grid border (gridBorderPixels).
 * @param {boolean} printBorderEnabled - Flag indicating if the border is being printed (printborder).
 * @returns {Uint8Array} The modified pixel buffer (bits).
 * @see C_EQUIVALENT: Vertical drawing loop in Printnextpage (Printer.c)
 */
export function drawVerticalLines(
    bits,
    nx,
    ny,
    dx,
    dy,
    px,
    py,
    width,
    border,
    printBorderEnabled
) {
    let i, j, k;
    let basex;
    let max_j_loop;

    for (i = 0; i <= nx; i++) {

        if (printBorderEnabled) {
            // --- Border ENABLED Logic ---
            basex = i * (NDOT + 3) * dx + border;
            max_j_loop = ny * (NDOT + 3) * dy + py + 2 * border;

            for (j = 0; j < max_j_loop; j++) {
                for (k = 0; k < px; k++) {
                    const pixelIndex = basex + k;
                    if (pixelIndex < bits.length) {
                        bits[pixelIndex] = BLACK_COLOR; // Use 64
                    }
                }
                basex += width;
            }
        }
        else {
            // --- Border DISABLED Logic ---
            basex = i * (NDOT + 3) * dx + width * border + border;
            max_j_loop = ny * (NDOT + 3) * dy;

            for (j = 0; j < max_j_loop; j++) {
                for (k = 0; k < px; k++) {
                    const pixelIndex = basex + k;
                    if (pixelIndex < bits.length) {
                        bits[pixelIndex] = BLACK_COLOR; // Use 64
                    }
                }
                basex += width;
            }
        }
    }
    return bits;
}