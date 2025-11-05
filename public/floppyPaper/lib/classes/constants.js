/**
 * @file constants.js
 * @overview
 * Defines core constants derived from the C source code (paperbak.h, main.c, etc.).
 * These constants govern file structure, compression parameters, and cryptographic settings.
 */

// ===============================================
// DATA STRUCTURE / BLOCK GEOMETRY
// ===============================================

/**
 * @public
 * @type {number}
 * @description Maximal (theoretical) length of the input file allowed.
 * @see C_VAR: MAXSIZE (0x0FFFFF80)
 */
export const MAXSIZE = 0x0FFFFF80;

/**
 * @public
 * @type {number}
 * @description Size required by Reed-Solomon Error Correction Code (ECC) in bytes.
 * @see C_VAR: ECC_SIZE (32)
 */
export const ECC_SIZE = 32;

/**
 * @public
 * @type {number}
 * @description Maximum length of the file name string stored in the Header Block.
 * @see C_VAR: FILENAME_SIZE (64)
 */
export const FILENAME_SIZE = 64;

/**
 * @public
 * @type {number}
 * @description Block X and Y size in dots (defines the square dimension of the data grid per block).
 * @see C_VAR: NDOT (32)
 */
export const NDOT = 32;

/**
 * @public
 * @type {number}
 * @description Number of data payload bytes (uncompressed/encrypted) contained within a single Data Block.
 * @see C_VAR: NDATA (90)
 */
export const NDATA = 90;

/**
 * @public
 * @type {number}
 * @description Special address marker used to identify Header Blocks (t_superdata).
 * @see C_VAR: SUPERBLOCK (0xFFFFFFFF)
 */
export const SUPERBLOCK = 0xFFFFFFFF;

/**
 * @public
 * @type {number}
 * @description Length of the read buffer (64 KB) used for chunking file I/O during encoding/compression.
 * @see C_VAR: PACKLEN (65536)
 */
export const PACKLEN = 65536;

// ===============================================
// CRYPTOGRAPHIC / PROTOCOL
// ===============================================

/**
 * @public
 * @type {number}
 * @description AES key length in bytes (24 bytes = 192 bits). Defines the cipher as AES-192-CBC.
 * @see C_VAR: AESKEYLEN (24)
 */
export const AESKEYLEN = 24;

/**
 * @public
 * @type {number}
 * @description Maximum length of the encryption password, including the C null terminator. (32 characters max).
 * @see C_VAR: PASSLEN (33)
 */
export const PASSLEN = 33;

/**
 * @public
 * @type {number}
 * @description Bit flag (0x01) indicating the file data is compressed. Used in the 'mode' bitmask.
 * @see C_VAR: PBM_COMPRESSED (0x01)
 */
export const PBM_COMPRESSED = 0x01;

/**
 * @public
 * @type {number}
 * @description Bit flag (0x02) indicating the file data is encrypted. Used in the 'mode' bitmask.
 * @see C_VAR: PBM_ENCRYPTED (0x02)
 */
export const PBM_ENCRYPTED = 0x02;

// ===============================================
// REDUNDANCY / FILE PROCESSING
// ===============================================

/**
 * @public
 * @type {number}
 * @description Default redundancy group size: 1 recovery block is created for every N data blocks.
 * @see C_VAR: NGROUP (5)
 */
export const NGROUP = 5;

/**
 * @public
 * @type {number}
 * @description Minimum allowed redundancy group size (used for argument validation).
 * @see C_VAR: NGROUPMIN (2)
 */
export const NGROUPMIN = 2;

/**
 * @public
 * @type {number}
 * @description Maximum allowed redundancy group size (used for argument validation).
 * @see C_VAR: NGROUPMAX (10)
 */
export const NGROUPMAX = 10;

/**
 * @public
 * @type {number}
 * @description Maximum number of simultaneous files/pages handled by the file processor descriptor table.
 * @see C_VAR: NFILE (5)
 */
export const NFILE = 5;

// ===============================================
// DECODER / COMPUTER VISION
// ===============================================

/**
 * @public
 * @type {number}
 * @description Decoder mode flag (0x00000001): Enables the search for the best possible decoding quality.
 * @see C_VAR: M_BEST (0x00000001)
 */
export const M_BEST = 0x00000001;

/**
 * @public
 * @type {number}
 * @description Number of points used in the histogram for initial grid detection and geometry analysis (NHYST).
 * @see C_VAR: NHYST (1024)
 */
export const NHYST = 1024;

/**
 * @public
 * @type {number}
 * @description X size of the subblock (in dots/pixels) used for local dispersion checks during decoding.
 * @see C_VAR: SUBDX (8)
 */
export const SUBDX = 8;

/**
 * @public
 * @type {number}
 * @description Maximum dictionary size for LZW compression (2^16 entries).
 * @see C_VAR: DBITLEN (16)
 */
export const DBITLEN = 16;

/**
 * @public
 * @type {string}
 * @description The Windows BMP file signature header used for verifying bitmap files. (Hex value 0x4d42 or 'BM').
 * @see C_VAR: CHAR_BM ('BM' ASCII value)
 */
export const CHAR_BM = 'BM';