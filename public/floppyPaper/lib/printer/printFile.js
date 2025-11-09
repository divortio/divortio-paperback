/**
 * @file printFile.js
 * @overview
 * Implements the top-level entry point for the file encoding process (State 1).
 * This function initiates the pipeline by cleaning up any previous state, setting
 * the input/output file paths, and setting the state machine's starting step.
 * * C Reference:
 * - Function: Printfile (in Printer.c)
 * - Global State: Initializes pb_printdata
 */
import { stopPrinting } from './stopPrinting.js';

/**
 * Sends the specified file to the encoder pipeline to generate bitmap pages.
 * @param {GlobalState} globalState - Global configuration variables (used for context).
 * @param {EncoderState} encoderState - The state descriptor for the current print job (t_printdata).
 * @param {File} inputFile - The input File object to be encoded (used to derive file path/name).
 * @param {string} outputBmpFile - The path/name for the output bitmap(s).
 * @returns {void}
 * @see C_EQUIVALENT: Printfile(const char *path, const char *bmp)
 */
export function printFile(globalState, encoderState, inputFile, outputBmpFile) {
    // 1. Stop printing of previous file, if any. (C: Stopprinting(&pb_printdata);)
    stopPrinting(encoderState);

    // 2. Prepare descriptor (C: memset/strncpy on pb_printdata)
    // C used the file path string; we use the File object's name property for file identification.
    encoderState.infile = inputFile.name;
    encoderState.outbmp = outputBmpFile;

    // 3. Start printing. (C: pb_printdata.step=1;)
    // Sets the state machine to start at prepareFileToPrint.
    encoderState.step = 1;
}