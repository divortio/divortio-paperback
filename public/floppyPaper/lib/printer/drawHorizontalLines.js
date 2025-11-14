// Assuming NDOT is imported from a constants file (value 32)
const NDOT = 32;

// The color value used for the dots when outputting to a bitmap file (Dark Gray)
const BLACK_COLOR = 64;

/**
 * Draws all horizontal grid lines onto the pixel buffer based on page geometry.
 *
 * @param {Uint8Array} bits - The raw pixel buffer (drawbits) to modify.
 * @param {number} nx - The number of blocks that fit horizontally (blocksX).
 * @param {number} ny - The number of blocks that fit vertically (blocksY).
 * @param {number} dx - The horizontal distance between dots (dotCellSizeX).
 * @param {number} dy - The vertical distance between dots (dotCellSizeY).
 * @param {number} px - The thickness of the horizontal line dot mark (dotMarkSizeX).
 * @param {number} py - The thickness of the vertical line (dotMarkSizeY).
 * @param {number} width - The final image width/stride (finalImageWidth).
 * @param {number} border - The pixel width of the grid border (gridBorderPixels).
 * @param {boolean} printBorderEnabled - Flag indicating if the border is being printed (printborder).
 * @returns {Uint8Array} The modified pixel buffer (bits).
 * @see C_EQUIVALENT: Horizontal drawing loop in Printnextpage (Printer.c)
 */
export function drawHorizontalLines(
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
    let j, k;
    let line_start_offset;
    let data_area_width;

    // The pixel length of the horizontal line segment to draw when borders are OFF.
    data_area_width = nx * (NDOT + 3) * dx + px;

    // C loop: for (j=0; j<=ny; j++)
    for (j = 0; j <= ny; j++) {

        // C loop: for (k=0; k<py; k++) (Inner loop draws the line for 'py' rows vertically)
        for (k = 0; k < py; k++) {

            // Calculate the row's starting offset based on the vertical position (j) and the line thickness (k).
            line_start_offset = (j * (NDOT + 3) * dy + k + border) * width;

            if (printBorderEnabled) {
                // --- Border ENABLED Logic (Line covers full image width) ---

                // C: memset(bits + offset, 0, width);
                for (let m = 0; m < width; m++) {
                    const pixelIndex = line_start_offset + m;
                    if (pixelIndex < bits.length) {
                        bits[pixelIndex] = BLACK_COLOR; // Use 64
                    }
                }
            }
            else {
                // --- Border DISABLED Logic (Line covers data area only) ---

                // The line starts after the left border offset.
                const start_index = line_start_offset + border;

                // The length is data_area_width
                for (let m = 0; m < data_area_width; m++) {
                    const pixelIndex = start_index + m;
                    if (pixelIndex < bits.length) {
                        bits[pixelIndex] = BLACK_COLOR; // Use 64
                    }
                }
            }
        }
    }
    return bits;
}