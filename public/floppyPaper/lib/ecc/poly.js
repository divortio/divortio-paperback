/**
 * The generator polynomial for the Reed-Solomon code.
 * This is a direct and verified port from Ecc.c.
 *
 */
export const poly = new Uint8Array([
    0,  249,   59,   66,    4,   43,  126,  251,
    97,   30,    3,  213,   50,   66,  170,    5,
    24,    5,  170,   66,   50,  213,    3,   30,
    97,  251,  126,   43,    4,   66,   59,  249,
    0
]);