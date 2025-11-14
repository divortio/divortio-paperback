/**
 * @file FileTimePortable.js
 * @overview
 * This class mirrors the C structure `FileTimePortable`, which represents a 64-bit
 * timestamp split into two 32-bit components, used for file modification time.
 * This format is necessary for C-parity with the original Windows-centric code.
 */

export class FileTimePortable {
    /**
     * @public
     * @type {number}
     * @description Low 32-bits of the 64-bit file time (100-nanosecond intervals since Jan 1, 1601).
     * @default 0
     * @see C_TYPE: DWORD
     */
    dwLowDateTime;

    /**
     * @public
     * @type {number}
     * @description High 32-bits of the 64-bit file time.
     * @default 0
     * @see C_TYPE: DWORD
     */
    dwHighDateTime;

    /**
     * Creates an instance of FileTimePortable.
     * @param {number} [low=0] - Initial value for dwLowDateTime.
     * @param {number} [high=0] - Initial value for dwHighDateTime.
     */
    constructor(low = 0, high = 0) {
        this.dwLowDateTime = low;
        this.dwHighDateTime = high;
    }

    /**
     * Converts a standard JavaScript millisecond timestamp into the Windows FileTimePortable format
     * (100-nanosecond intervals since Jan 1, 1601) and updates the instance properties.
     * * @param {number} timestamp - The JavaScript timestamp in milliseconds (e.g., Date.now()).
     * @returns {FileTimePortable}
     */
    setDateTime(timestamp) {
        // Time difference between 1601 and 1970 in 100-nanosecond intervals (11644473600 seconds)
        // 11644473600 seconds * 10,000,000 intervals/second = 116444736000000000 intervals
        const EPOCH_DIFFERENCE_INTERVALS = 116444736000000000n;

        // Convert JS milliseconds to 100-nanosecond intervals: (ms * 10000)
        const msIntervals = BigInt(Math.floor(timestamp)) * 10000n;

        // Total 100-nanosecond intervals since 1601:
        const fileTime = msIntervals + EPOCH_DIFFERENCE_INTERVALS;

        // Splitting 64-bit integer into two 32-bit components
        this.dwLowDateTime = Number(fileTime & 0xFFFFFFFFn);
        this.dwHighDateTime = Number(fileTime >> 32n);
        return this;
    }
}