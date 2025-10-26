// public/js/lib/printer/index.js

import { Message, Reporterror } from '../paperbak/user-interface.js';
import { prepareFileToPrint } from './prepareFile.js';
import { compressFile } from './compression.js';
import { encryptData } from './encryption.js';
import { initializePrinting } from './initializePrint.js';
import { printNextPage } from './printPage.js';
import { pb } from '../include/paperbak/index.js';

/**
 * The main class for managing the printing/encoding process.
 */
class Printer {
    constructor(file, options) {
        // The 'print' object holds the entire state for this job
        this.print = {
            step: 1,
            ...options
        };
        this.file = file;
        this.outputBitmaps = [];
    }

    stop() {
        this.print.step = 0;
        // In JS, garbage collection handles memory, so we just reset the state.
        this.print = { step: 0 };
        Message("", 0);
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
                        const totalPages = Math.ceil(this.print.datasize / this.print.pagesize) || 1;
                        const currentPage = this.print.frompage + 1;
                        const progress = 25 + Math.floor(70 * (currentPage / totalPages));
                        yield { status: `Generating page ${currentPage} of ${totalPages}...`, progress };

                        const pageResult = printNextPage(this.print);
                        if (pageResult.done) {
                            this.print.step = 8;
                        } else {
                            this.outputBitmaps.push(pageResult);
                        }
                        break;
                    case 8:
                        yield { status: "Finalizing...", progress: 95 };
                        this.stop();
                        break;
                    default:
                        throw new Error(`Unknown printer step: ${this.print.step}`);
                }
            } catch (err) {
                this.stop();
                yield { error: err.message };
                return;
            }
        }
        yield { status: "Complete", progress: 100, bitmaps: this.outputBitmaps };
    }
}

let currentPrinter = null;

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