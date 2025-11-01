/**
 * Creates a new, zero-filled t_data object (128 bytes).
 * C: t_data
 * @returns {Uint8Array}
 */
export default function createDataBlock() {
    // C struct: { addr: 4, data: 90, crc: 2, ecc: 32 }
    return new Uint8Array(128);
}