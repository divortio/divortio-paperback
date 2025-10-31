# Advanced: Galois Field Arithmetic ($GF(2^8)$)

The Reed-Solomon algorithm is able to detect and correct errors through a series of powerful polynomial calculations. However, these calculations do not use the "normal" arithmetic we learn in school. Instead, they operate within a special mathematical structure called a **Galois Field**, also known as a finite field.

---

## Why a Special Kind of Math?

In standard arithmetic, numbers can grow infinitely large (e.g., $200 + 100 = 300$). For computer algorithms that work on fixed-size chunks of data like bytes, this is a problem. We need a system where operations on bytes always produce a result that is also a byte.

* **Analogy: Clock Arithmetic.** A Galois Field is like a clock. On a 12-hour clock, if it's 8 o'clock and you add 7 hours, the result is 3 o'clock, not 15. The numbers always "wrap around" to stay within the finite set {1, 2, ..., 12}. Galois Fields provide a similar, but more powerful, set of rules for addition, subtraction, multiplication, and division on a finite set of numbers.

---

## The qdPaper Field: $GF(2^8)$

The qdPaper system uses the specific Galois Field $GF(2^8)$. This means all calculations are performed on numbers that can be represented by 8 bits—in other words, bytes (numbers from 0 to 255).

The field is defined by an **irreducible polynomial**, which acts as the "wrap-around" rule for multiplication. In this case, the polynomial is $x^8 + x^5 + x^3 + x^2 + 1$, which corresponds to the hexadecimal value `0x12D`.

### Operations in $GF(2^8)$

* **Addition (and Subtraction):** This is the simplest operation. In $GF(2^8)$, addition is performed with a bitwise **XOR** (`^`) operation. An interesting property is that addition is its own inverse, meaning addition and subtraction are the exact same operation.
    * Example: `90 ^ 170 = 244`

* **Multiplication (and Division):** This is much more complex. It involves representing the bytes as polynomials, multiplying them, and then finding the remainder after dividing by the irreducible polynomial.

### The Power of Lookup Tables

Performing these complex polynomial multiplications in real-time would be very slow. To make the calculations instantaneous, the software pre-computes all possible multiplication and division results when it first starts.

* **Action:** It generates two arrays, `alpha_to` (the exponential table) and `index_of` (the log table), which act as fast lookup tables. Instead of performing a complex calculation, the software can find the result of any multiplication or division with a few simple array lookups.
* **Source Code:** This pre-computation and the arithmetic functions are implemented in [`/public/js/lib/ecc/galoisField.js`](../public/js/lib/ecc/galoisField.js) and are a direct port of the logic in the original C source.

This specialized, high-speed mathematical system is the engine that allows the Reed-Solomon algorithm to efficiently perform the complex calculations needed to repair data.

<br>

[<-- Back to Computer Vision](./computer-vision.md) | [Next: Reed-Solomon Deep Dive -->](./reed-solomon-deep-dive.md)