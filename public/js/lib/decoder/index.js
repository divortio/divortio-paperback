// public/js/lib/decoder/index.js

import { max, SUPERBLOCK } from '../include/paperbak/index.js';
import { getGridPosition } from './getGridPosition.js';
import { getGridIntensity } from './getGridIntensity.js';
import { getXAngle, getYAngle } from './getAngle.js';
import { decodeBlock } from './decodeBlock.js';
import { startNextPage, addBlock, finishPage } from '../fileproc/index.js';
import { recognizeBits } from './recognizeBits.js';

export class Decoder {
    /**
     * @param {Uint8Array} grayscaleData - The raw pixel data of the bitmap.
     * @param {number} width - The width of the bitmap in pixels.
     * @param {number} height - The height of the bitmap in pixels.
     * @param {object} [options={}] - Configuration options.
     */
    constructor(grayscaleData, width, height, options = {}) {
        this.pdata = {
            step: 1,
            mode: options.bestquality ? 1 : 0, // M_BEST
            data: grayscaleData,
            sizex: width,
            sizey: height,
            gridxmin: 0, gridxmax: 0,
            gridymin: 0, gridymax: 0,
            searchx0: 0, searchx1: 0,
            searchy0: 0, searchy1: 0,
            cmean: 0, cmin: 0, cmax: 0,
            sharpfactor: 0,
            xpeak: 0, xstep: 0, xangle: 0,
            ypeak: 0, ystep: 0, yangle: 0,
            threshold: 128,
            nblocksx: 0, nblocksy: 0,
            posx: 0, posy: 0,
            nblock: 0,
            blocklist: [],
            nsuper: 0,
            ngood: 0,
            nbad: 0,
            nrestored: 0,
            uncorrected: new Uint8Array(128),
            superblock: {},
            reportError: options.reportError || ((msg, err) => { console.error(msg, err); }),
            getGridIntensity: (x, y) => getGridIntensity(this.pdata, x, y),
        };
    }

    async* run() {
        try {
            while (this.pdata.step > 0) {
                switch (this.pdata.step) {
                    case 1:
                        yield { status: "Finding grid position and intensity...", progress: 10 };
                        getGridPosition(this.pdata);
                        getGridIntensity(this.pdata);
                        this.pdata.step++;
                        break;
                    case 2:
                        yield { status: "Finding grid angle and step...", progress: 30 };
                        getXAngle(this.pdata);
                        getYAngle(this.pdata);
                        this.pdata.step++;
                        break;
                    case 3: // This is now the main block-by-block decoding loop.
                        const totalBlocks = this.pdata.nblocksx * this.pdata.nblocksy;
                        if (this.pdata.nblock < totalBlocks) {
                            const progress = 40 + Math.floor(60 * (this.pdata.nblock / totalBlocks));
                            yield { status: `Decoding blocks... (${this.pdata.nblock} / ${totalBlocks})`, progress };
                            this.decodeNextBlock();
                        } else {
                            this.pdata.step++;
                        }
                        break;
                    case 4: // This is now the finalization step.
                        yield { status: "Reassembling file...", progress: 98 };
                        const fileData = this.finishDecoding();
                        if (fileData) {
                            yield { status: "Decoding complete", progress: 100, fileName: fileData.name, fileBuffer: fileData.buffer };
                        }
                        this.pdata.step = 0; // End
                        break;
                    default:
                        this.pdata.step = 0;
                }
            }
        } catch (err) {
            this.pdata.reportError("A critical error occurred in the decoder.", err);
        }
    }

    decodeNextBlock() {
        // This function now correctly calls the complex decodeBlock with the state object.
        const { answer, result } = decodeBlock(this.pdata, this.pdata.posx, this.pdata.posy);
        this.pdata.nblock++;

        if (answer >= 0 && answer <= 16) { // 0-16 errors corrected, block is good.
            const blockView = new DataView(result.buffer);
            const addr = blockView.getUint32(0, true);

            if (addr === SUPERBLOCK) {
                // Logic to handle the superblock (page header)
                this.pdata.nsuper++;
                this.pdata.nrestored += answer;
                // Further superblock data extraction would go here if needed
            } else {
                const ngroup = (addr >> 28) & 0x0F;
                this.pdata.blocklist.push({
                    addr: addr & 0x0FFFFFFF,
                    recsize: ngroup > 0 ? ngroup * 90 : 0,
                    data: result.subarray(4, 4 + 90),
                });
                if (ngroup > 0) this.pdata.superblock.ngroup = ngroup;
                this.pdata.ngood++;
                this.pdata.nrestored += answer;
            }
        } else if (answer >= 17) {
            this.pdata.nbad++;
        }

        // Advance to the next block coordinate
        this.pdata.posx++;
        if (this.pdata.posx >= this.pdata.nblocksx) {
            this.pdata.posx = 0;
            this.pdata.posy++;
        }
    }

    finishDecoding() {
        if (this.pdata.nsuper === 0) {
            this.pdata.reportError("Page label (superblock) is not readable.");
        } else {
            const fileIndex = startNextPage(this.pdata.superblock);
            if (fileIndex >= 0) {
                for (const block of this.pdata.blocklist) {
                    addBlock(fileIndex, block);
                }
                return finishPage(fileIndex);
            }
        }
        return null;
    }
}