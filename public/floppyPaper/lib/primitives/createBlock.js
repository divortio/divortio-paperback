/**
 * Creates a new, zero-filled t_block object (for the blocklist).
 * C: t_block
 * @returns {import('./index.js').t_block}
 */
export function createBlock() {
    return {
        addr: 0,
        recsize: 0,
        data: new Uint8Array(NDATA),
    };
}