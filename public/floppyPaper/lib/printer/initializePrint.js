// public/js/lib/printer/initializePrint.js

import { Reporterror } from '../logging/log.js';
import {
    SUPERBLOCK,
    PBM_COMPRESSED,
    PBM_ENCRYPTED,
    NDATA,
    NDOT
} from '../primitives/constants.js';
import {pb} from '../primitives/pb.js';
import {min, max} from '../primitives/utils.js';
import { Stopprinting } from './print.js';

/**
 * Prepares for printing by calculating all layout parameters and creating the bitmap structure.
 * @param {object} print - The main print data object.
 */
export function initializePrinting(print) {
    // 1. Prepare the superblock data structure.
    const superdata = {};
    superdata.addr = SUPERBLOCK;
    superdata.datasize = print.alignedsize;
    superdata.origsize = print.origsize;

    let mode = 0;
    if (print.compression) mode |= PBM_COMPRESSED;
    if (print.encryption) mode |= PBM_ENCRYPTED;
    superdata.mode = mode;

    superdata.attributes = 0;
    superdata.modified = print.modified;
    superdata.filecrc = print.bufcrc;
    superdata.name = print.infile.slice(0, 32); // Reserve space for salt/iv
    print.superdata = superdata;

    // 2. Calculate bitmap dimensions based on DPI and paper size (using A4 as default).
    const ppix = pb.dpi;
    const ppiy = pb.dpi;

    const page_width_pixels = ppix * 8.27;
    const page_height_pixels = ppiy * 11.69;
    const margin_pixels_x = ppix * 0.5;
    const margin_pixels_y = ppiy * 0.5;

    let width = page_width_pixels - (2 * margin_pixels_x);
    let height = page_height_pixels - (2 * margin_pixels_y);

    // 3. Calculate dot raster (dx, dy) and dot size (px, py).
    const dx = max(Math.floor(ppix / pb.dpi), 2);
    const px = max(Math.floor((dx * pb.dotpercent) / 100), 1);
    const dy = max(Math.floor(ppiy / pb.dpi), 2);
    const py = max(Math.floor((dy * pb.dotpercent) / 100), 1);

    // 4. Calculate border size.
    let border = print.printborder ? dx * 16 : 25;

    // 5. Calculate the number of data blocks that fit onto a single page.
    const nx = Math.floor((width - px - 2 * border) / ((NDOT + 3) * dx));
    const ny = Math.floor((height - py - 2 * border) / ((NDOT + 3) * dy));

    if (nx < print.redundancy + 1 || ny < 3 || nx * ny < 2 * print.redundancy + 2) {
        const errorMsg = "Printable area is too small. Reduce DPI or increase paper size.";
        Stopprinting(print); // Assuming Stopprinting is available
        throw new Error(errorMsg);
    }

    // 6. Calculate the final bitmap dimensions, aligned to 4 bytes for the width.
    width = (nx * (NDOT + 3) * dx + px + 2 * border + 3) & ~3;
    height = ny * (NDOT + 3) * dy + py + 2 * border;

    // 7. Calculate the total size of useful data that fits on one page.
    const blocksPerPage = nx * ny;
    const groupsPerPage = Math.floor((blocksPerPage - print.redundancy - 2) / (print.redundancy + 1));
    print.pagesize = groupsPerPage * print.redundancy * NDATA;
    superdata.pagesize = print.pagesize;

    // 8. Save all calculated parameters to the print object.
    print.ppix = ppix;
    print.ppiy = ppiy;
    print.width = width;
    print.height = height;
    print.dx = dx;
    print.dy = dy;
    print.px = px;
    print.py = py;
    print.nx = nx;
    print.ny = ny;
    print.border = border;

    // --- START OF FIX ---
    // Changed the dot color from dark gray (64) to pure black (0).
    // This provides the maximum possible contrast for the decoder.
    print.black = 0;
    // --- END OF FIX ---

    print.frompage = 0;
    print.topage = Math.ceil(print.datasize / print.pagesize) -1;

    print.step++;
}