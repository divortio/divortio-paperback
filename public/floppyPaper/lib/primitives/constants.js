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