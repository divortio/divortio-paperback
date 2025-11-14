import {FileTimePortable} from "./blocks/fileTimePortable.js";
import {bzBuffToBuffCompress} from "../gzip/bzBuffToBuffCompress.js";
import {crc16} from "../crc16/crc16.js";
import {BZ2_bzCompressEnd} from "../gzip/bz2API.js";

/**
 * Converts bytes to a human-readable string (KB, MB, GB) with 1 decimal precision.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    // Fixed to 1 decimal place and includes the unit suffix.
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export class FileBuffer {

    /**
     *
     * @param inBuf {Uint8Array}
     * @param fileName {string}
     * @param mtime {number}
     * @param compressionLevel {number}
     */
    constructor(inBuf, fileName, mtime= new Date().getTime(), compressionLevel=9 ) {

        /**
         *
         * @type {Uint8Array}
         */
        this.inputBuffer = inBuf;
        /**
         *
         * @type {number}
         */
        this.compressionLevel = compressionLevel;
        /**
         *
         * @type {string}
         */
        this.name = fileName || mtime.toString();
        /**
         *
         * @type {number}
         */
        this.mtime = mtime;


        console.log(`Read file: "${this.name}" (${formatBytes(inBuf.length)})`)

        /**
         *
         * @type {{origsize: number, outputBuffer: Uint8Array, datasize: number, alignedsize: number}}
         */
        const buf = bzBuffToBuffCompress(this.inputBuffer, this.compressionLevel);

        /**
         *
         * @type {number}
         */
        this.origsize = buf.origsize;
        /**
         * @public
         * @type {number}
         * @description Size of the compressed data.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.datasize = buf.datasize;
        /**
         *
         * @type {number}
         */
        this.alignedsize = buf.alignedsize;

        /**
         * @public
         * @type {Uint8Array | null}
         * @description Pointer to the main buffer holding the compressed/uncompressed file data.
         * @default null
         * @see C_TYPE: uchar *
         */
        this.buf = buf.outputBuffer;

        /**
         * @public
         * @type {number}
         * @description Size of the `buf` buffer, in bytes.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.bufsize = buf.alignedsize;

        if (compressionLevel > 0) {
            if (buf.alignedsize > this.origsize) {
                throw Error(`Compressed data size: ${formatBytes(this.alignedsize)} is larger than input size: ${formatBytes(this.origsize)}`);
            }
            const pctCompress = ((this.origsize - this.alignedsize)  / ((this.origsize + this.alignedsize) / 2)) * 100;
            console.log(`Compressed file: "${this.name}" from ${formatBytes(this.origsize)} to ${formatBytes(this.alignedsize)} (${pctCompress}%)`);
        }
        console.log(`Aligned buffer from ${formatBytes(this.datasize)} to ${formatBytes(this.alignedsize)}`)
        /**
         * @public
         * @type {number}
         * @description 16-bit CRC of the compressed/packed data in `buf` (used for encryption verification).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.bufcrc = crc16(this.buf.buffer, this.alignedsize);
    }

    /**
     *
     * @returns {FileTimePortable}
     */
    get modified(){
        return (new FileTimePortable()).setDateTime(this.mtime);
    }
}