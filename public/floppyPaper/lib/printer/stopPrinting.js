/**
 * @file stopPrinting.js
 * @overview
 * Implements the cleanup logic for the encoding pipeline (State 8).
 * This function terminates the compression stream, closes the file, and releases
 * all dynamically allocated buffers by setting references to null.
 *
 * C Reference:
 * - Function: Stopprinting (in Printer.c)
 * - State: Final cleanup (Sets step = 0)
 */
import { BZ2_bzCompressEnd } from '../gzip/bz2API.js';
import { Message } from '../logging/log.js';

/**
 * Stops the printing/encoding process and frees all allocated resources.
 *
 * @param {EncoderState} encoderState - The main state object (t_printdata).
 * @returns {void}
 * @see C_EQUIVALENT: Stopprinting (in Printer.c)
 */
export function stopPrinting(encoderState) {
    // 1. Finish Compression (C: BZ2_bzCompressEnd)
    if (encoderState.compression !== 0) {
        // Stop the streaming engine, cleaning up its internal memory.
        BZ2_bzCompressEnd(encoderState.bzstream);
        encoderState.compression = 0; // Explicitly reset flag
    }

    // 2. Close Input File Handle (C: fclose(hfile))
    encoderState.hfile = null;

    // 3. Deallocate Memory (C: free(ptr)) - Setting references to null
    encoderState.buf = null;        // Main compressed data buffer
    encoderState.readbuf = null;    // Read chunk buffer
    encoderState.drawbits = null;   // Final bitmap drawing buffer

    // 4. Free other resources (C: reset startdoc flag)
    encoderState.startdoc = 0;

    // 5. Set state to idle (Stop printing)
    encoderState.step = 0; //

    Message("", 0);
}