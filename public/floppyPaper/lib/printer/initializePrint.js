// public/js/lib/printer/initializePrint.js

import { Reporterror } from '../logging/log.js';
import {
    SUPERBLOCK,
    PBM_COMPRESSED,
    PBM_ENCRYPTED,
    NDATA,
    NDOT,
    FILENAME_SIZE, // Should be 64
    PASSLEN, // Should be 33
} from '../primitives/constants.js';
import { pb } from '../primitives/pb.js';
import { min, max } from '../primitives/utils.js';
import { Stopprinting } from './print.js';

/**
 * Prepares for printing by calculating all layout parameters and creating the bitmap structure.
 * @param {object} print - The main print data object.
 */
export function initializePrinting(print) {
    // 1. Prepare the superblock data structure.
    // This is a 128-byte buffer to match C's t_data/t_superdata union.
    const superBlockBuffer = new ArrayBuffer(128);
    const superBlockView = new DataView(superBlockBuffer);
    const superBlockBytes = new Uint8Array(superBlockBuffer);

    // --- C: print->superdata.addr=SUPERBLOCK;
    superBlockView.setUint32(0, SUPERBLOCK, true);
    // --- C: print->superdata.datasize=print->alignedsize;
    superBlockView.setUint32(4, print.alignedsize, true);
    // --- C: print->superdata.origsize=print->origsize;
    superBlockView.setUint32(12, print.origsize, true);

    // --- C: print->superdata.mode|=PBM_COMPRESSED;
    let mode = 0;
    if (print.compression) mode |= PBM_COMPRESSED;
    if (print.encryption) mode |= PBM_ENCRYPTED;
    superBlockBytes[16] = mode; // mode is 1 byte

    // --- C: print->superdata.attributes=(uchar)(print->attributes & ...);
    // We'll follow the JS logic and set attributes to 0 for simplicity.
    superBlockBytes[17] = 0; // attributes is 1 byte

    // --- C: print->superdata.page=... (This is set in printPage)
    // --- C: print->superdata.modified=print->modified;
    // JS timestamp is ms since epoch. C FILETIME is 100ns intervals since 1601.
    // This requires a conversion, but for now, we'll store the JS timestamp.
    // NOTE: This will break C compatibility unless the decoder is also JS.
    // We'll store it as a 64-bit float (best we can do without BigInt).
    superBlockView.setFloat64(20, print.modified, true); // 8 bytes for modified

    // --- C: print->superdata.filecrc=(ushort)print->bufcrc;
    superBlockView.setUint16(28, print.bufcrc, true); // 2 bytes for filecrc

    // --- C: strncpy(print->superdata.name,fil,dataSize);
    // This is the 64-byte field used for name, salt, and iv.
    // We get the TextEncoder from the global scope (assuming it's loaded).
    const encoder = new TextEncoder();
    const encodedName = encoder.encode(print.infile);

    // Copy filename (max 32 bytes)
    const nameLen = Math.min(encodedName.length, 32);
    superBlockBytes.set(encodedName.subarray(0, nameLen), 30); // Offset 30 for name[64]

    if (print.encryption) {
        // --- THIS IS THE FIX ---
        // Copy the salt and iv from the print object into the superblock
        // C: salt=(uchar *)(pf->name)+32;
        // C: memcpy(iv, salt+16, 16);
        if (print.salt && print.iv) {
            superBlockBytes.set(print.salt, 30 + 32); // Offset 62 (name[32])
            superBlockBytes.set(print.iv, 30 + 32 + 16); // Offset 78 (name[48])
        } else {
            throw new Error("Encryption enabled, but salt and iv are missing from print object.");
        }
    }

    // --- Save the buffer to the print object ---
    // This `superBlockBuffer` is what printPage.js will use
    print.superBlockBuffer = superBlockBuffer;

    // 2. Calculate bitmap dimensions based on DPI and paper size (using A4 as default).
    const ppix = pb.dpi;
    const ppiy = pb.dpi;

    // C: width=print->ppix*8270/1000;
    // C: height=print->ppiy*11690/1000;
    // Using A4 paper as default (210x297 mm -> 8.27 x 11.69 in)
    let width = Math.floor(ppix * 8.27);
    let height = Math.floor(ppiy * 11.69);

    // 3. Calculate page borders (using C code's defaults)
    // C: print->borderleft=print->ppix;
    // C: print->borderright=print->ppix/2;
    // C: print->bordertop=print->ppiy/2;
    // C: print->borderbottom=print->ppiy/2;
    const borderleft = ppix;
    const borderright = Math.floor(ppix / 2);
    const bordertop = Math.floor(ppiy / 2);
    const borderbottom = Math.floor(ppiy / 2);

    // 4. Calculate drawable area
    // C: width-= print->borderleft+print->borderright;
    width -= (borderleft + borderright);
    // C: height-= print->bordertop+print->borderbottom+...
    height -= (bordertop + borderbottom); // JS has no header/footer

    // 5. Calculate dot and grid dimensions
    // C: dx=max(print->ppix/pb_dpi,2);
    const dx = max(Math.floor(ppix / pb.dpi), 2);
    // C: px=max((dx*pb_dotpercent)/100,1);
    const px = max(Math.floor((dx * pb.dotpercent) / 100), 1);
    // C: dy=max(print->ppiy/pb_dpi,2);
    const dy = max(Math.floor(ppiy / pb.dpi), 2);
    // C: py=max((dy*pb_dotpercent)/100,1);
    const py = max(Math.floor((dy * pb.dotpercent) / 100), 1);

    // C: if (print->printborder) print->border=dx*16;
    // C: else if (print->outbmp[0]!='\0') print->border=25;
    // C: else print->border=0;
    const border = print.printborder ? (dx * 16) : 25;

    // C: nx=(width-px-2*print->border)/(NDOT*dx+3*dx);
    const nx = Math.floor((width - px - 2 * border) / (NDOT * dx + 3 * dx));
    // C: ny=(height-py-2*print->border)/(NDOT*dy+3*dy);
    const ny = Math.floor((height - py - 2 * border) / ((NDOT + 3) * dy));

    if (nx < print.redundancy + 1 || ny < 3 || nx * ny < 2 * print.redundancy + 2) {
        const errorMsg = "Printable area is too small. Reduce DPI or increase paper size.";
        Stopprinting(print); // Assuming Stopprinting is available
        throw new Error(errorMsg);
    }

    // 6. Calculate the final *max* bitmap dimensions
    // C: width=(nx*(NDOT+3)*dx+px+2*print->border+3) & 0xFFFFFFFC;
    width = (nx * (NDOT + 3) * dx + px + 2 * border + 3) & ~3; // ~3 is 0xFFFFFFFC
    // C: height=ny*(NDOT+3)*dy+py+2*print->border;
    height = ny * (NDOT + 3) * dy + py + 2 * border;

    // 7. Calculate the total size of useful data that fits on one page.
    const blocksPerPage = nx * ny;
    const groupsPerPage = Math.floor((blocksPerPage - print.redundancy - 2) / (print.redundancy + 1));
    // C: print->pagesize=((nx*ny-print->redundancy-2)/(print->redundancy+1))* print->redundancy*NDATA;
    print.pagesize = groupsPerPage * print.redundancy * NDATA;
    // C: print->superdata.pagesize=print->pagesize;
    superBlockView.setUint32(8, print.pagesize, true); // Write pagesize to buffer

    // 8. Save all calculated parameters to the print object.
    print.ppix = ppix;
    print.ppiy = ppiy;
    print.width = width;     // Max width
    print.height = height;   // Max height
    print.dx = dx;
    print.dy = dy;
    print.px = px;
    print.py = py;
    print.nx = nx;
    print.ny = ny;       // Max rows
    print.border = border;
    print.black = 64; // C: print->black=64; (for bitmap)

    // 9. Move to the next step
    print.step = 7; // Move to printNextPage
}