/**
 * @file bzBuffToBuffCompress.js
 * @overview
 * Implements an atomic, non-streaming buffer-to-buffer compression utility.
 * This function replaces the logic of States 2, 3, and 4 by compressing an
 * entire input buffer and returning the padded output array and its metadata.
 */
import { BzStream } from './bzStream.js';
import {
    BZ2_bzCompressInit,
    BZ2_bzCompress,
    BZ2_bzCompressEnd,
    BZ_OK,
    BZ_RUN,
    BZ_FINISH,
    BZ_STREAM_END
} from './bz2API.js';

/**
 * Performs atomic compression on an entire input buffer and returns the resulting
 * compressed buffer and its size metadata.
 *
 * @param {Uint8Array} inputBuffer - The raw uncompressed file data (from encoderState.buf).
 * @param {number} compressionLevel - The compression level (0: none, 1: fast, 9: maximal).
 * @returns {{origsize: number ,outputBuffer: Uint8Array, datasize: number, alignedsize: number} }
 * The resulting buffer and size metadata, or null on error.
 */
export function bzBuffToBuffCompress(inputBuffer, compressionLevel) {
    const origsize = inputBuffer.length;
    let datasize;

    // --- 1. No Compression (BZ_OK or BZ_DATA_ERROR on initialization) ---
    if (compressionLevel === 0) {
        // Datasize is the original size, buffer needs only padding.
        datasize = origsize;

        // Calculate alignment size
        const alignmentMask = 0xFFFFFFF0;
        const alignedsize = (datasize + 15) & alignmentMask;

        // Create new padded buffer
        const outputBuffer = new Uint8Array(alignedsize);
        outputBuffer.set(inputBuffer.subarray(0, origsize));
        // Padding bytes (which default to 0) are already correct.

        return { outputBuffer, origsize, datasize, alignedsize };
    }

    // --- 2. Atomic Compression Setup (Replacing State 2/3) ---
    const strm = new BzStream();

    // The C stream typically allocates bufsize = (origsize + 15) & 0xFFFFFFF0
    // We estimate the output buffer size to handle potential growth.
    // Gzip compressed data is usually around 1/2 of the original size or slightly less,
    // but the output stream must be large enough for the *worst case* (which is slightly larger than the input).
    const estimatedOutputSize = Math.max(origsize * 2, 1024 * 1024); // Ensure at least 1MB capacity

    const outputBuffer = new Uint8Array(estimatedOutputSize);

    // Initialize stream (State 2 logic)
    const successInit = BZ2_bzCompressInit(strm, compressionLevel, 0, 0);
    if (successInit !== BZ_OK) {
        console.error("BZ2_bzCompressInit failed.");
        return null;
    }

    // Configure stream for atomic operation
    strm.next_in = inputBuffer;
    strm.avail_in = origsize;
    strm.next_out = outputBuffer; // Write directly to our large buffer
    strm.avail_out = estimatedOutputSize;

    // --- 3. Run and Finalize Stream (Replacing State 3/4) ---
    let successRun = BZ_RUN;

    // Push all data and signal finish in the same call loop.
    while (successRun !== BZ_STREAM_END) {
        // BZ_RUN action consumes input; BZ_FINISH action flushes remaining data.
        const action = strm.avail_in > 0 ? BZ_RUN : BZ_FINISH;
        successRun = BZ2_bzCompress(strm, action);

        // Error Check
        if (successRun < 0 && successRun !== BZ_STREAM_END) {
            console.error(`BZ2_bzCompress failed with status: ${successRun}`);
            BZ2_bzCompressEnd(strm);
            return null;
        }
    }

    // --- 4. Final Metadata and Padding (Replacing State 4 logic) ---

    // Final size is the total bytes written to the buffer.
    datasize = strm.total_out;

    // Calculate alignment size
    const alignmentMask = 0xFFFFFFF0;
    const alignedsize = (datasize + 15) & alignmentMask;

    // Clean up stream resources
    BZ2_bzCompressEnd(strm);

    // Pad the buffer (outputBuffer defaults to 0s, but we must return the correct size).
    // Return a sliced version of the output buffer to the correct aligned size.
    const finalBuffer = outputBuffer.subarray(0, alignedsize);

    return { outputBuffer: finalBuffer, datasize, alignedsize , origsize};
}