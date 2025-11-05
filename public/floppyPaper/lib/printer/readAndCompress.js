/**
 * @file readAndCompress.js
 * @overview
 * Implements the logic for State 3 (Readandcompress) of the encoding pipeline.
 * Reads the next data chunk from the file buffer, compresses it incrementally
 * using the BzStream, or simply copies it if compression is disabled.
 *
 * C Reference:
 * - Function: Readandcompress (in Printer.c)
 * - State: 3 (Read next piece of data and compress)
 */
import { Reporterror, Message } from '../logging/log.js';
import { Stopprinting } from './print.js';
import { BZ2_bzCompress, BZ2_bzCompressEnd, BZ_RUN_OK, BZ_RUN, BZ_SEQUENCE_ERROR } from '../gzip/bz2API.js';
import { PACKLEN } from '../classes/constants.js';

/**
 * Reads the next chunk of file data and sends it to the compression stream.
 * Completes EncoderState step 3.
 *
 * @param {EncoderState} encoderState - The main state object (t_printdata).
 * @returns {void}
 * @see C_EQUIVALENT: Readandcompress (in Printer.c)
 */
export function readAndCompress(encoderState) {
    let success;
    let size;

    // 1. Determine chunk size to read
    // C: size=print->origsize-print->readsize; if (size>PACKLEN) size=PACKLEN;
    size = encoderState.origsize - encoderState.readsize;
    if (size > PACKLEN) {
        size = PACKLEN;
    }

    // Safety check to exit cleanly if already finished
    if (size <= 0) {
        if (encoderState.readsize === encoderState.origsize) {
            encoderState.step++;
        }
        return;
    }

    // --- C I/O SIMULATION (fread) ---
    // In JS, we read a chunk from the main in-memory buffer (encoderState.buf).

    // Read the next chunk into the readbuf.
    const rawContent = encoderState.buf;
    let chunkToRead = rawContent.subarray(encoderState.readsize, encoderState.readsize + size);

    // Simulate C error check: if we got less data than expected, something is wrong.
    if (chunkToRead.length !== size) {
        Reporterror("Internal error: Data chunk mismatch during read.");
        Stopprinting(encoderState);
        return;
    }

    // Copy the chunk into the separate PACKLEN read buffer, mimicking C's memory layout.
    encoderState.readbuf.set(chunkToRead, 0);

    // --- Compression Logic ---
    if (encoderState.compression) {
        // 2. Set streaming input pointers (C: next_in, avail_in)
        Message("Compressing file", Math.floor((encoderState.readsize + size) * 100 / encoderState.origsize));

        encoderState.bzstream.next_in = encoderState.readbuf;
        encoderState.bzstream.avail_in = size;

        // 3. Perform incremental compression (C: BZ2_bzCompress)
        success = BZ2_bzCompress(encoderState.bzstream, BZ_RUN);

        // 4. Check for stream errors (C: if (print->bzstream.avail_in!=0 || success!=BZ_RUN_OK))
        if (encoderState.bzstream.avail_in !== 0 || success !== BZ_RUN_OK) {
            Reporterror("Unable to compress data. Try to disable compression.");
            Stopprinting(encoderState);
            return;
        }

        // 5. Update read counter
        encoderState.readsize += size;

        // 6. Check for compression memory exhaustion (Restart logic)
        // If we still have data left AND the output buffer is full (stream is choked), restart.
        if (encoderState.readsize < encoderState.origsize && encoderState.bzstream.avail_out === 0) {
            BZ2_bzCompressEnd(encoderState.bzstream);

            // Silently restart without compression (C: rewind/reset readsize)
            encoderState.compression = 0;
            encoderState.readsize = 0;
            return;
        }
    } else {
        // --- No Compression Logic ---
        // C: memcpy(print->buf+print->readsize, print->readbuf, size);
        encoderState.buf.set(encoderState.readbuf.subarray(0, size), encoderState.readsize);
        encoderState.readsize += size;
    }

    // 7. Check for overall file completion (C: if (print->readsize==print->origsize) print->step++;)
    if (encoderState.readsize === encoderState.origsize) {
        encoderState.step++; // Advance to Finishcompression (State 4)
    }
}