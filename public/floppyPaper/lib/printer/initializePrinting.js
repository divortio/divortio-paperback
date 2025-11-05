/**
 * @file initializePrinting.js
 * @overview
 * Implements the logic for State 6 (Initializeprinting) of the encoding pipeline.
 * This routine prepares the final HeaderBlock metadata, calculates the required
 * dimensions for the data grid (nx, ny), determines the size of the output bitmap,
 * and allocates the final drawing buffer.
 *
 * C Reference:
 * - Function: Initializeprinting (in Printer.c)
 * - State: 6 (Initialize printing)
 */
import { Reporterror, Message } from '../logging/log.js';
import { Stopprinting } from './print.js';
import { PBM_COMPRESSED, PBM_ENCRYPTED, SUPERBLOCK, NDOT, NDATA, FILENAME_SIZE } from '../classes/constants.js';

// --- Global helper function equivalents ---
function max(a, b) { return a > b ? a : b; }
function min(a, b) { return a < b ? a : b; }

// Helper: Emulates C's complex fnsplit/fnmerge logic to get the final filename for the header.
function fnsplit(path) {
    const parts = path.split(/[/\\]/);
    const fullFileName = parts.pop() || 'backup';

    return { full: fullFileName };
}

/**
 * Prepares the final print job parameters, calculates grid dimensions, and allocates the drawing surface.
 * Completes EncoderState step 6.
 *
 * @param {EncoderState} encoderState - The main state object (t_printdata).
 * @param {GlobalState} globalState - Global configuration variables (pb_dpi, pb_resx, etc.).
 * @returns {void}
 * @see C_EQUIVALENT: Initializeprinting (in Printer.c)
 */
export function initializePrinting(encoderState, globalState) {
    let width, height, dx, dy, px, py, nx, ny;

    // --- 1. Prepare Header Block (t_superdata) ---
    encoderState.superdata.addr = SUPERBLOCK;
    encoderState.superdata.datasize = encoderState.alignedsize;
    encoderState.superdata.origsize = encoderState.origsize;

    // Apply mode flags using bitwise OR
    if (encoderState.compression) {
        encoderState.superdata.mode |= PBM_COMPRESSED;
    }
    if (encoderState.encryption) {
        encoderState.superdata.mode |= PBM_ENCRYPTED;
    }

    // Copy other data
    encoderState.superdata.attributes = encoderState.attributes;
    encoderState.superdata.modified = encoderState.modified;
    encoderState.superdata.filecrc = encoderState.bufcrc;

    // Set file name
    const fileParts = fnsplit(encoderState.infile);
    const truncatedName = fileParts.full.substring(0, FILENAME_SIZE);
    encoderState.superdata.name = truncatedName;

    Message(`Encoding ${truncatedName} to bitmap`, 0);

    // --- 2. Determine Printer Settings & Output Mode ---

    if (encoderState.outbmp.length === 0) {
        Reporterror("Print job creation is disabled");
        Stopprinting(encoderState);
        return;
    }

    // Set Resolution (DPI) based on global state, prioritizing user-set DPI (globalState.dpi)
    const setDpi = globalState.dpi || 300; // Use 300 DPI if globalState.dpi is 0 or unset

    if (globalState.resx === 0 || globalState.resy === 0) {
        // Use user-set DPI for the pixel resolution (ppix/ppiy)
        encoderState.ppix = setDpi;
        encoderState.ppiy = setDpi;
    } else {
        // Use printer resolution if explicitly detected (C's original logic)
        encoderState.ppix = globalState.resx;
        encoderState.ppiy = globalState.resy;
    }

    // Calculate page size in pixels based on US Letter (8.5 x 11.0 inches) default
    // Dimensions are expressed in thousandths of an inch (1 inch = 1000)

    /* Original C A4 Dimensions (210mm x 297mm):
     * width = Math.floor(encoderState.ppix * 8270 / 1000);
     * height = Math.floor(encoderState.ppiy * 11690 / 1000);
     */

    // US Letter (8.5" x 11.0" = 8500 x 11000 thousandths of inch)
    width = Math.floor(encoderState.ppix * 8500 / 1000);
    height = Math.floor(encoderState.ppiy * 11000 / 1000);

    encoderState.black = 64; // Dark gray for high-contrast bitmap output

    // --- 3. Calculate Margins and Printable Area ---

    // Set fixed margins (C defaults)
    encoderState.borderleft = encoderState.ppix;
    encoderState.borderright = encoderState.ppix / 2;
    encoderState.bordertop = encoderState.ppiy / 2;
    encoderState.borderbottom = encoderState.ppiy / 2;

    encoderState.extratop = 0;
    encoderState.extrabottom = 0;

    // Calculate effective printable area
    width -= (encoderState.borderleft + encoderState.borderright);
    height -= (encoderState.bordertop + encoderState.borderbottom + encoderState.extratop + encoderState.extrabottom);

    // --- 4. Calculate Dot Raster and Size (dx, dy, px, py) ---

    // Raster distance (dx/dy, min 2 pixels)
    // Note: C uses 'pb_dpi' (globalState.dpi) here for the dot raster calculation, NOT ppix/ppiy.
    const dotDpi = globalState.dpi || 200; // Use default 200 if unset

    dx = max(Math.floor(encoderState.ppix / dotDpi), 2);
    dy = max(Math.floor(encoderState.ppiy / dotDpi), 2);

    // Dot size (px/py, min 1 pixel)
    px = max(Math.floor((dx * globalState.dotPercent) / 100), 1);
    py = max(Math.floor((dy * globalState.dotPercent) / 100), 1);

    // Calculate border width around grid
    if (encoderState.printborder) {
        encoderState.border = dx * 16;
    } else if (encoderState.outbmp.length !== 0) {
        encoderState.border = 25;
    } else {
        encoderState.border = 0;
    }

    // --- 5. Calculate Data Grid Dimensions (nx, ny) ---
    nx = Math.floor((width - px - 2 * encoderState.border) / (NDOT * dx + 3 * dx));
    ny = Math.floor((height - py - 2 * encoderState.border) / (NDOT * dy + 3 * dy));

    if (nx < encoderState.redundancy + 1 || ny < 3 || nx * ny < 2 * encoderState.redundancy + 2) {
        Reporterror("Printable area is too small, reduce margins or DPI/dot size settings.");
        Stopprinting(encoderState);
        return;
    }

    // --- 6. Calculate Final Bitmap Size and Allocate Drawing Buffer ---
    width = (nx * (NDOT + 3) * dx + px + 2 * encoderState.border + 3) & 0xFFFFFFFC;
    height = ny * (NDOT + 3) * dy + py + 2 * encoderState.border;

    encoderState.drawbits = new Uint8Array(width * height);

    if (encoderState.drawbits.length === 0) {
        Reporterror("Low memory, can't create bitmap buffer.");
        Stopprinting(encoderState);
        return;
    }

    // 7. Calculate Pagesize (Maximum data that fits on a page)
    encoderState.pagesize = Math.floor(
        (nx * ny - encoderState.redundancy - 2) / (encoderState.redundancy + 1)
    ) * encoderState.redundancy * NDATA;

    encoderState.superdata.pagesize = encoderState.pagesize;

    // 8. Save Calculated Parameters
    encoderState.width = width;
    encoderState.height = height;
    encoderState.dx = dx;
    encoderState.dy = dy;
    encoderState.px = px;
    encoderState.py = py;
    encoderState.nx = nx;
    encoderState.ny = ny;

    // 9. Advance State (Step finished -> Printnextpage)
    encoderState.step = 7;
}