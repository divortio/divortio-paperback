// public/js/lib/printer/printPage.js

import { NDATA, NDOT } from '../primitives/constants.js';
import { max, min } from '../primitives/utils.js';
import { drawBlock } from './drawBlock.js';
import { fillBlock } from './fillBlock.js';
// We now import the 8-bit BMP encoder, not fast-png
import { encode } from '../bmpImage/bmpEncode.js';

/**
 * Generates one complete bitmap page as a raw BMP file buffer.
 * This is a direct port of `Printnextpage` from `Printer.c`.
 *
 * @param {object} print - The main print data object.
 * @returns {{bmpBuffer: ArrayBuffer, pageNumber: number, totalPages: number, done: boolean} | {done: boolean}}
 */
export function printNextPage(print) {
    const {
        dx, dy, px, py, nx, ny, width, border, redundancy, black,
        alignedsize, pagesize, superdata, buf,
        frompage, topage
    } = print;


    // C: offset=print->frompage*print->pagesize;
    const offset = frompage * pagesize;
    // C: npages=(print->datasize+print->pagesize-1)/print->pagesize;
    // const totalPages = Math.ceil(print.datasize / pagesize) || 1;
    const totalPages = Math.ceil(print.datasize + print.pagesize - 1 / print.pagesize) || 1;
    // C: if (offset>=print->datasize || print->frompage>print->topage) {
    if (offset >= print.datasize || frompage > topage) {
        console.log(`I'm done: totalPages: ${totalPages}, offset: ${offset}, datasize: ${print.datasize}, pagesize: ${print.pagesize}`);
        return {
            bmpBuffer: null, // Pass the ArrayBuffer
            pageNumber: frompage,
            totalPages: totalPages,
            done: true,
        };
    }

    // --- Start of `Printnextpage` C Logic ---

    // C: l=min(size-offset,pagesize);
    const dataOnPage = min(alignedsize - offset, pagesize);
    // C: n=(l+NDATA-1)/NDATA;
    const dataBlocksOnPage = Math.ceil(dataOnPage / NDATA);
    // C: nstring= (n+redundancy-1)/redundancy;
    const groupsOnPage = Math.ceil(dataBlocksOnPage / redundancy);
    // C: n=(nstring+1)*(redundancy+1)+1;
    const totalBlocksToPrint = (groupsOnPage + 1) * (redundancy + 1) + 1;
    // C: n=max((n+nx-1)/nx,3);
    const needed_rows = max(Math.ceil(totalBlocksToPrint / nx), 3);

    // C: if (ny>n) ny=n;
    // ** THIS IS THE CRITICAL BUG FIX **
    // We must use the MINIMUM of the max rows (ny) and the needed rows (n).
    // Your old code was using the MAX, which was corrupting the height.
    const final_ny = min(ny, needed_rows);

    // C: height=ny*(NDOT+3)*dy+py+2*border;
    // We calculate the *actual* height for this page.
    // Note: The `width` from `initializePrint.js` is constant and correct.
    const height = final_ny * (NDOT + 3) * dy + py + 2 * border;

    // C: bits=print->drawbits;
    // C: memset(bits,255,height*width);
    // We allocate the pixel buffer for this page.
    // This buffer is 8-bit, 1-channel (grayscale).
    const bits = new Uint8Array(width * height);
    bits.fill(0xFF); // Fill with white (255)

    // C: print->superdata.page= (ushort)(print->frompage+1);
    superdata.page = frompage + 1;

    // --- Draw Grid Lines (C: Draw vertical/horizontal grid lines) ---
    // This logic is ported to `fillBlock.js` and `drawBlock.js`

    // --- Fill Borders (C: Fill borders with regular raster) ---
    // C: for (j=-1; j<=ny; j++) { ... }
    for (let j = -1; j <= final_ny; j++) {
        fillBlock(-1, j, bits, width, height, border, nx, final_ny, dx, dy, px, py, black);
        fillBlock(nx, j, bits, width, height, border, nx, final_ny, dx, dy, px, py, black);
    }
    // C: for (i=0; i<nx; i++) { ... }
    for (let i = 0; i < nx; i++) {
        fillBlock(i, -1, bits, width, height, border, nx, final_ny, dx, dy, px, py, black);
        fillBlock(i, final_ny, bits, width, height, border, nx, final_ny, dx, dy, px, py, black);
    }

    // --- Prepare Superblock (as a 128-byte t_data buffer) ---
    // This buffer will be re-used for all superblocks
    const superblockBuffer = new ArrayBuffer(128);
    const superblockView = new DataView(superblockBuffer);
    const superblockBytes = new Uint8Array(superblockBuffer);
    superblockView.setUint32(0, superdata.addr, true);
    superblockView.setUint32(4, superdata.datasize, true);
    superblockView.setUint32(8, superdata.pagesize, true);
    superblockView.setUint32(12, superdata.origsize, true);
    superblockBytes[16] = superdata.mode;
    // ... (attributes, modified, filecrc)
    // We'll assume these are correctly set in initializePrint.js
    // ...
    // Note: The C code also copies name, salt, iv. This logic should be
    // in initializePrint.js when it populates `superdata`.
    // For now, we just draw what's there.

    // --- Draw Superblocks (First block of every "string") ---
    // C: for (j=0; j<=redundancy; j++) { ... }
    for (let j = 0; j <= redundancy; j++) {
        let k = j * (groupsOnPage + 1);
        // This is the C code's block-scattering logic
        if (groupsOnPage + 1 >= nx) {
            k += (Math.floor(nx / (redundancy + 1)) * j - (k % nx) + nx) % nx;
        }
        drawBlock(k, superblockBuffer, bits, width, height, border, nx, dx, dy, px, py, black);
    }

    // --- Prepare Data & Checksum Buffers ---
    let currentOffset = offset;
    const blockBuffer = new ArrayBuffer(128);
    const blockView = new DataView(blockBuffer);
    const blockBytes = new Uint8Array(blockBuffer);
    const checksumBuffer = new ArrayBuffer(128);
    const checksumView = new DataView(checksumBuffer);
    const checksumBytes = new Uint8Array(checksumBuffer);

    // --- Encode and Draw Data, Group by Group ---
    // C: for (i=0; i<nstring; i++) { ... }
    for (let i = 0; i < groupsOnPage; i++) {
        // C: Prepare redundancy block (cksum.addr=...)
        checksumView.setUint32(0, currentOffset ^ (redundancy << 28), true);
        // C: memset(cksum.data,0xFF,NDATA);
        for (let l = 0; l < NDATA; l++) {
            checksumBytes[l + 4] = 0xFF; // +4 for 32-bit address
        }

        // C: for (j=0; j<redundancy; j++) { ... }
        for (let j = 0; j < redundancy; j++) {
            // C: block.addr=offset;
            blockView.setUint32(0, currentOffset, true);
            // C: if (offset<size) { ... }
            if (currentOffset < alignedsize) {
                const dataLen = min(alignedsize - currentOffset, NDATA);
                blockBytes.set(buf.subarray(currentOffset, currentOffset + dataLen), 4);
                // C: while (l<NDATA) block.data[l++]=0;
                if (dataLen < NDATA) {
                    blockBytes.fill(0, 4 + dataLen, 4 + NDATA);
                }
            } else {
                // C: else l=0; ... block.data[l++]=0;
                blockBytes.fill(0, 4, 4 + NDATA);
            }

            // C: Update redundancy block
            // C: for (l=0; l<NDATA; l++) cksum.data[l]^=block.data[l];
            for (let l = 0; l < NDATA; l++) {
                checksumBytes[l + 4] ^= blockBytes[l + 4];
            }

            // C: Find cell where block will be placed
            let k = j * (groupsOnPage + 1);
            if (groupsOnPage + 1 < nx) {
                k += i + 1;
            } else {
                let rot = (Math.floor(nx / (redundancy + 1)) * j - (k % nx) + nx) % nx;
                k += (i + 1 + rot) % (groupsOnPage + 1);
            }
            drawBlock(k, blockBuffer, bits, width, height, border, nx, dx, dy, px, py, black);
            currentOffset += NDATA;
        }

        // C: Process redundancy block
        let k = redundancy * (groupsOnPage + 1);
        if (groupsOnPage + 1 < nx) {
            k += i + 1;
        } else {
            let rot = (Math.floor(nx / (redundancy + 1)) * redundancy - (k % nx) + nx) % nx;
            k += (i + 1 + rot) % (groupsOnPage + 1);
        }
        drawBlock(k, checksumBuffer, bits, width, height, border, nx, dx, dy, px, py, black);
    }

    // --- Fill Remaining Cells ---
    // C: for (k=(nstring+1)*(redundancy+1); k<nx*ny; k++) { ... }
    for (let k = (groupsOnPage + 1) * (redundancy + 1); k < nx * final_ny; k++) {
        drawBlock(k, superblockBuffer, bits, width, height, border, nx, dx, dy, px, py, black);
    }

    // --- Encode as BMP (Replaces PNG logic) ---
    //
    // The `bits` buffer is now 8-bit, 1-channel, and bottom-up (thanks to
    // drawBlock's math: (height - y - 1) * width).
    // This is exactly what our new `bmpEncode.js` expects.
    //
    const bmpData = encode({
        data: bits,
        width: width,
        height: height,
    });

    // C: print->frompage++;
    print.frompage++;

    // Return the result for this page
    return {
        bmpBuffer: bmpData, // Pass the ArrayBuffer
        pageNumber: frompage + 1,
        totalPages,
        done: false,
    };
}