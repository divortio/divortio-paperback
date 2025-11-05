/**
 * @file finishCompression.js
 * @overview
 * Implements the logic for State 4 (Finishcompression) of the encoding pipeline.
 * This function drains any remaining compressed data from the streaming engine,
 * handles memory exhaustion errors by silently disabling compression and restarting
 * the process (State 2), sets final size metadata, and cleans up transient buffers.
 *
 * C Reference:
 * - Function: Finishcompression (in Printer.c)
 * - State: 4 (Finish compression and close file)
 */
import { Reporterror } from '../logging/log.js';
import { Stopprinting } from './print.js';
import {
    BZ2_bzCompress,
    BZ2_bzCompressEnd,
    BZ_FINISH,
    BZ_RUN_OK,
    BZ_FINISH_OK,
    BZ_STREAM_END
} from '../gzip/bz2API.js';

/**
 * Finalizes the compression stream, updates file size metadata, and cleans up resources.
 * Completes EncoderState step 4.
 *
 * @param {EncoderState} encoderState - The main state object (t_printdata).
 * @returns {void}
 * @see C_EQUIVALENT: Finishcompression (in Printer.c)
 */
export function finishCompression(encoderState) {
    // 1. Finalize Compression (If active)
    if (encoderState.compression) {
        let success = BZ_RUN_OK;

        // Loop repeatedly calls BZ2_bzCompress with BZ_FINISH to drain all pending output.
        while (success !== BZ_STREAM_END) {
            success = BZ2_bzCompress(encoderState.bzstream, BZ_FINISH);

            // --- RESTART/MEMORY CHOKE CHECK ---
            // C: if (success==BZ_FINISH_OK && print->bzstream.avail_out==0) { ... restart ... }
            // If the stream is still flushing (BZ_FINISH_OK) but the output buffer is full (avail_out==0),
            // the C code assumes a memory issue (or data too incompressible) and restarts without compression.
            if (success === BZ_FINISH_OK && encoderState.bzstream.avail_out === 0) {

                BZ2_bzCompressEnd(encoderState.bzstream);

                // Silently restart without compression (simulate rewind)
                encoderState.compression = 0;
                encoderState.readsize = 0;
                encoderState.step--; // Go back to State 2 (Preparecompressor)
                return;
            }

            // --- FATAL ERROR CHECK ---
            // C: if (success!=BZ_STREAM_END) { ... Reporterror ... }
            if (success !== BZ_STREAM_END && success !== BZ_FINISH_OK) {
                Reporterror("Unable to compress data. Try to disable compression.");
                Stopprinting(encoderState);
                return;
            }
        }

        // 2. Update final size and clean up BZ stream
        // C: print->datasize=print->bzstream.total_out_lo32;
        encoderState.datasize = encoderState.bzstream.total_out;
        BZ2_bzCompressEnd(encoderState.bzstream);
    } else {
        // 3. No Compression: Size is simply the original size
        encoderState.datasize = encoderState.origsize;
    }

    // 4. Calculate Alignment and Pad Buffer
    // Aligns size up to the next multiple of 16 (0xFFFFFFF0 mask).
    const alignmentMask = 0xFFFFFFF0;
    encoderState.alignedsize = (encoderState.datasize + 15) & alignmentMask;

    // Zero pad the buffer from datasize up to alignedsize.
    // Note: The buffer was pre-allocated in State 1 to be at least this large.
    for (let i = encoderState.datasize; i < encoderState.alignedsize; i++) {
        encoderState.buf[i] = 0;
    }

    // 5. Cleanup Resources (C: fclose(hfile); free(readbuf);)
    // In the JS port, these are logical closes/dereferences for garbage collection.
    encoderState.hfile = null;
    encoderState.readbuf = null;

    // 6. Advance State (Step finished -> Encrypt data)
    encoderState.step = 5;
}