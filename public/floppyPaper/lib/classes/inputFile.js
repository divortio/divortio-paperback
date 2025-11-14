import {FileTimePortable} from "./blocks/fileTimePortable.js";

/**
 * @public
 * @type {number}
 * @description Length of the read buffer (64 KB) used for chunking file I/O during encoding/compression.
 * @see C_VAR: PACKLEN (65536)
 */
export const PACKLEN = 65536;

export class InputFile {

    /**
     * @public
     * @type {File}
     * @description File or file like object
     * @see C_TYPE: char[MAXPATH]
     */
    file;

    /**
     * @public
     * @type {string}
     * @description Name of the input file to be encoded.
     * @see C_TYPE: char[MAXPATH]
     */
    filename;


    /**
     * @public
     * @type {string}
     * @description Name of the input file to be encoded.
     * @see C_TYPE: char[MAXPATH]
     */
     name;


    /**
     * @public
     * @type {number}
     * @description timestamp file last modified
     */
    mtime;

    /**
     * @public
     * @type {number}
     * @description Original, uncompressed file size, in bytes.
     * @default 0
     * @see C_TYPE: uint32_t (4 bytes)
     */
    size;



    /**
     *
     * @param file {File} - File or file like object
     * @param filename {string} - filename or inherited from File
     * @param mtime {number} - last modified timestamp or inherited from File
     * @param size {number} - size in bytes or inherited from File
     */
    constructor(file, filename, mtime, size) {
        this.file = file;
        this.filename = filename || file.name;
        this.name = this.filename;
        this.mtime = mtime || file.lastModified;
        this.size = size || file.size;
    }

    /**
     *
     * @returns {FileTimePortable}
     */
    get modified(){
        return (new FileTimePortable()).setDateTime(this.mtime);
    }


    /**
     *
     * @returns {Promise<Uint8Array<ArrayBuffer>>}
     */
    async readFile(){
        // Read the entire file content into a buffer. (Simulating C I/O completion)
        const rawInputBuffer = await this.file.arrayBuffer();
        return new Uint8Array(rawInputBuffer);
    }


}