// src/printer/prepareFile.js

import { Reporterror } from '../logging/log.js';
import {MAXSIZE } from '../primitives/constants.js';
import { Stopprinting } from './print.js'; // Assuming Stopprinting will be in the main index
import { pb } from '../primitives/pb.js'; // Assuming Stopprinting will be in the main index

/**
 * Prepares the input file for printing by reading its metadata and content.
 * @param {object} print - The main print data object.
 * @param {File} file - The user-selected file object.
 * @returns {Promise<void>} A promise that resolves when the file is prepared, or rejects on error.
 */
export function prepareFileToPrint(print, file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            Reporterror("No input file provided.");
            Stopprinting(print);
            return reject(new Error("No input file provided."));
        }

        // 1. Get file attributes from the File object.
        print.origsize = file.size;
        print.modified = file.lastModified; // JS timestamp (milliseconds since epoch)
        print.infile = file.name;

        if (print.origsize === 0 || print.origsize > MAXSIZE) {
            Reporterror("Invalid file size.");
            Stopprinting(print);
            return reject(new Error("Invalid file size."));
        }

        // 2. Read the file content into a buffer.
        const reader = new FileReader();

        reader.onload = (e) => {
            // Allocate buffer for processed (compressed/encrypted) file.
            // In JS, we might not know the compressed size ahead of time,
            // so we'll handle this dynamically later. For now, we store the raw data.
            print.rawFileBuffer = e.target.result; // This is an ArrayBuffer

            // 3. Set options from the global state.
            print.compression = pb.compression;
            print.encryption = pb.encryption;
            print.printheader = pb.printheader;
            print.printborder = pb.printborder;
            print.redundancy = pb.redundancy;

            // 4. Move to the next step.
            print.step++;
            resolve();
        };

        reader.onerror = () => {
            Reporterror("Unable to read file.");
            Stopprinting(print);
            reject(new Error("Unable to read file."));
        };

        reader.readAsArrayBuffer(file);
    });
}