/**
 * @file bmpData.js
 * @overview
 * Defines the structure for a single generated bitmap file, collecting the binary
 * data and associated metadata from the encoding pipeline (State 7, Printnextpage).
 */

export class BMPData {
    /**
     * Creates an instance of BMPData.
     * @param fileName {string}
     * @param pageNumber {number}
     * @param data {Uint8Array}
     */
    constructor(fileName, pageNumber, data) {
        /**
         * @public
         * @type {string}
         * @description The calculated filename for this page (e.g., file_0001.bmp).
         * @default ""
         */
        this.fileName = fileName !== undefined ? fileName : "";

        /**
         * @public
         * @type {number}
         * @description The page number (1-based) this data corresponds to.
         * @default 0
         */
        this.pageNumber = pageNumber !== undefined ? pageNumber : 0;

        /**
         * @public
         * @type {Uint8Array}
         * @description The complete binary data of the 8-bit paletted BMP file.
         * @default new Uint8Array(0)
         */
        this.data = data instanceof Uint8Array ? data : new Uint8Array(0);
    }
}