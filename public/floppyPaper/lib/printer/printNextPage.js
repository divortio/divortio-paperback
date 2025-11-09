/**
 * @file printNextPage.js
 * @overview
 * Implements the logic for State 7 (Printnextpage) of the encoding pipeline.
 * This function handles page segmentation, redundancy calculation (XORing blocks),
 * structural drawing, and final BMP data collection.
 *
 * C Reference:
 * - Function: Printnextpage (in Printer.c)
 * - State: 7 (Print pages, one at a time)
 */
import { Reporterror, Message } from '../logging/log.js';
import { stopPrinting } from './stopPrinting.js';
import { NDATA, NDOT } from '../classes/constants.js';
import { DataBlock } from '../classes/dataBlock.js';
import { encode as encodeBmp } from '../bmpImage/bmpEncode.js';
import { BMPData } from '../classes/bmpData.js';
import { drawBlock } from './drawBlock.js';
import { drawGridLines } from './drawGridLines.js';
import { packHeaderBlock } from './packHeaderBlock.js'; // <-- NEW: Packs HeaderBlock structure
import { packDataBlock } from './packDataBlock.js';   // <-- NEW: Packs DataBlock/Checksum structure


// --- Global helper function equivalents (Assumed imported or defined globally) ---
function max(a, b) { return a > b ? a : b; }
function min(a, b) { return a < b ? a : b; }

function fnsplitForOutput(path, page, npages) {
    // Generates the final output filename (e.g., file_0001.bmp)
    const parts = path.split(/[/\\]/);
    const fullFileName = parts.pop() || 'backup.bmp';
    const dotIndex = fullFileName.lastIndexOf('.');
    let name = dotIndex === -1 ? fullFileName : fullFileName.substring(0, dotIndex);
    let ext = dotIndex === -1 ? '.bmp' : fullFileName.substring(dotIndex);

    if (npages > 1) {
        const pageNumStr = String(page).padStart(4, '0');
        return `${name}_${pageNumStr}${ext}`;
    }
    return `${name}${ext}`;
}

/**
 * Processes the next page, performing all block drawing and collecting the raw pixel data.
 *
 * @param {EncoderState} encoderState - The main state object (t_printdata).
 * @returns {void}
 * @see C_EQUIVALENT: Printnextpage (in Printer.c)
 */
export function printNextPage(encoderState) {
    // Destructure frequently used variables
    const { dx, dy, px, py, nx, ny, width, redundancy, black } = encoderState;
    const { alignedsize: size, pagesize, drawbits: bits, height: max_height } = encoderState;

    let offset;
    let l, n, nstring, rot;

    // 1. Check termination condition
    offset = encoderState.frompage * pagesize;
    // if (offset >= encoderState.datasize || encoderState.frompage > encoderState.topage) {
    //     encoderState.step++; // Advance to Finish printing (State 8)
    //     return;
    // }
    if (encoderState.frompage > encoderState.topage) {
        // All required pages have been printed.
        encoderState.step++;
        return;
    }

    const npages = Math.ceil(encoderState.datasize / pagesize);
    Message(`Processing page ${encoderState.frompage + 1} of ${npages}...`, 0);

    // 2. Dynamic Height Adjustment / Initialization
    const remainingDataBytes = min(size - offset, pagesize);
    n = Math.ceil(remainingDataBytes / NDATA);
    nstring = Math.ceil(n / redundancy);

    let n_rows_needed = max(Math.ceil(((nstring + 1) * (redundancy + 1) + 1) / nx), 3);

    let effectiveHeight = max_height;
    if (encoderState.ny > n_rows_needed) {
        effectiveHeight = n_rows_needed * (NDOT + 3) * dy + py + 2 * encoderState.border;
    }

    bits.fill(255, 0, width * effectiveHeight);

    // 3. Draw Grid Lines and Borders
    drawGridLines(encoderState);

    // 4. Update Header Block Page Number and pack it once
    encoderState.superdata.page = encoderState.frompage + 1;
    const rawSuperBlock = packHeaderBlock(
        encoderState.superdata,
        encoderState.salt,
        encoderState.iv
    );

    // --- 5. Main Data and Redundancy Block Loop ---
    const mockDataBlock = new DataBlock();
    const mockCksumBlock = new DataBlock();

    // Draw initial superblocks
    for (let j = 0; j <= redundancy; j++) {
        const k = j * (nstring + 1);
        drawBlock(k, rawSuperBlock, bits, width, effectiveHeight, encoderState.border, nx, encoderState.ny, dx, dy, px, py, black);
    }

    for (let i = 0; i < nstring; i++) {
        // Prepare redundancy block. (C: cksum.addr/memset(cksum.data))
        mockCksumBlock.addr = offset ^ (redundancy << 28);
        mockCksumBlock.data.fill(0xFF);

        for (let j = 0; j < redundancy; j++) {
            // Fill data block. (C: block.addr/memcpy/memset(0))
            mockDataBlock.addr = offset;
            l = min(size - offset, NDATA);

            if (l > 0) {
                mockDataBlock.data.set(encoderState.buf.subarray(offset, offset + l), 0);
                if (l < NDATA) {
                    mockDataBlock.data.fill(0, l, NDATA);
                }
            } else {
                mockDataBlock.data.fill(0);
            }

            // Update Redundancy Checksum (XOR)
            for (let data_byte_idx = 0; data_byte_idx < NDATA; data_byte_idx++) {
                mockCksumBlock.data[data_byte_idx] ^= mockDataBlock.data[data_byte_idx];
            }

            // Draw Data Block
            const k_data = j * (nstring + 1) + (i + 1);
            const rawDataBlockBuffer = packDataBlock(mockDataBlock); // Pack before drawing/ECC
            drawBlock(k_data, rawDataBlockBuffer, bits, width, effectiveHeight, encoderState.border, nx, encoderState.ny, dx, dy, px, py, black);

            offset += NDATA;
        }

        // Draw Redundancy Block
        const k_cksum = redundancy * (nstring + 1) + (i + 1);
        const rawCksumBlockBuffer = packDataBlock(mockCksumBlock); // Pack checksum block
        drawBlock(k_cksum, rawCksumBlockBuffer, bits, width, effectiveHeight, encoderState.border, nx, encoderState.ny, dx, dy, px, py, black);
    }

    // Draw remaining Superblocks in unused cells
    for (let k = (nstring + 1) * (redundancy + 1); k < nx * encoderState.ny; k++) {
        drawBlock(k, rawSuperBlock, bits, width, effectiveHeight, encoderState.border, nx, encoderState.ny, dx, dy, px, py, black);
    }

    // 6. Output Collection (BMP encoding)
    const bmpBuffer = encodeBmp({
        data: bits.subarray(0, width * effectiveHeight),
        width: width,
        height: effectiveHeight,
    });

    const outputFileName = fnsplitForOutput(encoderState.outbmp, encoderState.frompage + 1, npages);

    if (!encoderState.outputFiles) {
        encoderState.outputFiles = [];
    }

    encoderState.outputFiles.push(new BMPData({
        fileName: outputFileName,
        pageNumber: encoderState.frompage + 1,
        data: new Uint8Array(bmpBuffer),
    }));

    // 7. Advance to Next Page
    encoderState.frompage++;
}