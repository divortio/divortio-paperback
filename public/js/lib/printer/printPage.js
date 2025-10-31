// public/js/lib/printer/printPage.js

import { min, max, NDATA, NDOT, SUPERBLOCK } from '../include/paperbak/index.js';
import { drawBlock } from './drawBlock.js';
import { fillBlock } from './fillBlock.js';
// --- START OF REFACTOR ---
// Import the encode function from fast-png
// import { encode } from '../../vendor/fast-png/lib/index.js';
// --- END OF REFACTOR ---
import { encode  } from '../bmpImage/index.js';

/**
 * Generates one complete bitmap page as a raw PNG file buffer.
 * @param {object} print - The main print data object.
 * @returns {{pngData: Uint8Array, pageNumber: number, totalPages: number, done: boolean}}
 */
export function printNextPage(print) {
    const {
        dx, dy, px, py, nx, ny, width, border, redundancy, black,
        alignedsize, pagesize, superdata, buf, encryption, salt, iv,
        frompage, topage
    } = print;

    const offset = frompage * pagesize;
    const totalPages = Math.ceil(print.datasize / pagesize) || 1;

    if (offset >= print.datasize || frompage > topage) {
        return { done: true }; // All pages printed
    }

    const dataOnPage = min(alignedsize - offset, pagesize);
    const dataBlocksOnPage = Math.ceil(dataOnPage / NDATA);
    const groupsOnPage = Math.ceil(dataBlocksOnPage / redundancy);
    const totalBlocksToPrint = (groupsOnPage + 1) * (redundancy + 1) + 1;
    let final_ny = max(Math.ceil(totalBlocksToPrint / nx), 3);
    if (final_ny < ny) {
        final_ny = ny;
    }
    const height = final_ny * (NDOT + 3) * dy + py + 2 * border;

    // Create the raw 1-channel grayscale pixel buffer
    const bits = new Uint8Array(width * height).fill(255);

    // Draw borders and alignment grid if enabled
    if (print.printborder) {
        for (let j = -1; j <= final_ny; j++) {
            fillBlock(-1, j, bits, width, height, border, nx, final_ny, dx, dy, px, py, black);
            fillBlock(nx, j, bits, width, height, border, nx, final_ny, dx, dy, px, py, black);
        }
        for (let i = 0; i < nx; i++) {
            fillBlock(i, -1, bits, width, height, border, nx, final_ny, dx, dy, px, py, black);
            fillBlock(i, final_ny, bits, width, height, border, nx, final_ny, dx, dy, px, py, black);
        }
    }

    // --- Prepare Superblock ---
    const superblockBuffer = new ArrayBuffer(128);
    const superblockView = new DataView(superblockBuffer);
    const superblockBytes = new Uint8Array(superblockBuffer);

    superdata.page = frompage + 1;
    superblockView.setUint32(0, superdata.addr, true);
    superblockView.setUint32(4, superdata.datasize, true);
    superblockView.setUint32(8, superdata.pagesize, true);
    superblockView.setUint32(12, superdata.origsize, true);
    superblockView.setUint8(16, superdata.mode);
    superblockView.setUint8(17, superdata.attributes);
    superblockView.setUint16(18, superdata.page, true);
    superblockView.setBigUint64(20, BigInt(superdata.modified), true);
    superblockView.setUint16(28, superdata.filecrc, true);

    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(superdata.name);
    superblockBytes.set(nameBytes, 30);

    if (encryption && salt && iv) {
        superblockBytes.set(salt, 30 + 32);
        superblockBytes.set(iv, 30 + 32 + 16);
    }

    // --- Draw Superblocks ---
    for (let j = 0; j <= redundancy; j++) {
        let k = j * (groupsOnPage + 1);
        if (groupsOnPage + 1 >= nx) {
            k += Math.floor(nx / (redundancy + 1) * j - k % nx + nx) % nx;
        }
        drawBlock(k, superblockBuffer.slice(0), bits, width, height, border, nx, dx, dy, px, py, black);
    }

    // --- Draw Data and Redundancy Blocks ---
    let currentOffset = offset;
    const blockBuffer = new ArrayBuffer(128);
    const checksumBuffer = new ArrayBuffer(128);

    for (let i = 0; i < groupsOnPage; i++) {
        const checksumView = new DataView(checksumBuffer);
        const checksumBytes = new Uint8Array(checksumBuffer);

        checksumView.setUint32(0, currentOffset ^ (redundancy << 28), true);
        checksumBytes.fill(0xFF, 4, 4 + 90);

        for (let j = 0; j < redundancy; j++) {
            const blockView = new DataView(blockBuffer);
            const blockBytes = new Uint8Array(blockBuffer);
            blockBytes.fill(0);

            blockView.setUint32(0, currentOffset, true);
            const dataToCopy = buf.subarray(currentOffset, currentOffset + NDATA);
            blockBytes.set(dataToCopy, 4);

            for(let l = 0; l < NDATA; l++) {
                checksumBytes[l + 4] ^= blockBytes[l + 4];
            }

            let k = j * (groupsOnPage + 1) + (i + 1);
            drawBlock(k, blockBuffer.slice(0), bits, width, height, border, nx, dx, dy, px, py, black);
            currentOffset += NDATA;
        }

        let k = redundancy * (groupsOnPage + 1) + (i + 1);
        drawBlock(k, checksumBuffer.slice(0), bits, width, height, border, nx, dx, dy, px, py, black);
    }

    // Fill remaining cells with superblocks
    for (let k = (groupsOnPage + 1) * (redundancy + 1); k < nx * final_ny; k++) {
        drawBlock(k, superblockBuffer.slice(0), bits, width, height, border, nx, dx, dy, px, py, black);
    }

    // --- START OF REFACTOR ---
    // Convert the 1-channel grayscale pixel buffer to a 4-channel RGBA buffer for fast-png
    const rgbaData = new Uint8Array(width * height * 4);
    for (let i = 0; i < bits.length; i++) {
        const val = bits[i];
        const pixelIndex = i * 4;
        rgbaData[pixelIndex] = val;     // R
        rgbaData[pixelIndex + 1] = val; // G
        rgbaData[pixelIndex + 2] = val; // B
        rgbaData[pixelIndex + 3] = 255; // A (fully opaque)
    }

    // Encode the RGBA data into a PNG file buffer using fast-png
    const bmpData = encode({
        width: width,
        height: height,
        data: rgbaData
    });
    // --- END OF REFACTOR ---

    print.frompage++;

    // Return the raw PNG data
    return { bmpData, pageNumber: print.frompage, totalPages, done: false };
}