// public/js/lib/include/paperbak/index.js

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

// --- START OF FIX ---
// Added the missing NFILE constant.
// This defines the maximum number of simultaneous files being decoded.
export const NFILE = 5;
// --- END OF FIX ---

export const PBM_COMPRESSED = 0x01;
export const PBM_ENCRYPTED = 0x02;

// Decoder Modes
export const M_BEST = 0x00000001;

// Global state object to replace C global variables
export const pb = {
    // File Processor
    fproc: [],

    // Printer
    resx: 0,
    resy: 0,
    printdata: {},

    // Decoder
    orientation: -1,
    procdata: {},

    // User Interface / Settings
    infile: '',
    outbmp: '',
    inbmp: '',
    outfile: '',
    password: '',
    dpi: 200,
    dotpercent: 70,
    compression: 0,
    redundancy: 5,
    printheader: 0,
    printborder: 0,
    autosave: 1,
    bestquality: 0,
    encryption: 0,
    opentext: 0,
    npages: 0,
};

// Utility functions that were in paperbak.h
export function max(a, b) {
    return a > b ? a : b;
}

export function min(a, b) {
    return a < b ? a : b;
}