import { printFile } from '../printer/print.js';

/**
 * @fileoverview
 * Main entry point for the FloppyPaper encoding (printing) pipeline.
 * This file exports the primary `encode` function.
 */

// =====================================================================================
// ENCODING
// =====================================================================================

/**
 * Creates and runs the print (encoding) pipeline.
 * This function is a generator that yields status updates.
 *
 * @param {File} file - The file object to encode.
 * @param  {{dpi: number,dotpercent: number,redundancy: number,compression: (number),encryption: (number),password: string,printheader: (number),printborder: (number)}} options - The encoding options.
 * @yields {object} A status object { status, percent, blob, filename, error }.
 */

export async function* encode(file, options) {
    // C: Printfile(pb_infile,pb_outfile);
    // C: pb_printdata.step=1;
    // C: while (pb_printdata.step!=0) Nextprintprocessingstep(&pb_printdata);

    // 1. Create a new Printer instance using the factory function.
    const printer = printFile(file, options);

    // 2. The printer's .run() method is the async generator state machine.
    // We yield* to pass its updates (status, percent, final bitmaps)
    // directly to the caller (the UI).
    yield* printer.run();
}