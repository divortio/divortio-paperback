// Assuming NDOT is imported from a constants file (value 32)
const NDOT = 32;

/**
 * Fills a block area with a regular alignment raster pattern, clipping to the bitmap edges.
 * (The pixel-drawing logic for a single block slot).
 *
 * @param {number} blockx - The horizontal coordinate of the block (can be negative).
 * @param {number} blocky - The vertical coordinate of the block (can be negative).
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
 * @see C_EQUIVALENT: Fillblock(int blockx, int blocky, ...) in Printer.c
 */
export function fillBlock(
    blockx,
    blocky,
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
    let i, j, x0, y0, m, n;
    let t;

    // Calculate Initial Pixel Offset
    x0 = blockx * (NDOT + 3) * dx + 2 * dx + border;
    y0 = blocky * (NDOT + 3) * dy + 2 * dy + border;

    let bitsOffset = (height - y0 - 1) * width + x0;

    // Drawing Loop
    for (j = 0; j < 32; j++) {

        // --- Determine the XOR Pattern (t) ---
        if ((j & 1) === 0) {
            t = 0x55555555;
        } else {
            // C's complex edge detection logic for odd rows:
            if (blocky < 0 && j <= 24) {
                t = 0;
            } else if (blocky >= ny && j > 8) {
                t = 0;
            } else if (blockx < 0) {
                t = 0xAA000000;
            } else if (blockx >= nx) {
                t = 0x000000AA;
            } else {
                t = 0xAAAAAAAA;
            }
        }

        // --- Draw Pixels for the Row ---
        let x = 0;
        for (i = 0; i < 32; i++) {

            if (t & 1) {
                // Draw the dot mark (px * py pixels)
                for (m = 0; m < py; m++) {
                    for (n = 0; n < px; n++) {
                        const pixelIndex = bitsOffset + x - (m * width) + n;

                        // Explicit bounds check for JavaScript safety and C clipping parity.
                        if (
                            pixelIndex >= 0 && pixelIndex < bits.length &&
                            (x0 + x + n) < width &&
                            (y0 + j + m) < height
                        ) {
                            bits[pixelIndex] = blackValue;
                        }
                    }
                }
            }

            t = t >>> 1;
            x += dx;
        }

        // bits-=dy*width; (Move the base offset up one block row)
        bitsOffset -= dy * width;
    }

    return bits;
}