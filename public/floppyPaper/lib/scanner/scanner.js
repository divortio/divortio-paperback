// public/floppyPaper/lib/scanner/scanner.js

import { Message, Reporterror } from '../logging/log.js';
import { createPData } from '../primitives/createPData.js';
import { freeProcData } from '../decoder/src/freeProcData.js';

// --- Import all decoder steps ---
// Step 1 (Setup)
import { decodeBitmap } from './decodeBitmap.js';

// Step 2-8 (The state machine logic from nextDataProcessingStep.js)
import { getGridPosition } from '../decoder/src/getGridPosition.js';
import { getGridIntensity } from '../decoder/src/getGridIntensity.js';
import { getXAngle } from '../decoder/src/getXAngle.js';
import { getYAngle } from '../decoder/src/getYAngle.js';
import { prepareForDecoding } from '../decoder/src/prepareForDecoding.js';
import { decodeNextBlock } from '../decoder/src/decodeNextBlock.js';
import { finishDecoding } from '../decoder/src/finishDecoding.js';
import { pb } from '../primitives/pb.js';

// Helper to force a yield to the event loop, unblocking the UI.
const yieldToEventLoop = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * The main class for managing the scanning/decoding process.
 * Modeled after the Printer class.
 */
class Scanner {
    /**
     * @param {ArrayBuffer} arrayBuffer - The ArrayBuffer of the bitmap file.
     * @param {object} options - Decoding options (password, bestquality).
     */
    constructor(arrayBuffer, options) {
        // The 'pdata' object holds the entire state for this job
        this.pdata = createPData();
        this.pdata.step = 1; // Start at step 1

        this.arrayBuffer = arrayBuffer;
        this.options = options;
        this.fileResult = null; // To store the final file

        // Set password on the global 'pb' object for fileSaver to access
        // This mirrors the old logic in main/index.js
        pb.password = options.password || "";
    }

    /**
     * Stops the decoding process and cleans up memory.
     * Mirrors Stopprinting().
     */
    stop() {
        if (this.pdata) {
            freeProcData(this.pdata);
            this.pdata.step = 0;
        }
        Message("", 0);
    }

    /**
     * Runs the main decoder state machine as an async generator.
     * Mirrors Printer.run().
     */
    async* run() {
        while (this.pdata.step > 0) {
            try {
                // This switch statement is the logic from nextDataProcessingStep.js
                switch (this.pdata.step) {
                    case 1: // Setup: Parse BMP and start the pipeline
                        yield { status: "Reading bitmap...", progress: 1 };

                        // This logic was originally in main/index.js
                        const pb_bestquality = this.options.bestquality || false;
                        decodeBitmap(this.pdata, this.arrayBuffer, pb_bestquality);

                        // decodeBitmap calls startBitmapDecoding, which sets pdata.step = 1
                        // and the imported step functions will increment it from here.
                        // Let's just set it to 2 manually.
                        this.pdata.step = 2;
                        await yieldToEventLoop();
                        break;

                    case 2: // Determine grid size
                        yield { status: "Searching for raster...", progress: 5 };
                        getGridPosition(this.pdata);
                        await yieldToEventLoop();
                        break;

                    case 3: // Determine min and max intensity
                        yield { status: "Analyzing intensity...", progress: 10 };
                        getGridIntensity(this.pdata);
                        await yieldToEventLoop();
                        break;

                    case 4: // Determine step and angle in X
                        yield { status: "Searching for grid lines...", progress: 15 };
                        getXAngle(this.pdata);
                        await yieldToEventLoop();
                        break;

                    case 5: // Determine step and angle in Y
                        yield { status: "Searching for grid lines...", progress: 18 };
                        getYAngle(this.pdata);
                        await yieldToEventLoop();
                        break;

                    case 6: // Prepare for data decoding
                        yield { status: "Decoding...", progress: 20 };
                        prepareForDecoding(this.pdata);
                        await yieldToEventLoop();
                        break;

                    case 7: // Decode next block of data (fast loop)
                        // This step yields its own progress
                        if (this.pdata.nposx > 0 && this.pdata.nposy > 0) {
                            const percent = 20 + Math.floor(
                                ((this.pdata.posy * this.pdata.nposx + this.pdata.posx) * 80) /
                                (this.pdata.nposx * this.pdata.nposy)
                            );
                            yield { status: "Decoding blocks...", progress: percent };
                        }
                        decodeNextBlock(this.pdata);
                        // No yieldToEventLoop here, this step must be fast
                        break;

                    case 8: // Finish data decoding
                        yield { status: "Finalizing file...", progress: 99 };
                        const fileResult = await finishDecoding(this.pdata);

                        // Store the result to be yielded in the final "Complete" message
                        this.fileResult = fileResult;
                        this.stop(); // Sets step to 0, ending the loop
                        break;

                    default:
                        throw new Error(`Unknown decoder step: ${this.pdata.step}`);
                }
            } catch (err) {
                this.stop();
                yield { error: err.message };
                return; // Stop the generator on error
            }
        }
        // Yield the final "Complete" message, including the file result
        yield { status: "Complete", progress: 100, file: this.fileResult };
    }
}

// --- Global state and factory functions (mirrors print.js) ---

let currentScanner = null;

/**
 * Creates a new Scanner instance for a given bitmap file.
 * Mirrors printFile().
 *
 * @param {ArrayBuffer} arrayBuffer - The ArrayBuffer of the bitmap file.
 * @param {object} options - Decoding options (password, bestquality).
 * @returns {Scanner} A new Scanner instance.
 */
export function scanFile(arrayBuffer, options) {
    if (currentScanner && currentScanner.pdata.step !== 0) {
        currentScanner.stop();
    }
    currentScanner = new Scanner(arrayBuffer, options);
    return currentScanner;
}

/**
 * Stops the currently active scanner.
 * Mirrors Stopprinting().
 */
export function stopScanning() {
    if (currentScanner) {
        currentScanner.stop();
    }
}