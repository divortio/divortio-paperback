import {PACKLEN} from "../inputFile.js";
import {Reporterror} from "../../logging/log.js";
import {stopPrinting} from "../../printer/stopPrinting.js";

/**
 * @public
 * @type {number}
 * @description Length of the read buffer (64 KB) used for chunking file I/O during encoding/compression.
 * @see C_VAR: PACKLEN (65536)
 */
export const PACKLEN = 65536;




export class GenericBuffer {

    /**
     *
     * @param size {number} - size in bytes of the buffer.
     */
    constructor(size) {
        /**
         *
         * @type {number}
         */
        this.size =   size
        /**
         *
         * @type {Uint8Array}
         */
        this.buffer = null;
        /**
         *
         * @type {number}
         */
        this.bytesRead = 0;
        /**
         *
         * @type {Uint8Array}
         * @private
         */
        this._buffer = null;
        /**
         *
         * @type {boolean}
         */
        this.isCleared = false;
    }

    /**
     * Lazily allocates and returns the Uint8Array buffer that holds the raw file data
     * This saves memory until the buffer is absolutely needed for read/write.
     * @returns {Uint8Array} The data buffer array, sized: (this.size + 15) & 0xFFFFFFF0.
     */
    get buffer() {
        if (this._buffer === null) {
            this._buffer = new Uint8Array(this.size);
        }
        return this._buffer;
    }


    /**
     *
     * @returns {boolean} - if buffer has been read: this.size === this.bytesRead
     */
    get isRead() {
        return this.size === this.bytesRead;
    }
    /**
     *
     * @param arrayLike { ArrayLike<number>} - input file: const arrayBuffer = await file.arrayBuffer();
     * @param offset {number|null}
     * @return {Uint8Array}
     */
    setBuffer(arrayLike, offset=null) {
        this.buffer.set(arrayLike, offset);
        return this.buffer;
    }

    /**
     *
     * @param size {number} - number of bytes to read
     * @returns {Uint8Array<ArrayBufferLike>}
     */
    readBytes(size=PACKLEN) {
        if (this.isCleared === true) {
            throw new Error(`Buffer has been cleared and cannot be read. Original size was: ${this.size}`);
        }
        const b =  this.buffer.subarray(this.bytesRead, this.bytesRead + size);
        this.bytesRead += size;
        if (b.length !== size) {
            throw Error(`Data chunk mismatch during read. ${b.length} bytes read, expected: ${size}.`);
        }
        return b;
    }

    /**
     *
     * @return {boolean}
     */
    clear() {
        this._buffer = null;
        this.isCleared = true;
        return this.isCleared;
    }



}