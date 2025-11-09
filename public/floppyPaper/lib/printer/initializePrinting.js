/**
 * @file initializePrinting.js
 * @overview
 * Implements the logic for State 6 (Initializeprinting).
 * This structural port uses the original A4 paper dimensions and carefully tracks
 * the 'width' and 'height' variables to ensure final allocation size is correct.
 *
 * C Reference:
 * - Function: Initializeprinting (in Printer.c)
 * - State: 6 (Initialize printing)
 */
import { Reporterror, Message } from '../logging/log.js';
import { stopPrinting } from './stopPrinting.js';
import { PBM_COMPRESSED, PBM_ENCRYPTED, SUPERBLOCK, NDOT, NDATA, FILENAME_SIZE } from '../classes/constants.js';

// --- Global helper function equivalents ---
function max(a, b) { return a > b ? a : b; }
function min(a, b) { return a < b ? a : b; }

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
    let total_paper_height; // Variable to store original height before reuse

    // --- 1. Prepare Header Block (t_superdata) ---
    encoderState.superdata.addr = SUPERBLOCK;
    encoderState.superdata.datasize = encoderState.alignedsize;
    encoderState.superdata.origsize = encoderState.origsize;
    if (encoderState.compression) { encoderState.superdata.mode |= PBM_COMPRESSED; }
    if (encoderState.encryption) { encoderState.superdata.mode |= PBM_ENCRYPTED; }
    encoderState.superdata.attributes = encoderState.attributes;
    encoderState.superdata.modified = encoderState.modified;
    encoderState.superdata.filecrc = encoderState.bufcrc;
    const fileParts = fnsplit(encoderState.infile);
    encoderState.superdata.name = fileParts.full.substring(0, FILENAME_SIZE);
    Message(`Encoding ${encoderState.superdata.name} to bitmap`, 0);

    // --- 2. Determine Resolution and Paper Size (A4 Default) ---
    // const setDpi = globalState.dpi || 300;
    // encoderState.ppix = globalState.resx === 0 || globalState.resy === 0 ? globalState.dpi : globalState.resx;
    // encoderState.ppiy = globalState.resx === 0 || globalState.resy === 0 ? globalState.dpi : globalState.resy;
    encoderState.ppix = globalState.dpi;
    encoderState.ppiy = globalState.dpi;
    // A4 Paper Dimensions (C default: 8270 x 11690 thousandths of inch)
    // C: width=print->ppix*8270/1000; height=print->ppiy*11690/1000;
    width = Math.floor((encoderState.ppix * 8270) / 1000);
    height = Math.floor((encoderState.ppiy * 11690) / 1000);

    // total_paper_height = height; // Store the original full height

    encoderState.black = 64;

    // --- 3. Calculate Margins and Available Area (C Variable Reuse) ---
    encoderState.borderleft = encoderState.ppix;
    encoderState.borderright = encoderState.ppix / 2;
    encoderState.bordertop = encoderState.ppiy / 2;
    encoderState.borderbottom = encoderState.ppiy / 2;
    encoderState.extratop = 0; encoderState.extrabottom = 0;

    // C REUSES width and height to be the AVAILABLE GRID AREA
    width -= (encoderState.borderleft + encoderState.borderright);
    height -= (encoderState.bordertop + encoderState.borderbottom + encoderState.extratop + encoderState.extrabottom);

    // --- 4. Calculate Dot Raster and Size (dx, dy, px, py) ---
    // const dotDpi = globalState.dpi || 200;
    dx = max(Math.floor(encoderState.ppix / globalState.dpi), 2);
    px = max(Math.floor((dx * globalState.dotPercent) / 100), 1);
    dy = max(Math.floor(encoderState.ppiy / globalState.dpi), 2);
    py = max(Math.floor((dy * globalState.dotPercent) / 100), 1);
    encoderState.border = encoderState.printborder ? dx * 16 : 0;

    // --- 5. Calculate Data Grid Dimensions (nx, ny) ---
    // Note: Uses the reduced 'width' and 'height' variables.
    nx = Math.floor((width - px - 2 * encoderState.border) / (NDOT * dx + 3 * dx));
    ny = Math.floor((height - py - 2 * encoderState.border) / (NDOT * dy + 3 * dy));

    if (nx < encoderState.redundancy + 1 || ny < 3 || nx * ny < 2 * encoderState.redundancy + 2) {
        Reporterror("Printable area is too small, reduce borders or block size");
        stopPrinting(encoderState);
        return;
    }

    // --- 6. Calculate Final Allocated Bitmap Size (THE FIX) ---

    // Final Bitmap Width (C: width=(nx*(NDOT+3)*dx+px+2*print->border+3) & 0xFFFFFFFC;)
    width = (nx * (NDOT + 3) * dx + px + 2  * encoderState.border + 3) & 0xFFFFFFFC;
    height = (ny * (NDOT + 3) * dy + py + 2  * encoderState.border) ;

    // Calculate Pagesize (Capacity)
    const current_redundancy = Math.floor(encoderState.redundancy);
    encoderState.pagesize = Math.floor(
        ((nx * ny - current_redundancy - 2) / (current_redundancy + 1)) * current_redundancy * NDATA);

    // Calculate required total pages and set topage (index of the last page)
    const npages_required = Math.ceil(encoderState.alignedsize / encoderState.pagesize);
    encoderState.topage = npages_required > 0 ? npages_required - 1 : 0;

    encoderState.drawbits = new Uint8Array(width * height);
    if (encoderState.drawbits.length === 0) {
        Reporterror("Low memory, can't create bitmap buffer.");
        stopPrinting(encoderState);
        return;
    }

    // --- 7. Save Final Parameters ---
    encoderState.width = width;
    encoderState.height = height; // <-- Final allocated height
    encoderState.dx = dx;
    encoderState.dy = dy;
    encoderState.px = px;
    encoderState.py = py;
    encoderState.nx = nx;
    encoderState.ny = ny;
    encoderState.superdata.pagesize = encoderState.pagesize;

    // 8. Advance State
    encoderState.step = 7;
}