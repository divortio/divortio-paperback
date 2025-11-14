import {InputFile} from "./inputFile.js";
import {PrintImage} from "./printImage.js";
import {PrintDimensions} from "./printDimensions.js";
import {PrintOptions} from "./printOptions.js";
import {BzStream} from "../gzip/bzStream.js";
import {SuperData} from "./blocks/superData.js";
import {FileBuffer} from "./FileBuffer.js";
import {PrintPage} from "./printPage.js";
import {NDATA, NDOT} from "./constants.js";
import {packHeaderBlock} from "../printer/packHeaderBlock.js";
import {drawVerticalLines} from "../printer/drawVerticalLines.js";
import {drawHorizontalLines} from "../printer/drawHorizontalLines.js";
import {drawBlock} from "../printer/drawBlock.js";
import {packDataBlock} from "../printer/packDataBlock.js";
import {DataBlock} from "./blocks/dataBlock.js";
import {ChecksumBlock} from "./blocks/checksumBlock.js";
import {encode as encodeBmp} from "../bmpImage/bmpEncode.js";
import {BMPData} from "./bmpData.js";


// --- Global helper function equivalents (Assumed imported or defined globally) ---
function max(a, b) {
    return a > b ? a : b;
}

function min(a, b) {
    return a < b ? a : b;
}


/**
 *
 * @param path {string}
 * @param page {number}
 * @param npages {number}
 * @returns {string}
 */
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


export class PrintJob {


    /**
     *
     * @param inputFile {File}
     * @param printOptions {PrintOptions}
     */
    constructor(inputFile, printOptions) {

        /**
         *
         * @type {File}
         */
        this.infile = inputFile;

        /**
         *
         * @type {PrintOptions}
         */
        this.options = printOptions;

        /**
         *
         * @type {PrintDimensions}
         */
        this.dimensions = new PrintDimensions(this.options.dpi,
            this.options.widthInch1000,
            this.options.heightInch1000,
            this.options.redundancy,
            this.options.dotPercent,
            this.options.border
        );

        /**
         *
         * @type {FileBuffer}
         */
        this.buf = null;

        /**
         * @public
         * @type {number}
         * @description First page to print (0-based).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.frompage = 0;

        /**
         * @public
         * @type {number}
         * @description Last page to print (0-based, inclusive).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.topage = 0;

        /**
         * @public
         * @type {number}
         * @description Next data printing step in the internal state machine (0 - idle, 1 - start, 8 - finish).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.step = 0;

        /**
         * @public
         * @type {SuperData}
         * @description The identification block to be printed at the beginning of each page.
         * @default new SuperData()
         * @see C_TYPE: t_superdata
         */
        this.superdata = null;


        /**
         * @public
         * @type {number}
         * @description Size of compressed data that fits onto a single page.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.pagesize = this.dimensions.image.pagesize;


        /**
         *
         * @type {number}
         */
        this.nPages = 0;


        /**
         *
         * @type {[PrintPage]}
         */
        this.pages = [];


        /**
         *
         * @type {number}
         */
        this.currentPage = 0;

        /**
         *
         * @type {[BMPData]}
         */
        this.outputFiles = []

    }

    async readFile() {
        // Read the entire file content into a buffer. (Simulating C I/O completion)
        const rawInputBuffer = await this.infile.arrayBuffer();
        const inputData = new Uint8Array(rawInputBuffer);
        this.buf = new FileBuffer(inputData,
            this.infile.name,
            this.infile.lastModified,
            this.options.compress
        )
        this.superdata = new SuperData(
            0,
            this.buf.origsize,
            this.buf.datasize,
            this.dimensions.image.pagesize,
            this.buf.bufcrc,
            this.buf.modified,
            this.buf.name,
            this.options.compress,
            this.options.encryption
        )

        this.nPages = Math.ceil(this.buf.alignedsize / this.pagesize);
        this.topage = this.nPages > 0 ? this.nPages - 1 : 0;
        return this;

    }



    /**
     *
     * @returns {PrintPage}
     */
    newPage() {
        return new PrintPage
        (this.frompage,
            this.options.dpi,
            this.options.widthInch1000,
            this.options.heightInch1000,
            this.options.redundancy,
            this.options.dotPercent,
            this.options.border
        )
    }


