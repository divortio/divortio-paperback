/**
 * @file encoderState.js
 * @overview
 * This class mirrors the C structure `t_printdata`, which serves as the primary
 * control structure for the entire **encoding and printing** pipeline. It manages
 * the state machine (`step`), buffers (raw data, output bitmap), file metadata,
 * compression state, and grid layout parameters necessary to generate the paper
 * backup image.
 *
 * It is located in the C source code in `wikinaut/paperback-cli/paperbak.h`.
 *
 * C Reference:
 * typedef struct t_printdata
 */
import { HeaderBlock } from './headerBlock.js';
import { BzStream } from '../gzip/bzStream.js';
import { PACKLEN } from './constants.js';

export class EncoderState {
    /**
     * @typedef {object} FileTimePortable
     * @property {number} dwLowDateTime - Low 32-bits of the 64-bit file time.
     * @property {number} dwHighDateTime - High 32-bits of the 64-bit file time.
     */

    /**
     * Creates an instance of EncoderState, initializing properties to their C-style defaults.
     * @param {object} [props={}] - Optional initial property values.
     */
    constructor(props = {}) {
        /**
         * @public
         * @type {number}
         * @description Next data printing step in the internal state machine (0 - idle, 1 - start, 8 - finish).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.step = props.step !== undefined ? props.step : 0;

        /**
         * @public
         * @type {string}
         * @description Name of the input file to be encoded.
         * @default ""
         * @see C_TYPE: char[MAXPATH]
         */
        this.infile = props.infile !== undefined ? props.infile : "";

        /**
         * @public
         * @type {string}
         * @description Name of the output bitmap file. If empty, output is assumed to be direct to printer (not supported in JS port).
         * @default ""
         * @see C_TYPE: char[MAXPATH]
         */
        this.outbmp = props.outbmp !== undefined ? props.outbmp : "";

        /**
         * @public
         * @type {null}
         * @description Placeholder for the C file pointer (FILE *) for the input file.
         * @default null
         * @see C_TYPE: FILE *
         */
        this.hfile = null;

        /**
         * @public
         * @type {FileTimePortable}
         * @description Last modification time of the input file.
         * @default {dwLowDateTime: 0, dwHighDateTime: 0}
         * @see C_TYPE: FileTimePortable
         */
        this.modified = props.modified !== undefined
            ? { dwLowDateTime: props.modified.dwLowDateTime || 0, dwHighDateTime: props.modified.dwHighDateTime || 0 }
            : { dwLowDateTime: 0, dwHighDateTime: 0 };

        /**
         * @public
         * @type {number}
         * @description File attributes of the input file.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.attributes = props.attributes !== undefined ? props.attributes : 0;

        /**
         * @public
         * @type {number}
         * @description Original, uncompressed file size, in bytes.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.origsize = props.origsize !== undefined ? props.origsize : 0;

        /**
         * @public
         * @type {number}
         * @description Amount of data read from the input file so far, in bytes.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.readsize = props.readsize !== undefined ? props.readsize : 0;

        /**
         * @public
         * @type {number}
         * @description Size of the processed (compressed or uncompressed) data, in bytes.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.datasize = props.datasize !== undefined ? props.datasize : 0;

        /**
         * @public
         * @type {number}
         * @description Processed data size aligned to the next 16-byte boundary (required for AES).
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.alignedsize = props.alignedsize !== undefined ? props.alignedsize : 0;

        /**
         * @public
         * @type {number}
         * @description Size of the processed data that fits onto a single print page, in bytes.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.pagesize = props.pagesize !== undefined ? props.pagesize : 0;

        /**
         * @public
         * @type {number}
         * @description Compression level: 0: none, 1: fast, 2: maximal.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.compression = props.compression !== undefined ? props.compression : 0;

        /**
         * @public
         * @type {number}
         * @description Encryption flag: 0: none, 1: encrypt (AES-256).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.encryption = props.encryption !== undefined ? props.encryption : 0;

        /**
         * @public
         * @type {number}
         * @description Flag to control printing of header and footer (1: print, 0: suppress).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.printheader = props.printheader !== undefined ? props.printheader : 0;

        /**
         * @public
         * @type {number}
         * @description Flag to control printing of a border around the data grid.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.printborder = props.printborder !== undefined ? props.printborder : 0;

        /**
         * @public
         * @type {number}
         * @description Data redundancy ratio (e.g., 5 means 1 checksum block per 5 data blocks).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.redundancy = props.redundancy !== undefined ? props.redundancy : 0;

        /**
         * @public
         * @type {Uint8Array | null}
         * @description Pointer to the main buffer holding the compressed/uncompressed file data.
         * @default null
         * @see C_TYPE: uchar *
         */
        this.buf = null;

        /**
         * @public
         * @type {number}
         * @description Size of the `buf` buffer, in bytes.
         * @default 0
         * @see C_TYPE: uint32_t (4 bytes)
         */
        this.bufsize = props.bufsize !== undefined ? props.bufsize : 0;

        /**
         * @public
         * @type {Uint8Array | null}
         * @description Pointer to the read buffer (PACKLEN bytes long) used for chunking file I/O.
         * @default null
         * @see C_TYPE: uchar * (PACKLEN size)
         */
        this.readbuf = null;

        /**
         * @public
         * @type {BzStream}
         * @description Compression control structure (emulating bz_stream).
         * @default new BzStream()
         * @see C_TYPE: bz_stream
         */
        this.bzstream = props.bzstream instanceof BzStream ? props.bzstream : new BzStream();

        /**
         * @public
         * @type {number}
         * @description 16-bit CRC of the compressed/packed data in `buf` (used for encryption verification).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.bufcrc = props.bufcrc !== undefined ? props.bufcrc : 0;

        /**
         * @public
         * @type {HeaderBlock}
         * @description The identification block to be printed at the beginning of each page.
         * @default new HeaderBlock()
         * @see C_TYPE: t_superdata
         */
        this.superdata = props.superdata instanceof HeaderBlock ? props.superdata : new HeaderBlock();

        /**
         * @public
         * @type {number}
         * @description First page to print (0-based).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.frompage = props.frompage !== undefined ? props.frompage : 0;

        /**
         * @public
         * @type {number}
         * @description Last page to print (0-based, inclusive).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.topage = props.topage !== undefined ? props.topage : 0;

        /**
         * @public
         * @type {number}
         * @description Printer X resolution, pixels per inch (DPI).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.ppix = props.ppix !== undefined ? props.ppix : 0;

        /**
         * @public
         * @type {number}
         * @description Printer Y resolution, pixels per inch (DPI).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.ppiy = props.ppiy !== undefined ? props.ppiy : 0;

        /**
         * @public
         * @type {number}
         * @description Total width of the printable area (and generated bitmap) in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.width = props.width !== undefined ? props.width : 0;

        /**
         * @public
         * @type {number}
         * @description Total height of the printable area (and generated bitmap) in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.height = props.height !== undefined ? props.height : 0;

        /**
         * @public
         * @type {number}
         * @description Height of the title line/header area, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.extratop = props.extratop !== undefined ? props.extratop : 0;

        /**
         * @public
         * @type {number}
         * @description Height of the info line/footer area, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.extrabottom = props.extrabottom !== undefined ? props.extrabottom : 0;

        /**
         * @public
         * @type {number}
         * @description Palette index of the dots color (0 for black on paper, 64 for dark gray on bitmap).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.black = props.black !== undefined ? props.black : 0;

        /**
         * @public
         * @type {number}
         * @description Left page margin, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.borderleft = props.borderleft !== undefined ? props.borderleft : 0;

        /**
         * @public
         * @type {number}
         * @description Right page margin, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.borderright = props.borderright !== undefined ? props.borderright : 0;

        /**
         * @public
         * @type {number}
         * @description Top page margin, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.bordertop = props.bordertop !== undefined ? props.bordertop : 0;

        /**
         * @public
         * @type {number}
         * @description Bottom page margin, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.borderbottom = props.borderbottom !== undefined ? props.borderbottom : 0;

        /**
         * @public
         * @type {number}
         * @description Distance between dots in X-direction, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.dx = props.dx !== undefined ? props.dx : 0;

        /**
         * @public
         * @type {number}
         * @description Distance between dots in Y-direction, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.dy = props.dy !== undefined ? props.dy : 0;

        /**
         * @public
         * @type {number}
         * @description Dot size in X-direction, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.px = props.px !== undefined ? props.px : 0;

        /**
         * @public
         * @type {number}
         * @description Dot size in Y-direction, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.py = props.py !== undefined ? props.py : 0;

        /**
         * @public
         * @type {number}
         * @description Grid dimension: number of blocks that fit horizontally.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.nx = props.nx !== undefined ? props.nx : 0;

        /**
         * @public
         * @type {number}
         * @description Grid dimension: number of blocks that fit vertically.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.ny = props.ny !== undefined ? props.ny : 0;

        /**
         * @public
         * @type {number}
         * @description Width of the border around the data grid, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.border = props.border !== undefined ? props.border : 0;

        /**
         * @public
         * @type {null}
         * @description Pointer to DIB bits (Windows-specific, not used in this port).
         * @default null
         * @see C_TYPE: uchar *
         */
        this.dibbits = null;

        /**
         * @public
         * @type {Uint8Array | null}
         * @description Pointer to the buffer holding the final file bitmap bits (for BMP file output).
         * @default null
         * @see C_TYPE: uchar *
         */
        this.drawbits = null;

        /**
         * @public
         * @type {Uint8Array}
         * @description Buffer to store the Bitmap Info Header and color palette. Uses constant size.
         * @default new Uint8Array(1084)
         * @see C_TYPE: uchar[sizeof(BITMAPINFO)+256*sizeof(RGBQUAD)]
         */
        this.bmi = props.bmi instanceof Uint8Array
            ? props.bmi
            : new Uint8Array(1084);

        /**
         * @public
         * @type {number}
         * @description Flag indicating if the print job has started (Windows-specific, 0 or 1).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.startdoc = props.startdoc !== undefined ? props.startdoc : 0;

        /**
         * @public
         * @type {Array<BMPData>}
         * @description Storage array for all generated BMP files (pages). This replaces the C program's direct disk I/O.
         * @default []
         */

        this.outputFiles = props.outputFiles instanceof Array ? props.outputFiles : [];
    }
}