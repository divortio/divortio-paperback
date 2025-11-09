/**
 * @file nodeFile.js
 * @overview
 * Implements a mock class for the browser's native File object, enabling the
 * encoding pipeline (which relies on File.name, File.size, and File.arrayBuffer())
 * to run correctly in a Node.js environment by using the native 'fs' module.
 */

// Import Node.js built-in modules for file system access
import * as fs from 'fs';
import * as path from 'path';

// Note: In Node.js environment, the fs module provides synchronous and asynchronous APIs.
// We use synchronous reads in the constructor to load metadata, but asynchronous reading
// in arrayBuffer() to match the browser's Promise-based API.

export class NodeFile {
    /**
     * @private
     * @type {string}
     */
    #filePath;

    /**
     * @private
     * @type {Buffer | null}
     * The raw file content as a Node.js Buffer.
     */
    #fileContent = null;

    /**
     * Creates an instance of NodeFile by reading the file synchronously to get metadata.
     * @param {string} filePath - The full path to the local file.
     */
    constructor(filePath) {
        if (typeof filePath !== 'string' || !filePath) {
            throw new Error("NodeFile requires a valid file path.");
        }
        this.#filePath = filePath;

        // 1. Determine size and ensure file exists (synchronous operation)
        try {
            const stats = fs.statSync(this.#filePath);
            this.size = stats.size;
        } catch (e) {
            this.size = 0;
            throw new Error(`File system error: Unable to access file at ${this.#filePath}.`);
        }

        // 2. Set file name
        this.name = path.basename(this.#filePath);
    }

    /**
     * @public
     * @type {string}
     * @description The name of the file (equivalent to File.name).
     */
    name;

    /**
     * @public
     * @type {number}
     * @description The size of the file in bytes (equivalent to File.size).
     */
    size;

    /**
     * @public
     * Reads the entire file contents asynchronously into a standard JavaScript ArrayBuffer.
     * This emulates the browser's File.arrayBuffer() method.
     * @returns {Promise<ArrayBuffer>} A promise that resolves with the file's content as an ArrayBuffer.
     */
    async arrayBuffer() {
        if (!this.#fileContent) {
            // Use the promise-based API for asynchronous reading, matching browser behavior.
            const fsPromises = fs.promises;
            this.#fileContent = await fsPromises.readFile(this.#filePath);
        }

        // Convert the Node.js Buffer to a standard ArrayBuffer.
        // The slice method on Buffer returns a new Buffer which shares memory
        // with the original ArrayBuffer, improving performance.
        return this.#fileContent.buffer.slice(
            this.#fileContent.byteOffset,
            this.#fileContent.byteOffset + this.#fileContent.byteLength
        );
    }
}