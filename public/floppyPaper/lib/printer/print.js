// public/js/lib/printer/crc16.js

import { Message, Reporterror } from '../logging/log.js';
import { prepareFileToPrint } from './prepareFile.js';
import { compressFile } from './compression.js';
import { encryptData } from './encryption.js';
import { initializePrinting } from './initializePrint.js';
import { printNextPage } from './printPage.js';
import {createPrintData} from "../primitives/createPrintData.js";

/**
 * The main class for managing the printing/encoding process.
 */
class Printer {
    /**
     *
     * @param file {File}
     * @param options{{dpi: number,dotpercent: number,redundancy: number,compression: (number),encryption: (number),password: string,printheader: (number),printborder: (number)}}
     */
    constructor(file, options) {
        // The 'print' object holds the entire state for this job
        const pData  = createPrintData()
        /**
         *
         * @type {{step: number, infile: string, outbmp: string, hfile: null, modified: bigint, attributes: number, origsize: number, readsize: number, datasize: number, alignedsize: number, pagesize: number, compression: number, encryption: number, printheader: number, printborder: number, redundancy: number, buf: null, bufsize: number, readbuf: null, bufcrc: number, superdata: (Uint8Array|*), frompage: number, topage: number, ppix: number, ppiy: number, width: number, height: number, extratop: number, extrabottom: number, black: number, borderleft: number, borderright: number, bordertop: number, borderbottom: number, dx: number, dy: number, px: number, py: number, nx: number, ny: number, border: number, drawbits: null, bmi: Uint8Array<ArrayBuffer>, startdoc: number, dpi: number, dotpercent: number, password: string}}
         */
        this.print = {...pData, ...options};
        this.print.step = 1;
        this.file = file;
        this.outputBitmaps = [];
    }



    async* run() {
        while (this.print.step > 0) {
            try {
                switch (this.print.step) {
                    case 1:
                        yield { status: "Preparing file...", progress: 5 };
                        await prepareFileToPrint(this.print, this.file);
                        break;
                    case 2:
                    case 3:
                    case 4:
                        yield { status: "Compressing file...", progress: 10 };
                        // The compression function will now set the next step internally
                        await compressFile(this.print);
                        break;
                    case 5:
                        yield { status: "Encrypting data...", progress: 15 };
                        // --- START OF FIX ---
                        // Pass only the 'print' object. The password is inside it.
                        await encryptData(this.print);
                        // --- END OF FIX ---
                        break;
                    case 6:
                        yield { status: "Calculating layout...", progress: 20 };
                        initializePrinting(this.print);
                        break;
                    case 7:
                        const offset = this.print.frompage * this.print.pagesize;
                        const totalPages = Math.ceil(this.print.datasize + this.print.pagesize - 1 / this.print.pagesize) || 1;
                        // const totalPages = Math.ceil(this.print.datasize / this.print.pagesize) || 1;
                        const currentPage = this.print.frompage + 1;
                        const progress = 25 + Math.floor(70 * (currentPage / totalPages));
                        yield { status: `Generating page ${currentPage} of ${totalPages}...`, progress };

                        const pageResult = printNextPage(this.print);
                        if (pageResult.done) {
                            console.log(`I'm done 8: totalPages: ${totalPages}, offset: ${offset}, datasize: ${this.print.datasize}, pagesize: ${this.print.pagesize}`);
                            this.print.step = 8;
                        } else {
                            this.outputBitmaps.push(pageResult);
                        }
                        break;
                    case 8:
                        this.print.step = 0;
                        yield { status: "Finalizing...", progress: 95 };
                        break;
                    default:
                        throw new Error(`Unknown printer step: ${this.print.step}`);
                }
            } catch (err) {
                this.print.step = 0;
                Reporterror(`${err.name}: ${err.message} (${JSON.stringify(err.stack)})`);
                yield { error: err.message };
                return;
            }
        }

        yield { status: "Complete", progress: 100, bitmaps: this.outputBitmaps };
    }
}

let currentPrinter = null;

/**
 *
 * @param file {File}
 * @param options {{dpi: number,dotpercent: number,redundancy: number,compression: (number),encryption: (number),password: string,printheader: (number),printborder: (number)}}
 * @returns {Printer}
 */
export function printFile(file, options) {
    if (currentPrinter && currentPrinter.print.step !== 0) {
        currentPrinter.stop();
    }
    currentPrinter = new Printer(file, options);
    return currentPrinter;
}

export function Stopprinting() {
    if (currentPrinter) {
        currentPrinter.stop();
    }
}