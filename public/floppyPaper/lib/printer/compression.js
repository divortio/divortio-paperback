// src/printer/compression.js

import { Reporterror, Message } from '../logging/log.js';
import { Stopprinting } from './print.js';
import { gzip } from '../../vendor/pako/dist/pako.esm.js';

/**
 * Compresses the file data using pako (gzip).
 * @param {object} print - The main print data object.
 * @returns {void}
 */
export function compressFile(print) {
    // If no compression is requested, just copy the raw buffer and move on.
    if (print.compression === 0) {
        Message("Reading file (compression disabled)", 100);
        print.buf = new Uint8Array(print.rawFileBuffer);
        print.datasize = print.origsize;
        print.step = 5; // Skip to encryption step
        return;
    }

    Message("Compressing file...", 50);

    try {
        // Use pako for compression (platform-independent)
        // Pass a Uint8Array view of the raw ArrayBuffer
        const compressedArray = gzip(new Uint8Array(print.rawFileBuffer));

        // Check if compression was effective. If not, use the original data.
        if (compressedArray.length >= print.origsize) {
            Message("Compressed file is larger. Using original data.", 100);
            print.buf = new Uint8Array(print.rawFileBuffer);
            print.datasize = print.origsize;
            print.compression = 0; // Turn off compression flag for the superblock
        } else {
            print.buf = compressedArray;
            print.datasize = compressedArray.length;
            Message("Compression complete.", 100);
        }

        // Align size of data to the next 16-byte border for encryption.
        const alignedSize = (print.datasize + 15) & ~15; // ~15 is 0xFFFFFFF0
        if (print.datasize < alignedSize) {
            const alignedBuffer = new Uint8Array(alignedSize);
            alignedBuffer.set(print.buf);
            print.buf = alignedBuffer;
        }
        print.alignedsize = print.buf.length;

        // Cleanup and move to the next step.
        delete print.rawFileBuffer;
        print.step = 5; // Move to encryption step

    } catch (e) {
        Reporterror("Unable to compress data: " + e.message);
        Stopprinting(print);
    }
}