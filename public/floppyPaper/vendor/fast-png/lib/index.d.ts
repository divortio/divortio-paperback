import type { DecodedApng, DecodedPng, DecoderInputType, ImageData, PngDecoderOptions, PngEncoderOptions } from './types.d.ts';
export { hasPngSignature } from './helpers/signature.d.ts';
export * from './types.d.ts';
declare function decodePng(data: DecoderInputType, options?: PngDecoderOptions): DecodedPng;
declare function encodePng(png: ImageData, options?: PngEncoderOptions): Uint8Array;
declare function decodeApng(data: DecoderInputType, options?: PngDecoderOptions): DecodedApng;
export { decodeApng, decodePng as decode, encodePng as encode };
export { convertIndexedToRgb } from './convert_indexed_to_rgb.d.ts';
//# sourceMappingURL=index.d.ts.map