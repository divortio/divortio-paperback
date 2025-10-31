# Advanced: Reed-Solomon Deep Dive

This document provides a high-level overview of the specific algorithms used in the Reed-Solomon (255, 223) error correction pipeline. All calculations are performed using the [Galois Field arithmetic](./galois-field-arithmetic.md) discussed previously.

The entire implementation is a direct port of the well-regarded Reed-Solomon library by Phil Karn.

---

## 1. Encoding

The encoding process is relatively straightforward. Its goal is to take the 96 bytes of primary data and generate a 32-byte ECC checksum.

* **Action:** The 96 bytes of data (address, payload, and CRC) are treated as coefficients of a polynomial. This polynomial is then divided by a known "generator polynomial" within the Galois Field. The **remainder** of this division is the 32-byte ECC.
* **Analogy:** This is mathematically similar to calculating a CRC checksum, but far more powerful. The resulting ECC is not just a hash; it contains complex algebraic relationships to the original data.
* **Source Code:** The `encode_rs_8` function in [`/public/js/lib/ecc/index.js`](../public/js/lib/ecc/index.js) implements this process.

---

## 2. Decoding

The decoding process is far more complex and is the heart of the system's resilience. It involves several distinct stages to find and correct errors.

### Step A: Syndrome Calculation

* **Action:** The decoder takes the full 128-byte block received from the scanner and performs a series of calculations on it. If the block contains no errors, the result of these calculations (called **syndromes**) will be zero.
* **Purpose:** To quickly determine if there are any errors in the block. If all syndromes are zero, the process stops, and the data is considered valid. If any syndrome is non-zero, it indicates that errors are present, and their values are used as the input for the next stage.

### Step B: Find Error Locations (Berlekamp-Massey Algorithm)

* **Action:** The non-zero syndromes are fed into the Berlekamp-Massey algorithm. This algorithm's output is an "error locator polynomial."
* **Analogy:** The error locator polynomial is like a mathematical key. It doesn't tell you *where* the errors are directly, but it holds the secret to finding them.

### Step C: Find Error Positions (Chien Search)

* **Action:** The decoder uses a Chien search to find the roots of the error locator polynomial. The roots of this polynomial correspond directly to the positions of the corrupted bytes within the data block.
* **Analogy:** The Chien search is like using the key from the previous step to unlock a map. It "evaluates the key" at every possible location in the block, and when the result is zero, it marks that spot on the map as an error.

### Step D: Calculate Error Magnitudes (Forney's Algorithm)

* **Action:** Now that the decoder knows *where* the errors are, it uses Forney's algorithm to calculate the *actual value* of each error. For each error location, it determines what value needs to be XORed with the corrupt byte to restore the original, correct byte.
* **Analogy:** We've found the smudged digit in our phone number example. Now, Forney's algorithm is the step that does the math (`38 - 30 = 8`) to figure out what the correct digit should have been.

### Final Correction

With the location and magnitude of every error known, the decoder simply goes to each corrupted byte and applies the correction. The result is a bit-for-bit perfect restoration of the original 96 bytes of data.

* **Source Code:** The entire decoding pipeline (Syndrome calculation, Berlekamp-Massey, Chien Search, and Forney) is implemented within the `decode_rs_8` function in [`/public/js/lib/ecc/index.js`](../public/js/lib/ecc/index.js).

<br>

[<-- Back to Galois Field Arithmetic](./galois-field-arithmetic.md) | [Back to Main Index -->](../index.md)