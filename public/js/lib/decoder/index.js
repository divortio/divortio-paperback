// public/js/lib/decoder/index.js

import { max, SUPERBLOCK } from '../include/paperbak/index.js';
import { getGridPosition } from './getGridPosition.js';
import { getGridIntensity } from './getGridIntensity.js';
import { getXAngle, getYAngle } from './getAngle.js';
import { decodeBlock } from './decodeBlock.js';
import { startNextPage, addBlock, finishPage } from '../fileproc/index.js';

export class Decoder {
    /**
     * @param {Uint8Array} grayscaleData - The raw pixel data of the bitmap.
     * @param {number} width - The width of the bitmap in pixels.
     * @param {number} height - The height of the bitmap in pixels.
     * @param {object} [options={}] - Configuration options, including a reportError function.
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
            blockborder: 0.0,
            bufdx: 0, bufdy: 0,
            unsharp: null, sharp: null,
            blockxpeak: 0, blockypeak: 0,
            blockxstep: 0, blockystep: 0,
            nposx: 0, nposy: 0,
            posx: 0, posy: 0,
            uncorrected: new Uint8Array(128),
            blocklist: [],
            superblock: {},
            maxdotsize: 0,
            orientation: -1,
            ngood: 0,
            nbad: 0,
            nsuper: 0,
            nrestored: 0,
            // Store the reportError function in the state object
            reportError: options.reportError || ((msg, err) => { console.error(msg, err); alert(msg); }),
        };
        this.finalData = null;
    }

    /**
     * Runs the decoding state machine, yielding progress updates.
     * @returns {AsyncGenerator<object>} An async generator that yields progress objects.
     */
    async* run() {
        while (this.pdata.step > 0) {
            try {
                switch (this.pdata.step) {
                    case 1: // Initial setup, can be skipped
                        this.pdata.step++;
                        break;
                    case 2:
                        yield { status: "Searching for raster...", progress: 5 };
                        getGridPosition(this.pdata);
                        break;
                    case 3:
                        getGridIntensity(this.pdata);
                        break;
                    case 4:
                        yield { status: "Analyzing vertical grid lines...", progress: 10 };
                        // Pass pdata which now contains the reportError function
                        getXAngle(this.pdata);
                        break;
                    case 5:
                        yield { status: "Analyzing horizontal grid lines...", progress: 15 };
                        getYAngle(this.pdata);
                        break;
                    case 6:
                        yield { status: "Preparing for decoding...", progress: 20 };
                        this.prepareForDecoding();
                        break;
                    case 7:
                        const totalBlocks = this.pdata.nposx * this.pdata.nposy;
                        const currentBlock = this.pdata.posy * this.pdata.nposx + this.pdata.posx;
                        const progress = 20 + Math.floor(75 * (currentBlock / totalBlocks));
                        yield { status: `Decoding block ${currentBlock + 1} of ${totalBlocks}`, progress };
                        this.decodeNextBlock();
                        break;
                    case 8:
                        yield { status: "Finalizing and assembling data...", progress: 95 };
                        this.finishDecoding();
                        break;
                    default:
                        this.pdata.reportError(`Internal error: Unknown decoder step ${this.pdata.step}`);
                        this.pdata.step = 0;
                        break;
                }
            } catch (error) {
                this.pdata.reportError("A critical error occurred in the decoder.", error);
                this.pdata.step = 0; // Halt on error
                yield { error: error.message };
            }
        }
        yield { status: "Decoding complete", progress: 100, result: this.finalData };
    }

    prepareForDecoding() {
        const pdata = this.pdata;
        if (pdata.blockborder <= 0.0) {
            pdata.blockborder = max(Math.abs(pdata.xangle), Math.abs(pdata.yangle)) * 5.0 + 0.4;
        }
        const dotsize = max(pdata.xstep, pdata.ystep) / (32 + 3.0);
        pdata.sharpfactor += 1.3 / dotsize - 0.1;
        pdata.sharpfactor = Math.max(0.0, Math.min(2.0, pdata.sharpfactor));
        const maxxshift = Math.abs(pdata.xangle * pdata.sizey);
        let shift = pdata.xangle < 0.0 ? 0.0 : maxxshift;
        while (pdata.xpeak - pdata.xstep > -shift - pdata.xstep * pdata.blockborder) {
            pdata.xpeak -= pdata.xstep;
        }
        pdata.nposx = Math.floor((pdata.sizex + maxxshift) / pdata.xstep);
        const maxyshift = Math.abs(pdata.yangle * pdata.sizex);
        shift = pdata.yangle < 0.0 ? 0.0 : maxyshift;
        while (pdata.ypeak - pdata.ystep > -shift - pdata.ystep * pdata.blockborder) {
            pdata.ypeak -= pdata.ystep;
        }
        pdata.nposy = Math.floor((pdata.sizey + maxyshift) / pdata.ystep);
        pdata.bufdx = Math.floor(pdata.xstep * (2.0 * pdata.blockborder + 1.0) + 1.0);
        pdata.bufdy = Math.floor(pdata.ystep * (2.0 * pdata.blockborder + 1.0) + 1.0);
        pdata.maxdotsize = (pdata.xstep < 2 * (32 + 3) || pdata.ystep < 2 * (32 + 3)) ? 1 : (pdata.xstep < 3 * (32 + 3) || pdata.ystep < 3 * (32 + 3)) ? 2 : (pdata.xstep < 4 * (32 + 3) || pdata.ystep < 4 * (32 + 3)) ? 3 : 4;
        pdata.blocklist = [];
        pdata.step++;
    }

    decodeNextBlock() {
        const { answer, result } = decodeBlock(this.pdata, this.pdata.posx, this.pdata.posy);
        const resultView = new DataView(result.buffer);
        const addr = resultView.getUint32(0, true);

        if (answer >= 0 && answer <= 16) {
            if (addr === SUPERBLOCK) {
                this.pdata.superblock = {
                    addr: SUPERBLOCK,
                    datasize: resultView.getUint32(4, true),
                    pagesize: resultView.getUint32(8, true),
                    origsize: resultView.getUint32(12, true),
                    mode: resultView.getUint8(16),
                    attributes: resultView.getUint8(17),
                    page: resultView.getUint16(18, true),
                    modified: { dwLowDateTime: resultView.getUint32(20, true), dwHighDateTime: resultView.getUint32(24, true) },
                    filecrc: resultView.getUint16(28, true),
                    name: new TextDecoder().decode(result.subarray(30, 30 + 64)).replace(/\0/g, ''),
                };
                this.pdata.nsuper++;
                this.pdata.nrestored += answer;
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

        this.pdata.posx++;
        if (this.pdata.posx >= this.pdata.nposx) {
            this.pdata.posx = 0;
            this.pdata.posy++;
            if (this.pdata.posy >= this.pdata.nposy) {
                this.pdata.step++;
            }
        }
    }

    finishDecoding() {
        if (!this.pdata.superblock.addr) {
            this.pdata.reportError("Page label (superblock) is not readable.");
        } else {
            const fileIndex = startNextPage(this.pdata.superblock);
            if (fileIndex >= 0) {
                for (const block of this.pdata.blocklist) {
                    addBlock(block, fileIndex);
                }
                this.finalData = finishPage(fileIndex, this.pdata.ngood + this.pdata.nsuper, this.pdata.nbad, this.pdata.nrestored);
            }
        }
        this.pdata.step = 0;
    }
}