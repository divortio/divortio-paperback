/**
 * @fileoverview
 * Port of the `ProcessDIB` function from `Scanner.c`.
 * This function converts a parsed BMP (Device Independent Bitmap)
 * from 8-bit (paletted) or 24-bit (RGB) into an 8-bit grayscale
 * pixel array, which is required by the decoding engine.
 */

// startBitmapDecoding is the first step in the decoder pipeline,
// which this function calls on success.
import { startBitmapDecoding } from '../decoder/src/startBitmapDecoding.js';
import { Reporterror } from '../logging/log.js';

/**
 * @typedef {import('../decoder/src/getAngle.js').PData} PData
 * @typedef {import('../bmpImage/bmpDecode.js').BitmapImage} BitmapImage
 */

// From C: #define BI_RGB 0
const BI_RGB = 0;

/**
 * Processes a parsed bitmap image, converts it to 8-bit grayscale,
 * and passes the result to the decoding pipeline.
 *
 * Corresponds to `ProcessDIB` in `Scanner.c`.
 *
 * @param {PData} pdata - The main processing data object.
 * @param {BitmapImage} image - The parsed bitmap object from bmpDecode.
 * @param {boolean} pb_bestquality - Global flag for best quality mode.
 * @returns {number} 0 on success, -1 on error.
 */
export function processDIB(pdata, image, pb_bestquality) {
    // C: int i,j,sizex,sizey,ncolor;
    // C: uchar scale[256],*data,*pdata,*pbits;
    // C: BITMAPINFO *pdib;
    // C: pdib=(BITMAPINFO *)hdata;
    // C: if (pdib==NULL)
    // C:   return -1; // Something is wrong with this DIB
    if (!image || !image.header) {
        Reporterror("Invalid image data passed to processDIB.");
        return -1;
    }

    const pbih = image.header;

    // C: // Check that bitmap is more or less valid.
    // C: if (pdib->bmiHeader.biSize!=sizeof(BITMAPINFOHEADER) ||
    // C:   pdib->bmiHeader.biPlanes!=1 ||
    // C:   (pdib->bmiHeader.biBitCount!=8 && pdib->bmiHeader.biBitCount!=24) ||
    // C:   (pdib->bmiHeader.biBitCount==24 && pdib->bmiHeader.biClrUsed!=0) ||
    // C:   pdib->bmiHeader.biCompression!=BI_RGB ||
    // C:   pdib->bmiHeader.biWidth<128 || pdib->bmiHeader.biWidth>32768 ||
    // C:   pdib->bmiHeader.biHeight<128 || pdib->bmiHeader.biHeight>32768
    // C: ) {
    // C:   return -1; // Not a known bitmap!
    // C: };
    // (These checks are already performed in decodeBitmapFile.js before this
    // function is called, so we can proceed.)

    // C: sizex=pdib->bmiHeader.biWidth;
    const sizex = pbih.biWidth;
    // C: sizey=pdib->bmiHeader.biHeight;
    const sizey = pbih.biHeight;
    // C: ncolor=pdib->bmiHeader.biClrUsed;
    const ncolor = pbih.biClrUsed;
    const totalPixels = sizex * sizey;

    // C: // Convert bitmap to 8-bit grayscale.
    // C: data=(uchar *)malloc(sizex*sizey);
    const grayscaleData = new Uint8Array(totalPixels);
    // C: if (data==NULL) {
    // C:   return -1; };
    if (!grayscaleData) {
        Reporterror("Low memory: Failed to allocate grayscale buffer.");
        return -1;
    }

    // C: if (pdib->bmiHeader.biBitCount==8) {
    if (pbih.biBitCount === 8) {
        // C: // 8-bit bitmap with palette.
        // C: uchar scale[256];
        const scale = new Uint8Array(256);

        // C: if (ncolor>0) {
        // C:   for (i=0; i<ncolor; i++) {
        // C:     scale[i]=(uchar)((pdib->bmiColors[i].rgbBlue+
        // C:     pdib->bmiColors[i].rgbGreen+pdib->bmiColors[i].rgbRed)/3);
        // C:   }; }
        if (image.palette && image.palette.length > 0) {
            for (let i = 0; i < image.palette.length; i++) {
                const color = image.palette[i];
                scale[i] = (color.rgbBlue + color.rgbGreen + color.rgbRed) / 3;
            }
            // Fill the rest of the scale (if palette is smaller than 256)
            for (let i = image.palette.length; i < 256; i++) {
                scale[i] = 0; // Default to black
            }
        }
            // C: else {
        // C:   for (i=0; i<256; i++) scale[i]=(uchar)i; };
        else {
            // No palette, assume 8-bit grayscale
            for (let i = 0; i < 256; i++) {
                scale[i] = i;
            }
        }

        // C: // ... C code for handling offsets and padding ...
        // C: pdata=data;
        // C: for (j=0; j<sizey; j++) {
        // C:   ...
        // C:   pbits=((uchar *)(pdib))+offset;
        // C:   for (i=0; i<sizex; i++) {
        // C:     *pdata++=scale[*pbits++]; };
        // C:   ...
        // C: }; }
        // The bmpDecode library gives us unpadded, index-per-pixel data
        for (let i = 0; i < totalPixels; i++) {
            const paletteIndex = image.data[i];
            grayscaleData[i] = scale[paletteIndex];
        }

    }
    // C: else {
    else if (pbih.biBitCount === 24) {
        // C: // 24-bit bitmap without palette.
        // C: // ... C code for handling offsets and padding ...
        // C: pdata=data;
        // C: for (j=0; j<sizey; j++) {
        // C:   ...
        // C:   pbits=((uchar *)(pdib))+offset;
        // C:   for (i=0; i<sizex; i++) {
        // C:     *pdata++=(uchar)((pbits[0]+pbits[1]+pbits[2])/3);
        // C:     pbits+=3; };
        // C:   ...
        // C: };
        // The bmpDecode library gives us unpadded, BGR-per-pixel data
        for (let i = 0; i < totalPixels; i++) {
            const p = i * 3;
            const blue = image.data[p];
            const green = image.data[p + 1];
            const red = image.data[p + 2];
            grayscaleData[i] = (blue + green + red) / 3;
        }
    } else {
        // This should be caught by decodeBitmapFile, but as a safeguard:
        Reporterror(`Unsupported bit depth: ${pbih.biBitCount}`);
        return -1;
    }

    // C: // Decode bitmap. This is what we are for here.
    // C: Startbitmapdecoding(&pb_procdata,data,sizex,sizey);
    startBitmapDecoding(pdata, grayscaleData, sizex, sizey, pb_bestquality);

    // C: // Free original bitmap and report success.
    // C: //GlobalUnlock(hdata);
    // (No manual free needed for `image` object, it will be garbage collected)

    // C: return 0;
    return 0;
}