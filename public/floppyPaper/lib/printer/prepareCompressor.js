/**
 * @file prepareCompressor.js
 * @overview
 * Implements the logic for State 2 (Preparecompressor) of the encoding pipeline.
 * Initializes the compression streaming engine and sets up the output pointers
 * for the compressed data buffer.
 *
 * C Reference:
 * - Function: Preparecompressor (in Printer.c)
 * - State: 2 (Initialize compression engine)
 */
import { Reporterror } from '../logging/log.js';
import { BZ2_bzCompressInit, BZ_OK } from '../gzip/bz2API.js'; // Assuming BZ_OK is also exported from bz2API.js

/**
 * Initializes the compression stream if requested. Completes EncoderState step 2.
 *
 * @param {EncoderState} encoderState - The main state object (t_printdata).
 * @returns {void}
 * @see C_EQUIVALENT: Preparecompressor (in Printer.c)
 */
export function prepareCompressor(encoderState) {
    // 1. Check whether compression is requested at all.
    if (encoderState.compression === 0) {
        encoderState.step++;
        return;
    }

    // Determine compression level: 1 (fast) or 9 (maximal).
    const compressionLevel = encoderState.compression === 1 ? 1 : 9;
    let success = 0;

    // 2. Initialize compressor. (C: memset/BZ2_bzCompressInit)
    // The C `memset` for bzstream is replaced by the default initialization in the EncoderState constructor.
    // The C API takes 4 arguments, the last two (verbosity, workFactor) are 0 and safely ignored.
    success = BZ2_bzCompressInit(encoderState.bzstream, compressionLevel, 0, 0);

    if (success !== BZ_OK) {
        // On error, silently disable compression and advance state.
        Reporterror("Unable to initialize compressor. Disabling compression.");
        encoderState.compression = 0;
        encoderState.step++;
        return;
    }

    // 3. Set up streaming pointers (C: print->bzstream.next_out / avail_out)
    // The next_out pointer points to the beginning of the allocated buffer (buf).
    encoderState.bzstream.next_out = encoderState.buf;
    // avail_out is set to the total size of the allocated buffer (aligned size).
    encoderState.bzstream.avail_out = encoderState.bufsize;

    // 4. Advance State (Step finished)
    encoderState.step++;
}