
/**
 * @file prepareFileToPrint.js
 * @overview
 * Implements the logic for State 1 (Preparefiletoprint) of the encoding pipeline.
 * This function loads file metadata, reads the input file asynchronously, validates its size,
 * allocates necessary streaming buffers, and initializes configuration flags for the print job.
 *
 * C Reference:
 * - Function: Preparefiletoprint (in Printer.c)
 * - State: 1 (Open file and allocate buffers)
 */
import { Reporterror } from '../logging/log.js';
import { stopPrinting } from './stopPrinting.js';
import { MAXSIZE, PACKLEN } from '../classes/constants.js';

/**
 * convertJsTimestampToFileTime
 * @param timestamp {number}
 * @returns {{dwLowDateTime: number, dwHighDateTime: number}}
 */
function convertJsTimestampToFileTime(timestamp) {
    // JavaScript timestamp is milliseconds since Unix epoch (Jan 1, 1970).
    // Windows FILETIME is 100-nanosecond intervals since Jan 1, 1601.

    // Time difference between 1601 and 1970 in 100-nanosecond intervals (approx 116444736000000000)
    const EPOCH_DIFFERENCE = 11644473600000;

    // Total 100-nanosecond intervals:
    const fileTime = BigInt(Math.floor(timestamp)) * 10000n + BigInt(EPOCH_DIFFERENCE) * 10000n;

    return {
        // Splitting 64-bit integer into two 32-bit components
        dwLowDateTime: Number(fileTime & 0xFFFFFFFFn),
        dwHighDateTime: Number(fileTime >> 32n)
    };
}

/**
 * Opens input file, reads its content, allocates memory buffers, and sets initial state.
 * This function completes EncoderState step 1.
 *
 * @param {GlobalState} globalState - Global configuration variables (pb_ prefix).
 * @param {EncoderState} encoderState - The main state object (t_printdata) to be populated.
 * @param {File} file - The input file object (replaces C disk I/O handles).
 * @param {number} lastModified - The file's modification timestamp to use (e.g., Date.now()).
 * @returns {Promise<void>}
 * @throws {Error} Throws if file size is invalid or memory allocation fails.
 */
export async function prepareFileToPrint(globalState, encoderState, file, lastModified) {
    // Note: C functions like GetFileAttributes and fopen are replaced by the File object and async read.

    // 1. Get file metadata/size & validate (C: GetFileSize / MAXSIZE check)
    encoderState.origsize = file.size;

    if (encoderState.origsize === 0 || encoderState.origsize > MAXSIZE) {
        Reporterror("Invalid file size (0 or exceeds maximum theoretical length)");
        stopPrinting(encoderState);
        return;
    }

    // 2. Set metadata (C: GetFileTime / attribute logic)
    // We default to a standard attribute set for cross-platform JS and use the provided timestamp.
    encoderState.attributes = 0x00000080; // FILE_ATTRIBUTE_NORMAL (Windows equivalent)
    encoderState.modified = convertJsTimestampToFileTime(lastModified);

    // 3. Read File Content Asynchronously (C: fopen + first fread)
    const arrayBuffer = await file.arrayBuffer();

    // 4. Calculate Aligned Buffer Size (C: print->bufsize=(print->origsize+15) & 0xFFFFFFF0;)
    // Aligns size up to the next multiple of 16 (for AES block size).
    encoderState.bufsize = (encoderState.origsize + 15) & 0xFFFFFFF0;

    // 5. Allocate Main Buffer (C: malloc(print->bufsize))
    // We create the *final* buffer of the aligned size and copy the raw content into it.
    // The main buffer (buf) must be a Uint8Array of the *aligned* size.
    encoderState.buf = new Uint8Array(encoderState.bufsize);
    encoderState.buf.set(new Uint8Array(arrayBuffer));
    // Note: JS memory allocation is abstracted; success is implied unless an exception is caught.

    // 6. Allocate Read Buffer (C: malloc(PACKLEN))
    // This buffer will hold the chunks used in the streaming compression step (State 3).
    encoderState.readbuf = new Uint8Array(PACKLEN);

    // 7. Set Configuration Options (C: print->compression=pb_compression; etc.)
    encoderState.compression = globalState.compression;
    encoderState.encryption = globalState.encryption;
    encoderState.printheader = globalState.printHeader;
    encoderState.printborder = globalState.printBorder;
    encoderState.redundancy = globalState.redundancy;

    // 8. Initialize Counters
    encoderState.readsize = 0;

    // 9. Advance State (C: print->step++)
    encoderState.step = 2;
}