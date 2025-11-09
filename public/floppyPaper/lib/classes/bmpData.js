/**
 * @file bmpData.js
 * @overview
 * Defines the structure for a single generated bitmap file, collecting the binary
 * data and associated metadata from the encoding pipeline (State 7, Printnextpage).
 */

export class BMPData {
    /**
     * Creates an instance of BMPData.
     * @param {object} [props={}] - Optional initial property values.
     */
    constructor(props = {}) {
        /**
         * @public
         * @type {string}
         * @description The calculated filename for this page (e.g., file_0001.bmp).
         * @default ""
         */
        this.fileName = props.fileName !== undefined ? props.fileName : "";

        /**
         * @public
         * @type {number}
         * @description The page number (1-based) this data corresponds to.
         * @default 0
         */
        this.pageNumber = props.pageNumber !== undefined ? props.pageNumber : 0;

        /**
         * @public
         * @type {Uint8Array}
         * @description The complete binary data of the 8-bit paletted BMP file.
         * @default new Uint8Array(0)
         */
        this.data = props.data instanceof Uint8Array ? props.data : new Uint8Array(0);
    }
}