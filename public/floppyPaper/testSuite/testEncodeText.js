/**
 * @file testEncodeText.js
 * @overview
 * Test suite for the high-level encoding API (encodeNodeFile.js).
 * This test generates a large arbitrary text file, runs the entire encoding pipeline
 * (including compression/encryption setup), and validates the output files.
 *
 * NOTE: Designed for Node.js v20+.
 */
import { encodeNodeFile } from '../node/encodeNodeFile.js';
import { NodeFile } from '../lib/classes/nodeFile.js';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';

// --- I. USER CONFIGURABLES (CAPITAL_VARS) ---
const TEXT_KB = 128 * 1;
// const TEXT_KB = 128 * 3;
// const TEXT_KB = 1024;
const TEST_CLEANUP = false;

// API Parameters
const ENABLE_COMPRESSION = false;
// const PASSWORD = 'this-is-a-strong-pwd';
const PASSWORD = '';
const DPI = 300;
const DOT_PERCENT = 75;
const REDUNDANCY = 5; // 1:3 redundancy ratio
const PRINT_HEADER = 1;
const PRINT_BORDER = 1;


// --- II. ENVIRONMENT SETUP ---
const KILOBYTE = 1024;
const TEST_DIR = path.join(process.cwd(), 'temp_encode_test');
const INPUT_FILENAME = `input_${TEXT_KB}KB.txt`;
const OUTPUT_BASENAME = 'encoded_output.bmp';


/**
 * Generates a string of specified size for the input file.
 * @param {number} kb - Size in kilobytes.
 * @returns {string} A string filled with repeating text.
 */
function generateRandomText(kb) {
    const textBase = "The quick brown fox jumps over the lazy dog. ";
    const targetLength = kb * KILOBYTE;
    let content = textBase.repeat(Math.ceil(targetLength / textBase.length));
    return content.substring(0, targetLength);
}

/**
 * Creates the necessary input file and directory.
 * @returns {Promise<string>} The path to the created input file.
 */
async function setupTestEnvironment() {
    await fsp.mkdir(TEST_DIR, { recursive: true });

    const content = generateRandomText(TEXT_KB);
    const inputPath = path.join(TEST_DIR, INPUT_FILENAME);

    await fsp.writeFile(inputPath, content, 'utf8');

    return inputPath;
}

/**
 * Removes the test directory and all its contents.
 */
async function teardownTestEnvironment() {
    if (TEST_CLEANUP) {
        await fsp.rm(TEST_DIR, { recursive: true, force: true });
    }
}

/**
 * Main test runner function.
 */
async function runTest() {
    const startTime = performance.now();
    let createdFiles = [];
    let inputPath = '';
    let totalOutputSize = 0;

    try {
        inputPath = await setupTestEnvironment();
        const outputBasePath = path.join(TEST_DIR, OUTPUT_BASENAME);
        const inputStats = fs.statSync(inputPath);

        console.log(`\n--- Starting Encoder Test ---`);
        console.log(`Input File: ${INPUT_FILENAME}`);
        console.log(`Input Size: ${(inputStats.size / KILOBYTE).toFixed(2)} KB`);
        console.log(`-----------------------------`);

        // --- EXECUTE THE API ---
        createdFiles = await encodeNodeFile(
            inputPath,
            outputBasePath,
            ENABLE_COMPRESSION,
            PASSWORD,
            DPI,
            DOT_PERCENT,
            REDUNDANCY,
            PRINT_HEADER,
            PRINT_BORDER
        );

        // --- VALIDATION & REPORTING ---\

        if (createdFiles.length === 0) {
            throw new Error("Pipeline returned zero output files.");
        }

        for (const filePath of createdFiles) {
            if (!fs.existsSync(filePath)) {
                throw new Error(`Critical: Output file not found on disk: ${filePath}`);
            }
            totalOutputSize += fs.statSync(filePath).size;
        }

        const duration = (performance.now() - startTime) / 1000;

        console.log(`\n✅ TEST SUCCESSFUL: Encoding Pipeline Passed.`);
        console.log(`   Time Taken: ${duration.toFixed(2)} seconds`);
        console.log(`   Pages Generated: ${createdFiles.length}`);
        console.log(`   Total Output Size: ${(totalOutputSize / KILOBYTE).toFixed(2)} KB`);
        if (!TEST_CLEANUP) console.log(`   Output Saved To: ${TEST_DIR}`);

    } catch (error) {
        // FIX: Log the entire error object, not just the message, to show the stack trace.
        console.error(`\n❌ TEST FAILED: Fatal Error Detected.`);
        console.error(error);

    } finally {
        await teardownTestEnvironment();
    }
}

runTest();