// src/printer/fillBlock.js

import { NDOT } from '../include/paperbak/constants.js';

/**
 * Fills a block area with a regular alignment raster pattern, clipping to the bitmap edges.
 * Used for drawing the page borders.
 * @param {number} blockx - The horizontal coordinate of the block (can be negative).
 * @param {number} blocky - The vertical coordinate of the block (can be negative).
 * @param {Uint8Array} bits - The pixel buffer of the bitmap to draw on.
 * @param {number} width - The total width of the bitmap in pixels.
 * @param {number} height - The total height of the bitmap in pixels.
 * @param {number} border - The border size around the grid in pixels.
 * @param {number} nx - The number of data blocks horizontally on the page.
 * @param {number} ny - The number of data blocks vertically on the page.
 * @param {number} dx - The horizontal distance between dots (dot pitch).
 * @param {number} dy - The vertical distance between dots (dot pitch).
 * @param {number} px - The width of a single dot in pixels.
 * @param {number} py - The height of a single dot in pixels.
 * @param {number} black - The grayscale value for a black dot (0-255).
 */
export function fillBlock(blockx, blocky, bits, width, height, border, nx, ny, dx, dy, px, py, black) {
    // Calculate the top-left pixel coordinate of the block.
    const x0 = blockx * (NDOT + 3) * dx + 2 * dx + border;
    const y0 = blocky * (NDOT + 3) * dy + 2 * dy + border;

    // Draw the 32x32 raster, row by row.
    for (let j = 0; j < 32; j++) {
        let t;
        // Generate the checkerboard pattern.
        if ((j & 1) === 0) {
            t = 0x55555555;
        } else {
            if (blocky < 0 && j <= 24) t = 0;
            else if (blocky >= ny && j > 8) t = 0;
            else if (blockx < 0) t = 0xAA000000;
            else if (blockx >= nx) t = 0x000000AA;
            else t = 0xAAAAAAAA;
        }

        for (let i = 0; i < 32; i++) {
            if (t & 1) {
                // Draw a px-by-py rectangle for each dot, with clipping.
                for (let m = 0; m < py; m++) {
                    for (let n = 0; n < px; n++) {
                        const x = x0 + i * dx + n;
                        const y = y0 + j * dy + m;

                        // Clip the dot to the bitmap boundaries.
                        if (x < 0 || x >= width || y < 0 || y >= height) {
                            continue;
                        }

                        const pixelIndex = (height - y - 1) * width + x;
                        bits[pixelIndex] = black;
                    }
                }
            }
            t >>>= 1; // Unsigned right shift for the next bit.
        }
    }
}