/**
 * @fileoverview
 * Holds the single, mutable, global `pb` settings object, which
 * replaces the C global variables from the original project.
 * This object is imported and modified by various modules.
 */

/**
 * Global settings object to replace C global variables.
 * C: `pb` struct and various global `pb_` variables.
 */
export const pb = {
    // Printer settings
    resx: 0,
    resy: 0,

    // Decoder settings
    orientation: -1,

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