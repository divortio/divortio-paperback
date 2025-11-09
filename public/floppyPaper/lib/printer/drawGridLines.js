/**
 * @file drawGridLines.js
 * @overview
 * Implements the low-level logic for drawing the explicit vertical and horizontal
 * grid lines and the outer alignment raster borders onto the pixel buffer.
 * This function translates the direct pixel manipulation loops and Fillblock calls
 * from the C source (Printer.c: Printnextpage).
 *
 * @see C_EQUIVALENT: Inlined drawing loops and Fillblock calls in Printer.c:Printnextpage
 */
import { NDOT } from '../classes/constants.js';
import { fillBlock } from './fillBlock.js'; // Assumes Fillblock is available in the same directory

// Local utilities mimicking C macros/functions
function max(a, b) { return a > b ? a : b; }
function min(a, b) { return a < b ? a : b; }

/**
 * Executes all drawing routines for the structural grid layout (lines and borders).
 *
 * @param {EncoderState} encoderState - The main state object.
 * @returns {void}
 */
export function drawGridLines(encoderState) {
    const { dx, dy, px, py, nx, ny, width, border, drawbits: bits, black, height: effectiveHeight } = encoderState;
    let i, j, k, basex;

    // --- 1. Draw Vertical Grid Lines ---
    // C loops iterate over i (columns) and j (rows), drawing px width lines.
    for (i = 0; i <= nx; i++) {
        // Calculate the base X position for the vertical line segment
        // C: basex = i*(NDOT+3)*dx + 2*dx + border;
        basex = i * (NDOT + 3) * dx + border;

        // j iterates over the full vertical extent of the page area
        for (j = 0; j < ny * (NDOT + 3) * dy + py + 2 * border; j++, basex += width) {
            // k iterates for line thickness (px)
            for (k = 0; k < px; k++) {
                const index = basex + k;
                // Check bounds and set pixel to black
                if (index >= 0 && index < bits.length) {
                    bits[index] = black;
                }
            }
        }
    }

    // --- 2. Draw Horizontal Grid Lines ---
    // C loops iterate over j (rows) and k (line thickness), drawing width*height segments.
    for (j = 0; j <= ny; j++) {
        // Calculate the base index for the start of the horizontal line segment in the buffer (y-coordinate)
        const start_pos = (effectiveHeight - 1 - (j * (NDOT + 3) * dy + border)) * width;

        // k iterates for line thickness (py)
        for (k = 0; k < py; k++) {
            let row_start = start_pos - k * width; // Move to the current pixel row for line thickness

            // Draw the line segment in the active area
            if (encoderState.printborder) {
                // Draw full width if border is active
                bits.fill(black, row_start, row_start + width);
            } else {
                // Draw only within the active grid width if no border is active
                const active_start = row_start + border;
                const active_end = active_start + nx * (NDOT + 3) * dx + px;
                bits.fill(black, active_start, active_end);
            }
        }
    }

    // --- 3. Draw Border Raster Pattern (Fillblock calls) ---
    // C: if (print->printborder) { ... }
    if (encoderState.printborder) {
        // Top/Bottom and Left/Right corner raster blocks
        for (j = -1; j <= ny; j++) {
            // Left and Right Borders
            fillBlock(-1, j, bits, width, effectiveHeight, border, nx, encoderState.ny, dx, dy, px, py, black);
            fillBlock(nx, j, bits, width, effectiveHeight, border, nx, encoderState.ny, dx, dy, px, py, black);
        }
        for (i = 0; i < nx; i++) {
            // Top and Bottom Borders
            fillBlock(i, -1, bits, width, effectiveHeight, border, nx, encoderState.ny, dx, dy, px, py, black);
            fillBlock(i, ny, bits, width, effectiveHeight, border, nx, encoderState.ny, dx, dy, px, py, black);
        }
    }
}