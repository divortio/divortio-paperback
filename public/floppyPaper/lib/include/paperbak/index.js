/**
 * @fileoverview
 * This file contains constants and type definitions ported from
 * the C header file `paperbak.h`. It defines the core data
 * structures and "magic numbers" used throughout the application.
 */

// General Definitions
export const ECC_SIZE = 32;
export const FILENAME_SIZE = 64;
export const VERSIONHI = 1;
export const VERSIONLO = 2;
export const TEXTLEN = 256;
export const PASSLEN = 33;
export const AESKEYLEN = 24;

// Data Properties
export const NDOT = 32;
export const NDATA = 90;
export const MAXSIZE = 0x0FFFFF80;
export const SUPERBLOCK = 0xFFFFFFFF;
export const NGROUPMIN = 2;
export const NGROUPMAX = 10;
export const NFILE = 5; // Max simultaneous files

// Mode bits
export const PBM_COMPRESSED = 0x01;
export const PBM_ENCRYPTED = 0x02;

// Decoder Modes
export const M_BEST = 0x00000001;

// Global settings object (replaces C global variables)
export const pb = {
    // File Processor (pb_fproc is now in fileproc/fileState.js)

    // Printer
    resx: 0,
    resy: 0,
    // (pb_printdata is now a factory function)

    // Decoder
    orientation: -1,
    // (pb_procdata is now in decoder/index.js)

    // User Interface / Settings
    infile: '',
    outbmp: '',
    inbmp: '',
    outfile: '',
    password: '',
    dpi: 200,
    dotpercent: 70,
    compression: 0, // 0: none, 1: fast, 2: maximal
    redundancy: 5,
    printheader: 0,
    printborder: 0,
    autosave: 1, // 1 = true
    bestquality: 0,
    encryption: 0,
    opentext: 0,
    marginunits: 0,
    marginleft: 0,
    marginright: 0,
    margintop: 0,
    marginbottom: 0,
};

// --- Helper Functions ---

/**
 * C: int max (int a, int b)
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function max(a, b) {
    return a > b ? a : b;
}

/**
 * C: int min (int a, int b)
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function min(a, b) {
    return a < b ? a : b;
}


// --- Factory Functions for C Structs ---
// These replace C's `memset(&struct, 0, ...)` to initialize new objects.

/**
 * Creates a new, zero-filled t_data object (128 bytes).
 * C: t_data
 * @returns {Uint8Array}
 */
export function createDataBlock() {
    return new Uint8Array(128); // 4 + 90 + 2 + 32
}

/**
 * Creates a new, zero-filled t_superblock object.
 * C: t_superblock
 * @returns {import('./paperbak/index.js').t_superblock}
 */
export function createSuperblock() {
    return {
        addr: 0,
        datasize: 0,
        pagesize: 0,
        origsize: 0,
        mode: 0,
        page: 0,
        modified: 0n, // Use BigInt for 64-bit FILETIME
        attributes: 0,
        filecrc: 0,
        name: new Uint8Array(FILENAME_SIZE),
        ngroup: 0,
    };
}

/**
 * Creates a new, zero-filled t_block object (for the blocklist).
 * C: t_block
 * @returns {import('./paperbak/index.js').t_block}
 */
export function createBlock() {
    return {
        addr: 0,
        recsize: 0,
        data: new Uint8Array(NDATA),
    };
}

/**
 * Creates a new, zero-filled t_fproc object (file processor state).
 * C: t_fproc
 * @returns {import('./paperbak/index.js').t_fproc}
 */
export function createFproc() {
    return {
        busy: 0,
        name: new Uint8Array(FILENAME_SIZE),
        modified: 0n,
        attributes: 0,
        datasize: 0,
        pagesize: 0,
        origsize: 0,
        mode: 0,
        npages: 0,
        filecrc: 0,
        page: 0,
        ngroup: 0,
        minpageaddr: 0,
        maxpageaddr: 0,
        nblock: 0,
        ndata: 0,
        datavalid: null, // Will be new Uint8Array(nblock)
        data: null,      // Will be new Uint8Array(nblock * NDATA)
        goodblocks: 0,
        badblocks: 0,
        restoredbytes: 0,
        recoveredblocks: 0,
        rempages: new Uint8Array(8), // C: int rempages[8]
    };
}

/**
 * Creates a new, zero-filled t_procdata object (decoder state).
 * C: t_procdata
 * @returns {import('../decoder/getAngle.js').PData}
 */
export function createPData() {
    return {
        step: 0,
        mode: 0,
        data: null, // Uint8Array
        sizex: 0,
        sizey: 0,
        gridxmin: 0,
        gridxmax: 0,
        gridymin: 0,
        gridymax: 0,
        searchx0: 0,
        searchx1: 0,
        searchy0: 0,
        searchy1: 0,
        cmean: 0,
        cmin: 0,
        cmax: 0,
        sharpfactor: 0.0,
        xpeak: 0.0,
        xstep: 0.0,
        xangle: 0.0,
        ypeak: 0.0,
        ystep: 0.0,
        yangle: 0.0,
        blockborder: 0.0,
        bufdx: 0,
        bufdy: 0,
        buf1: null, // Uint8Array
        buf2: null, // Uint8Array
        bufx: null, // Int32Array
        bufy: null, // Int32Array
        unsharp: null,
        sharp: null,
        blockxpeak: 0.0,
        blockxstep: 0.0,
        blockypeak: 0.0,
        blockystep: 0.0,
        nposx: 0,
        nposy: 0,
        posx: 0,
        posy: 0,
        uncorrected: null, // new Uint8Array(128)
        blocklist: [],     // Array of t_block objects
        superblock: createSuperblock(),
        maxdotsize: 0,
        orientation: -1,
        ngood: 0,
        nbad: 0,
        nsuper: 0,
        nrestored: 0,
    };
}

/**
 * Creates a new, zero-filled t_printdata object (printer state).
 * C: t_printdata
 * @returns {import('../printer/initializePrint.js').PrintData}
 */
export function createPrintdata() {
    return {
        step: 0,
        infile: '',
        outbmp: '',
        hfile: null, // Will be File object
        modified: 0n,
        attributes: 0,
        origsize: 0,
        readsize: 0,
        datasize: 0,
        alignedsize: 0,
        pagesize: 0,
        compression: 0,
        encryption: 0,
        printheader: 0,
        printborder: 0,
        redundancy: 0,
        buf: null, // Uint8Array
        bufsize: 0,
        readbuf: null, // Uint8Array
        // bzstream is handled by compression library
        bufcrc: 0,
        superdata: createDataBlock(), // This is a t_superdata block
        frompage: 0,
        topage: 0,
        ppix: 0,
        ppiy: 0,
        width: 0,
        height: 0,
        extratop: 0,
        extrabottom: 0,
        black: 0,
        borderleft: 0,
        borderright: 0,
        bordertop: 0,
        borderbottom: 0,
        dx: 0,
        dy: 0,
        px: 0,
        py: 0,
        nx: 0,
        ny: 0,
        border: 0,
        drawbits: null, // Uint8Array
        bmi: new Uint8Array(1078), // C: uchar bmi[sizeof(BITMAPINFO)+256*sizeof(RGBQUAD)];
    };
}