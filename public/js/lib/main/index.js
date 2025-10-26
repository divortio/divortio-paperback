// public/js/lib/main/index.js

import { pb } from '../include/paperbak/index.js';
import { printFile } from '../printer/index.js';
import { decodeBitmap } from '../scanner/index.js';

function applyOptions(options = {}) {
    const defaults = {
        dpi: 200,
        dotpercent: 70,
        redundancy: 5,
        compression: 0,
        encryption: 0,
        printheader: 0,
        printborder: 0,
        bestquality: 0,
        autosave: 1,
        password: '',
    };
    Object.assign(pb, defaults, options);

    if (pb.dpi < 40 || pb.dpi > 600) throw new Error("Invalid DPI given. Must be between 40 and 600.");
    if (pb.dotpercent < 50 || pb.dotpercent > 100) throw new Error("Invalid dotsize given. Must be between 50 and 100.");
    if (pb.redundancy < 2 || pb.redundancy > 10) throw new Error("Invalid redundancy given. Must be between 2 and 10.");
}

export async function* encode(file, options = {}) {
    if (!file) {
        throw new Error("No input file selected for encoding.");
    }
    applyOptions(options);
    const printer = printFile(file, pb);
    yield* printer.run();
}

export async function decode(files, options = {}) {
    if (!files || files.length === 0) {
        throw new Error("No input file(s) selected for decoding.");
    }
    applyOptions(options);

    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    let finalResult = null;
    for (const file of files) {
        // *** THE FIX: Pass the options object (containing reportError) down to the scanner ***
        const decoder = await decodeBitmap(file, options);

        const decoderGenerator = decoder.run();

        for await (const update of decoderGenerator) {
            if (update.error) {
                throw new Error(update.error);
            }
            if (update.result) {
                finalResult = update.result;
            }
        }
    }
    return finalResult;
}