    nextPage() {
        this.currentPage += 1;
        console.log(`Processing page: ${this.frompage + 1} of ${this.topage}`);
        let offset;
        let l, n, nstring, rot;

        // 1. Check termination condition
        offset = this.frompage * this.dimensions.image.pagesize;

        if (this.frompage > this.topage) {
            // All required pages have been printed.
            this.step++;
            return;
        }

        // 2. Dynamic Height Adjustment / Initialization
        const remainingDataBytes = min(this.buf.alignedsize - offset,
            this.dimensions.image.pagesize);
        n = Math.ceil(remainingDataBytes / NDATA);
        nstring = Math.ceil(n / this.options.redundancy);

        let n_rows_needed = max(Math.ceil(((nstring + 1) * (this.options.redundancy + 1) + 1) / this.dimensions.image.width.blocks), 3);

        let effectiveHeight = this.dimensions.image.height.pixels;
        const width = this.dimensions.image.height.pixels;

        if (this.dimensions.image.height.blocks > n_rows_needed) {
            effectiveHeight = n_rows_needed * (NDOT + 3) * this.dimensions.image.block.height.pixels + this.dimensions.image.block.cell.height + 2 * this.dimensions.image.borderPixels;
        }

        const page = this.newPage();

        // fill with white
        page.drawbits.fill(255, 0, width * effectiveHeight);

        // 3. Draw Grid Lines and Borders
        drawVerticalLines(
            page.drawbits,
            this.dimensions.image.width.blocks, // nx
            this.dimensions.image.height.blocks, // ny
            this.dimensions.image.block.cell.width.pixels, // dx
            this.dimensions.image.block.cell.height.pixels, // dy
            this.dimensions.image.block.cell.mark.width.pixels, // px
            this.dimensions.image.block.cell.mark.height.pixels, // py
            this.dimensions.image.width.pixels, // width
            this.dimensions.image.borderPixels, // border
            this.options.border // border enabled
        )

        drawHorizontalLines(
            page.drawbits,
            this.dimensions.image.width.blocks, // nx
            this.dimensions.image.height.blocks, // ny
            this.dimensions.image.block.cell.width.pixels, // dx
            this.dimensions.image.block.cell.height.pixels, // dy
            this.dimensions.image.block.cell.mark.width.pixels, // px
            this.dimensions.image.block.cell.mark.height.pixels, // py
            this.dimensions.image.width.pixels, // width
            this.dimensions.image.borderPixels, // border
            this.options.border // border enabled
        )


        // 4. Update Header Block Page Number and pack it once
        this.superdata.page = this.frompage + 1;

        // const rawSuperBlock = this.superdata

        // Draw initial superblocks
        for (let j = 0; j <= this.options.redundancy; j++) {
            const k = j * (nstring + 1);
            drawBlock(page.drawbits,
                k,
                this.superdata,
                this.dimensions.image.width.pixels,
                this.dimensions.image.height.pixels,
                this.dimensions.image.borderPixels,
                this.dimensions.image.block.cell.width.pixels, // dx
                this.dimensions.image.block.cell.height.pixels, // dy
                this.dimensions.image.block.cell.mark.width.pixels, // px
                this.dimensions.image.block.cell.mark.height.pixels, // py
                this.dimensions.image.width.blocks, // nx
                64
            )
        }

        const dataBlock = new DataBlock();
        const checksumBlock = new ChecksumBlock();

        for (let i = 0; i < nstring; i++) {
            // Prepare redundancy block. (C: cksum.addr/memset(cksum.data))
            checksumBlock.addr = offset ^ (this.options.redundancy << 28);
            checksumBlock.data.fill(0xFF);

            for (let j = 0; j < this.options.redundancy; j++) {
                // Fill data block. (C: block.addr/memcpy/memset(0))
                dataBlock.addr = offset;
                l = min(this.buf.alignedsize - offset, NDATA);

                if (l > 0) {
                    dataBlock.data.set(this.buf.buf.subarray(offset, offset + l), 0);
                    if (l < NDATA) {
                        dataBlock.data.fill(0, l, NDATA);
                    }
                } else {
                    dataBlock.data.fill(0);
                }

                // Update Redundancy Checksum (XOR)
                for (let byteIdx = 0; byteIdx < NDATA; byteIdx++) {
                    checksumBlock.data[byteIdx] ^= dataBlock.data[byteIdx];
                }

                // Draw Data Block
                const k_data = j * (nstring + 1) + (i + 1);
                drawBlock(page.drawbits,
                    k_data,
                    dataBlock,
                    this.dimensions.image.width.pixels,
                    this.dimensions.image.height.pixels,
                    this.dimensions.image.borderPixels,
                    this.dimensions.image.block.cell.width.pixels, // dx
                    this.dimensions.image.block.cell.height.pixels, // dy
                    this.dimensions.image.block.cell.mark.width.pixels, // px
                    this.dimensions.image.block.cell.mark.height.pixels, // py
                    this.dimensions.image.width.blocks, // nx
                    64
                )

                offset += NDATA;
            }

            // Draw Redundancy Block
            const k_cksum = this.options.redundancy * (nstring + 1) + (i + 1);
            drawBlock(
                page.drawbits,
                k_cksum,
                dataBlock,
                this.dimensions.image.width.pixels,
                this.dimensions.image.height.pixels,
                this.dimensions.image.borderPixels,
                this.dimensions.image.block.cell.width.pixels, // dx
                this.dimensions.image.block.cell.height.pixels, // dy
                this.dimensions.image.block.cell.mark.width.pixels, // px
                this.dimensions.image.block.cell.mark.height.pixels, // py
                this.dimensions.image.width.blocks, // nx
                64
            )
        }

        // Draw remaining Superblocks in unused cells
        for (let k = (nstring + 1) * (this.options.redundancy + 1); k < this.dimensions.image.width.blocks * this.dimensions.image.height.blocks; k++) {
            drawBlock(
                page.drawbits,
                k,
                this.superdata,
                this.dimensions.image.width.pixels,
                this.dimensions.image.height.pixels,
                this.dimensions.image.borderPixels,
                this.dimensions.image.block.cell.width.pixels, // dx
                this.dimensions.image.block.cell.height.pixels, // dy
                this.dimensions.image.block.cell.mark.width.pixels, // px
                this.dimensions.image.block.cell.mark.height.pixels, // py
                this.dimensions.image.width.blocks, // nx
                64
            )
        }
        // 6. Output Collection (BMP encoding)
        const bmpBuffer = encodeBmp({
            data: page.drawbits.subarray(0, width * effectiveHeight),
            width: width,
            height: effectiveHeight,
        });

        if (!this.outputFiles) {
            this.outputFiles = [];
        }

        const outputFileName = fnsplitForOutput(this.infile.name,
            this.frompage + 1,
            this.nPages);

        const bmp = new BMPData(outputFileName,
            this.frompage + 1,
            new Uint8Array(bmpBuffer)
        );
        this.outputFiles.push(bmp);
        // 7. Advance to Next Page
        this.frompage++;
    }

    printPages() {

        for (let j = 0; j < this.nPages; j++) {
            this.nextPage();
        }
    }

}