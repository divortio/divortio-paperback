import {InputFile} from "../inputFile.js";
import {FileTimePortable} from "../blocks/fileTimePortable.js";


export class InputFileBuffer {


    /**
     *
     * @param buffer {Uint8Array} - input file array buffer already read into memory
     * @param filename {string} -
     * @param mTime {number} -
     * @param fileSize {number} -
     *
     */
    constructor(
        buffer,
        filename,
        mTime,
        fileSize,
    ) {
        /**
         *
         * @type {Uint8Array}
         */
        this.buffer = buffer;

        /**
         *
         * @type {number}
         */
        this.fileSize = fileSize;
        /**
         *
         * @type {Uint8Array}
         */
        this.buffer = buffer;
        /**
         *
         * @type {number}
         */
        this.origsize = this.buffer.length;
        /**
         *
         * @type {number}
         */
        this.datasize = this.buffer.length;
        /**
         *
         * @type {number}
         */
        this.mtime = mTime;
        /**
         *
         * @type {number}
         */
        this.sizeAligned = (this.datasize + 15) & 0xFFFFFFF0;

    }

    /**
     *
     * @returns {FileTimePortable}
     */
    get modified() {
        return (new FileTimePortable()).setDateTime(this.mtime);
    }


}