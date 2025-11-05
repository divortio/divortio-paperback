/**
 * @fileoverview
 * Port of the `Decodebitmap` function from `Scanner.c`.
 * This is STEP 1 of the state machine in scanner.js.
 *
 * It:
 * 1. Takes a raw BMP file buffer.
 * 2. Uses the NEW `bmpDecode.js` to parse it *directly* into an 8-bit,
 * bottom-up, grayscale pixel buffer.
 * 3. Validates the bitmap dimensions.
 * 4. Calls `startBitmapDecoding` to initialize the pdata struct
 * with the 8-bit grayscale data.
 * 5. Sets pdata.step = 2 to hand off to the next step in the scanner.js
 * state machine.
 *
 * This file no longer needs processDIB.js.
 */

// bmpDecode is the JS equivalent of C's fopen, fread, and manual header parsing.
// This now imports the 8-bit grayscale-native version.
import { decode } from '../bmpImage/bmpDecode.js';
// processDIB is no longer needed.
// import { processDIB } from './processDIB.js'; // <-- DELETED
import { Message, Reporterror } from '../logging/log.js';
// We now call startBitmapDecoding directly.
import { startBitmapDecoding } from '../decoder/src/startBitmapDecoding.js';

/**
 * @typedef {import('../decoder/src/getGridIntensity.js').PData} PData
 */

/**
 * Opens and decodes a bitmap from an ArrayBuffer.
 * Corresponds to `Decodebitmap` in `Scanner.c`.
 * This is STEP 1 of the state machine.
 *
 * @param {PData} pdata - The main processing data object.
 * @param {ArrayBuffer} fileBuffer - The ArrayBuffer of the BMP file.
 * @param {boolean} pb_bestquality - Global flag for best quality mode.
 * @returns {number} 0 on success, -1 on error.
 */
export function decodeBitmap(pdata, fileBuffer, pb_bestquality) {
    // C: char s[TEXTLEN+MAXPATH],fil[MAXFILE],ext[MAXEXT];
    // C: ...
    // C: sprintf(s,\"Reading %s%s...\",fil,ext);
    Message(`Reading bitmap...`, 0);

    try {
        // C: f=fopen... fread... pbfh=... pbih=...
        // This call now parses the BMP file *directly* into the 8-bit,
        // bottom-up, grayscale buffer that the C-pipeline expects.
        const bmpData = decode(fileBuffer); // Returns { data, width, height }

        // C: if (pbfh->bfType!=CHAR_BM || ...
        // C: pbih->biWidth<128 || pbih->biWidth>32768 ||
        // C: pbih->biHeight<128 || pbih->biHeight>32768
        // We only validate the dimensions, as bmpDecode.js has already
        // handled format validation (it supports 8-bit and 24-bit).
        if (
            (bmpData.width < 128 || bmpData.width > 32768) ||
            (bmpData.height < 128 || bmpData.height > 32768)
        ) {
            // C: sprintf(s,\"Unsupported bitmap type: %s%s\",fil,ext);
            Reporterror(`Unsupported bitmap dimensions. Must be between 128x128 and 32768x32768 pixels.`);
            // C: fclose(f); return -1; };
            pdata.step = 0; // Halt the state machine
            return -1;
        }

        // C: // Process bitmap.
        // C: ProcessDIB(data,pbfh->bfOffBits-sizeof(BITMAPFILEHEADER));
        //
        // This step is no longer needed. The `bmpData.data` is already
        // the 8-bit grayscale, bottom-up buffer.
        //
        // processDIB(pdata, bmpData, pb_bestquality); // <-- REMOVED

        // C: Startbitmapdecoding(&pb_procdata,data,sizex,sizey);
        //
        // We now call startBitmapDecoding directly, just as C's ProcessDIB did.
        // This function will set pdata.step = 1.
        startBitmapDecoding(pdata, bmpData.data, bmpData.width, bmpData.height, pb_bestquality);

        // C: ... (C code's next step is case 1: pdata->step++;)
        //
        // We replicate the C state machine's first step (`case 1:`),
        // which is to simply increment the step to 2. This hands off
        // control to the next step in the scanner.js `STEP_MAP` (getGridPosition).
        pdata.step = 2; // Advance to 'getGridPosition'
        return 0; // Success

    } catch (err) {
        Reporterror(err.message);
        pdata.step = 0; // Halt the state machine
        return -1; // Failure
    }
}