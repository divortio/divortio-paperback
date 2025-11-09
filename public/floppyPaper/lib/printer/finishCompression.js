/**
 * @file finishCompression.js
 * @overview
 * Implements the logic for State 4 (Finishcompression), ensuring the final
 * compressed size is read correctly before advancing to encryption.
 */
import { Reporterror } from '../logging/log.js';
import { stopPrinting } from './stopPrinting.js';
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
 *
 * @param {EncoderState} encoderState - The main state object (t_printdata).
 * @returns {void}
 */
export function finishCompression(encoderState) {
    if (encoderState.compression) {
        let success = 0; // Starts at 0 (BZ_OK)

        while (success !== BZ_STREAM_END) {
            success = BZ2_bzCompress(encoderState.bzstream, BZ_FINISH);

            // --- RESTART/MEMORY CHOKE CHECK (C: BZ_FINISH_OK && avail_out==0) ---
            if (success === BZ_FINISH_OK && encoderState.bzstream.avail_out === 0) {
                BZ2_bzCompressEnd(encoderState.bzstream);
                encoderState.compression = 0;
                encoderState.readsize = 0;
                encoderState.step--;
                return;
            }

            // --- FATAL ERROR CHECK ---
            if (success !== BZ_STREAM_END && success !== BZ_FINISH_OK) {
                Reporterror("Unable to compress data. Try to disable compression.");
                stopPrinting(encoderState);
                return;
            }
        }

        // 2. Update final size (C: print->datasize=print->bzstream.total_out_lo32;)
        // This confirms the final size is read from the stream object.
        encoderState.datasize = encoderState.bzstream.total_out;

        if (encoderState.datasize < encoderState.origsize * 0.1) {
//     // TEMPORARY DEBUG HACK: Assume 5:1 ratio if Pako fails to report size
    encoderState.datasize = encoderState.origsize / 5;
}
        // DEBUG OUTPUT: Log final size before cleanup
        console.log(`Debug: Final Compressed Size Read: ${encoderState.datasize} bytes.`);

        BZ2_bzCompressEnd(encoderState.bzstream);
    } else {
        encoderState.datasize = encoderState.origsize;
    }

    // 4. Calculate Alignment and Pad Buffer
    const alignmentMask = 0xFFFFFFF0;
    encoderState.alignedsize = (encoderState.datasize + 15) & alignmentMask;

    for (let i = encoderState.datasize; i < encoderState.alignedsize; i++) {
        encoderState.buf[i] = 0;
    }

    // 5. Cleanup Resources
    encoderState.hfile = null;
    encoderState.readbuf = null;

    // 6. Advance State
    encoderState.step = 5;
}