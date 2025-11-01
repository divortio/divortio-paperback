# Concept: Grid Recognition and Perspective Correction

A scanned image is rarely perfect. The paper might be slightly tilted, skewed from the scanner lid, or have lens distortion. Before the decoder can read the individual dots, it must first find the precise location and orientation of the data grid within this imperfect image. This is a classic computer vision challenge solved by a series of clever algorithms.

---

## 1. Finding the Grid: Peak Detection

The first task is to find the repeating horizontal and vertical pattern of the data blocks. The software doesn't look for specific shapes; instead, it looks for a repeating rhythm of light and dark.

* **Action:** The software analyzes the average pixel intensity of every row and column in the image. This creates two one-dimensional signals representing the vertical and horizontal brightness patterns. A "peak finding" algorithm then analyzes these signals to find the most frequently occurring distance between the dark areas (the data blocks).
* **Analogy:** Imagine looking at a distant picket fence. You don't need to see each individual picket to know it's a fence. Your brain recognizes the repeating pattern of "picket, gap, picket, gap." The peak finding algorithm does the same thing, but for the dark data blocks against the light paper background.
* **Source Code:** [`/public/js/lib/decoder/findPeaks.js`](../public/floppyPaper/lib/decoder/src/findPeaks.js)

---

## 2. Correcting Rotation: Angle Detection

Once the basic grid spacing is known, the decoder must determine the precise angle of the grid.

* **Action:** The algorithm scans the image at various small angles (from -7 to +7 degrees) and re-runs the peak detection analysis at each angle. The angle that produces the sharpest, most well-defined peaks is identified as the correct rotation of the grid.
* **Analogy:** This is like tuning an old analog radio. You turn the dial slightly back and forth, and when the signal is clearest (the peaks are sharpest), you know you've found the right station (the correct angle). The software is "listening" for the angle where the grid pattern is the strongest.
* **Source Code:** [`/public/js/lib/decoder/getAngle.js`](../public/floppyPaper/lib/decoder/src/getAngle.js)

---

## 3. Correcting Skew: Perspective Transformation

A simple rotation isn't enough to handle distortions like keystoning, where the page might have been closer to one side of the scanner than the other. The software must correct for this perspective skew.

* **Action:** The decoder identifies the four corner points of the main data area. It then uses linear algebra to calculate a 3x3 **perspective transformation matrix**. This matrix is a mathematical recipe for "un-skewing" the image.
* **Analogy:** Think of a photo you've taken of a rectangular painting on a wall from an angle. In the photo, the painting looks like a trapezoid. To fix it, you would use a photo editing tool to "stretch" the far corners and "squish" the near corners until it looks like a perfect rectangle again. The transformation matrix is the mathematical formula the software uses to perform this exact kind of stretching and squishing on the scanned image data.
* **Source Code:** [`/public/js/lib/decoder/getGridPosition.js`](../public/floppyPaper/lib/decoder/src/getGridPosition.js)

Once these three steps are complete, the decoder has a perfect map of where every single dot *should* be in the original, distorted image. It can then proceed to read the value of each dot and reconstruct the data.

<br>

[<-- Back to Error Correction](./error-correction.md) | [Next: Advanced Documentation -->](./advanced/galois-field-arithmetic.md)