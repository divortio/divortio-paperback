/**
 * @file prepareFileToPrint.js
 * @overview
 * Implements the logic for State 1 (PrepareFileToPrint) of the encoding pipeline.
 * This function is now ATOMIC, handling file reading, optional compression,
 * buffer alignment, and CRC calculation before advancing directly to encryption (State 5).
 */
import {Message, Reporterror} from '../logging/log.js';
import {stopPrinting} from './stopPrinting.js';
import {bzBuffToBuffCompress} from '../gzip/bzBuffToBuffCompress.js';
import {crc16} from '../crc16/crc16.js';
import {GlobalState} from "../classes/globalState.js";

/**
 * Reads the input file atomically, performs compression if enabled, calculates CRC,
 * and sets up the final data buffer for printing.
 * Completes EncoderState step 1 and advances directly to step 5.
 *
 * @param {GlobalState} globalState - Global configuration variables (used to determine compression level).
 * @param {EncoderState} encoderState - The main state object (t_printdata).
 * @param {File} inputFile - The input File object containing the raw data.
 * @param {number} modificationTime - The JavaScript timestamp of file modification.
 * @returns {Promise<void>}
 * @see C_EQUIVALENT: prepareFileToPrint (in Printer.c)
 */
export async function prepareFileToPrint(globalState, encoderState, inputFile, modificationTime) {
    // --- 1. File I/O and Metadata (Original State 1 Logic) ---

    // Read the entire file content into a buffer. (Simulating C I/O completion)
    const rawInputBuffer = await inputFile.arrayBuffer();
    const inputData = new Uint8Array(rawInputBuffer);

    encoderState.infile = inputFile.name;
    encoderState.origsize = inputData.length;

    if (encoderState.origsize === 0) {
        Reporterror("Invalid file size.");
        stopPrinting(encoderState);
        return;
    }

    // Set configuration variables from global state
    encoderState.compression = globalState.compression;
    encoderState.encryption = globalState.encryption;
    encoderState.redundancy = globalState.redundancy;

    // Initialize read buffer (using 0 as size, it will be nullified later)
    encoderState.readbuf = new Uint8Array(0);

    // --- 2. Atomic Compression and Alignment (Replacing States 2, 3, 4) ---

    Message("Processing file data...", 0);

    // Determine compression level
    const compressionLevel = encoderState.compression === 0 ? 0 :
        encoderState.compression === 1 ? 1 : 9;

    const compressionResult = bzBuffToBuffCompress(inputData, compressionLevel);

    if (compressionResult === null) {
        Reporterror("Fatal error during atomic compression.");
        stopPrinting(encoderState);
        return;
    }

    // Update main state properties with atomic results
    encoderState.origsize = compressionResult.origsize;
    encoderState.buf = compressionResult.outputBuffer;
    encoderState.datasize = compressionResult.datasize;
    encoderState.alignedsize = compressionResult.alignedsize;
    encoderState.bufsize = compressionResult.alignedsize; // bufsize must match final allocated size

    // --- 3. Final CRC Calculation (Required for Encryption Check) ---

    // C: print->bufcrc=Crc16(print->buf,print->alignedsize);
    // Calculate CRC over the ENTIRE aligned buffer, including zero padding.
    encoderState.bufcrc = crc16(encoderState.buf.buffer, encoderState.alignedsize);

    // --- 4. State Advancement ---

    Message("File read and processed. Advancing to encryption.", 100);
    encoderState.step = 5; // Advance directly to encryptData
}