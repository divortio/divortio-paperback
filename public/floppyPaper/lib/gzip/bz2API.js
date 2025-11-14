// bz2_api.js (Unifying bzStream.js and compress.js)

// --- 1. Import Dependencies and Define Constants ---

// FIX: Importing Deflate (for compress) and inflateRaw (for decompress)
import { Deflate, inflateRaw } from '../../vendor/pako/dist/pako.esm.js';
import { BzStream } from './bzStream.js'

// Constants are now exported to be used by the calling functions (Preparecompressor, Nextdataprintingstep)
export const BZ_OK = 0;
export const BZ_RUN = 0;
export const BZ_FINISH = 2;
export const BZ_RUN_OK = 1;
export const BZ_FINISH_OK = 3;
export const BZ_STREAM_END = 4;

// --- Exported ERROR CODES ---
export const BZ_SEQUENCE_ERROR = -1;
export const BZ_PARAM_ERROR = -2;
export const BZ_DATA_ERROR = -3;


// --- 3. Missing Helper Function (Needed by drainOutput in compress.js) ---

/**
 * Joins an array of Uint8Array chunks into a single Uint8Array.
 * @param {Array<Uint8Array>} arrays
 * @returns {Uint8Array} The concatenated buffer.
 */
function concatenateUint8Arrays(arrays) {
    let totalLength = 0;
    for (const arr of arrays) {
        totalLength += arr.length;
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}


// --- 4. Internal Helper for Output Draining (from compress.js) ---

/**
 * Internal helper to drain accumulated Pako output chunks into the user's next_out buffer.
 * @param {BzStream} strm - The compression stream state.
 * @returns {number} The number of bytes successfully written to strm.next_out.
 */
function drainOutput(strm) {
    let outputBytesCopied = 0;

    if (strm._outputQueue.length > 0) {
        const availableOutput = concatenateUint8Arrays(strm._outputQueue);
        strm._outputQueue = [];
        const bytesToCopy = Math.min(availableOutput.length, strm.avail_out);
        if (bytesToCopy > 0) {
            // Copy data to the external buffer starting at the total_out offset
            strm.next_out.set(availableOutput.subarray(0, bytesToCopy), strm.total_out);
            strm.avail_out -= bytesToCopy;
            strm.total_out += bytesToCopy;
            outputBytesCopied = bytesToCopy;
            if (availableOutput.length > bytesToCopy) {
                strm._outputQueue.push(availableOutput.subarray(bytesToCopy));
            }
        }
    }

    return outputBytesCopied;
}


// --- 5. Exported BZ2 C-Like Functions (from compress.js) ---

/**
 * @public
 * Initializes the compression stream. Corresponds to C BZ2_bzCompressInit.
 * @param {BzStream} strm - The compression stream state object.
 * @param {number} blockSize100k - The block size (1-9), used as compression level.
 * @param {number} verbosity - The verbosity level (0-4 in C, unused in JS).
 * @param {number} workFactor - The work factor (0-250 in C, unused in JS).
 * @returns {number} BZ_OK on success, or an error code.
 */
export function BZ2_bzCompressInit(strm, blockSize100k=9, verbosity=0, workFactor=0) {
    if (!strm) return BZ_PARAM_ERROR;

    try {
        // FINAL FIX: Use windowBits: -15 (Raw Deflate) for maximum streaming stability.
        strm._pako = new Deflate({
            raw: true,
            level: 9,
            windowBits: -15, // Force Raw Deflate mode (most stable streaming)
            memLevel: 9,    // Max internal memory
            chunkSize: 1024 * 512 // 512KB chunk size to avoid small output heuristics
        });

        strm._pako.onData = function (chunk) {
            strm._outputQueue.push(chunk);
        };

        return BZ_OK;

    } catch (e) {
        return BZ_DATA_ERROR;
    }
}

/**
 * @public
 * Compresses data incrementally. Corresponds to C BZ2_bzCompress.
 * @param {BzStream} strm - The compression stream state object.
 * @param {number} action - BZ_RUN (0) or BZ_FINISH (2).
 * @returns {number} A status code (BZ_RUN_OK, BZ_FINISH_OK, or BZ_STREAM_END).
 */
export function BZ2_bzCompress(strm, action) {
    if (!strm || !strm._pako) return BZ_SEQUENCE_ERROR;

    // --- Process Input (BZ_RUN) ---
    if (action === BZ_RUN) {
        if (strm.avail_in > 0 && strm.next_in) {
            const inputChunk = strm.next_in.subarray(0, strm.avail_in);
            strm._pako.push(inputChunk, false);
            strm.total_in += strm.avail_in;
            strm.avail_in = 0;
        }
    }

    // --- Process Finalization (BZ_FINISH) ---
    if (action === BZ_FINISH) {
        strm._pako.push(new Uint8Array(0), true);
    }

    // --- Drain Output ---
    const bytesCopied = drainOutput(strm);

    // --- Determine Return Code ---

    const pakoEnded = strm._pako.ended;
    const pakoError = strm._pako.err;

    if (pakoError) {
        return BZ_DATA_ERROR;
    }

    if (pakoEnded) {
        // If the stream signals completion during BZ_RUN, we return BZ_RUN_OK (1)
        if (action === BZ_RUN) {
            return BZ_RUN_OK;
        }
        return BZ_STREAM_END;
    }

    if (bytesCopied > 0) {
        return (action === BZ_FINISH) ? BZ_FINISH_OK : BZ_RUN_OK;
    }

    return BZ_RUN_OK;
}

/**
 * @public
 * Emulates C BZ2_bzBuffToBuffDecompress for one-shot decompression.
 * @param {Uint8Array} compressedData - The compressed input buffer.
 * @param {number} [expectedOutputSize=0] - The maximum expected uncompressed size.
 * @returns {{status: number, output: Uint8Array | null}} An object containing the BZ status code and the resulting buffer.
 */
export function BZ2_bzBuffToBuffDecompress(compressedData, expectedOutputSize = 0) {
    if (!compressedData || compressedData.length === 0) {
        return { status: BZ_OK, output: new Uint8Array(0) };
    }

    try {
        // FIX: Use inflateRaw to match the Raw Deflate stream generated by BZ2_bzCompress.
        const decompressed = inflateRaw(compressedData);

        return { status: BZ_OK, output: decompressed };

    } catch (e) {
        return { status: BZ_DATA_ERROR, output: null };
    }
}

/**
 * @public
 * Releases memory associated with the compression stream. Corresponds to C BZ2_bzCompressEnd.
 * @param {BzStream} strm - The compression stream state object.
 * @returns {number} BZ_OK on success.
 */
export function BZ2_bzCompressEnd(strm) {
    if (!strm) return BZ_PARAM_ERROR;

    strm._pako = null;
    strm._outputQueue = [];
    strm.next_in = null;
    strm.next_out = null;

    return BZ_OK;
}