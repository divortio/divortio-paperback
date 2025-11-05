/**
 * @file globalState.js
 * @overview
 * This class encapsulates all global configuration variables prefixed with 'pb_'
 * in the original C source code (`main.c` and `paperbak.h`). These variables
 * control program behavior for encoding, decoding, and default settings.
 *
 * C Reference:
 * Global variables prefixed with `pb_` declared in `paperbak.h`
 * and initialized in `main.c`.
 */
class GlobalState {
    /**
     * Creates an instance of GlobalState, initializing properties to their documented C-style defaults.
     * @param {object} [props={}] - Optional initial property values.
     */
    constructor(props = {}) {
        /**
         * @public
         * @type {number}
         * @description Printer X resolution, in DPI (may be 0 for unset).
         * @default 0
         * @see C_TYPE: int
         */
        this.resx = props.resx !== undefined ? props.resx : 0;

        /**
         * @public
         * @type {number}
         * @description Printer Y resolution, in DPI (may be 0 for unset).
         * @default 0
         * @see C_TYPE: int
         */
        this.resy = props.resy !== undefined ? props.resy : 0;

        /**
         * @public
         * @type {number}
         * @description Orientation of bitmap (-1: unknown).
         * @default 0
         * @see C_TYPE: int
         */
        this.orientation = props.orientation !== undefined ? props.orientation : 0;

        /**
         * @public
         * @type {string}
         * @description Last selected file to read (input file for encoding/decoding metadata).
         * @default ""
         * @see C_TYPE: char[MAXPATH]
         */
        this.infile = props.infile !== undefined ? props.infile : "";

        /**
         * @public
         * @type {string}
         * @description Last selected bitmap file to save (output bitmap for encoding).
         * @default ""
         * @see C_TYPE: char[MAXPATH]
         */
        this.outBmp = props.outBmp !== undefined ? props.outBmp : "";

        /**
         * @public
         * @type {string}
         * @description Last selected bitmap file to read (input bitmap for decoding).
         * @default ""
         * @see C_TYPE: char[MAXPATH]
         */
        this.inBmp = props.inBmp !== undefined ? props.inBmp : "";

        /**
         * @public
         * @type {string}
         * @description Last selected data file to save (output file after decoding).
         * @default ""
         * @see C_TYPE: char[MAXPATH]
         */
        this.outfile = props.outfile !== undefined ? props.outfile : "";

        /**
         * @public
         * @type {string}
         * @description Encryption password.
         * @default ""
         * @see C_TYPE: char[PASSLEN] (33 bytes max)
         */
        this.password = props.password !== undefined ? props.password : "";

        /**
         * @public
         * @type {number}
         * @description Dot raster, dots per inch (DPI) for encoding.
         * @default 200
         * @see C_TYPE: int
         */
        this.dpi = props.dpi !== undefined ? props.dpi : 200;

        /**
         * @public
         * @type {number}
         * @description Dot size, as percentage of maximum dot size in pixels.
         * @default 70
         * @see C_TYPE: int
         */
        this.dotPercent = props.dotPercent !== undefined ? props.dotPercent : 70;

        /**
         * @public
         * @type {number}
         * @description Compression level: 0: none, 1: fast, 2: maximal.
         * @default 0
         * @see C_TYPE: int
         */
        this.compression = props.compression !== undefined ? props.compression : 0;

        /**
         * @public
         * @type {number}
         * @description Data redundancy ratio (e.g., 5 means 1 checksum block per 5 data blocks).
         * @default 5
         * @see C_TYPE: int
         */
        this.redundancy = props.redundancy !== undefined ? props.redundancy : 5;

        /**
         * @public
         * @type {number}
         * @description Flag to print file name, date/time, size, and page number header/footer.
         * @default 0
         * @see C_TYPE: int
         */
        this.printHeader = props.printHeader !== undefined ? props.printHeader : 0;

        /**
         * @public
         * @type {number}
         * @description Flag to print a black border around the data grid.
         * @default 0
         * @see C_TYPE: int
         */
        this.printBorder = props.printBorder !== undefined ? props.printBorder : 0;

        /**
         * @public
         * @type {number}
         * @description Flag to automatically save completely restored files.
         * @default 1
         * @see C_TYPE: int
         */
        this.autoSave = props.autoSave !== undefined ? props.autoSave : 1;

        /**
         * @public
         * @type {number}
         * @description Flag to enable search for best possible decoding quality (slower).
         * @default 0
         * @see C_TYPE: int
         */
        this.bestQuality = props.bestQuality !== undefined ? props.bestQuality : 0;

        /**
         * @public
         * @type {number}
         * @description Flag to enable AES encryption of data before printing.
         * @default 0
         * @see C_TYPE: int
         */
        this.encryption = props.encryption !== undefined ? props.encryption : 0;

        /**
         * @public
         * @type {number}
         * @description Flag to enter passwords in open text instead of suppressing output.
         * @default 0
         * @see C_TYPE: int
         */
        this.openText = props.openText !== undefined ? props.openText : 0;

        /**
         * @public
         * @type {number}
         * @description Margin units: 0:undef, 1:inches, 2:millimeters.
         * @default 0
         * @see C_TYPE: int
         */
        this.marginUnits = props.marginUnits !== undefined ? props.marginUnits : 0;

        /**
         * @public
         * @type {number}
         * @description Left printer page margin.
         * @default 0
         * @see C_TYPE: int
         */
        this.marginLeft = props.marginLeft !== undefined ? props.marginLeft : 0;

        /**
         * @public
         * @type {number}
         * @description Right printer page margin.
         * @default 0
         * @see C_TYPE: int
         */
        this.marginRight = props.marginRight !== undefined ? props.marginRight : 0;

        /**
         * @public
         * @type {number}
         * @description Top printer page margin.
         * @default 0
         * @see C_TYPE: int
         */
        this.marginTop = props.marginTop !== undefined ? props.marginTop : 0;

        /**
         * @public
         * @type {number}
         * @description Bottom printer page margin.
         * @default 0
         * @see C_TYPE: int
         */
        this.marginBottom = props.marginBottom !== undefined ? props.marginBottom : 0;

        /**
         * @public
         * @type {number}
         * @description Number of pages to decode (used for CLI batch processing).
         * @default 0
         * @see C_TYPE: int
         */
        this.nPages = props.nPages !== undefined ? props.nPages : 0;
    }
}