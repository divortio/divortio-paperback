/**
 * @file prepareCompressor.js
 * @overview
 * Implements the logic for State 2 (Preparecompressor) of the encoding pipeline.
 */
import { Reporterror } from '../logging/log.js';
import { BZ2_bzCompressInit, BZ_OK } from '../gzip/bz2API.js';

/**
 * Initializes the compression stream if requested. Completes EncoderState step 2.
 *
 * @param {EncoderState} encoderState - The main state object (t_printdata).
 * @returns {void}
 */
export function prepareCompressor(encoderState) {
    if (encoderState.compression === 0) {
        encoderState.step++;
        return;
    }

    const compressionLevel = encoderState.compression === 1 ? 1 : 9;
    let success = 0;

    success = BZ2_bzCompressInit(encoderState.bzstream, compressionLevel, 0, 0);

    if (success !== BZ_OK) {
        Reporterror("Unable to initialize compressor. Disabling compression.");
        encoderState.compression = 0;
        encoderState.step++;
        return;
    }

    // DEBUG OUTPUT: Show initial buffer capacity
    console.log(`Debug: Initial Buffer Capacity (bufsize): ${encoderState.bufsize}`);

    encoderState.bzstream.next_out = encoderState.buf;
    encoderState.bzstream.avail_out = encoderState.bufsize;

    encoderState.step++;
}