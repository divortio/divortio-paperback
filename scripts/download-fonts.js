// scripts/download-fonts.js

import https from 'https';
import fs from 'fs';
import path from 'path';
import {URL} from 'url';

const CSS_DIR = path.join( '..', 'public', 'css');
const FONTS_DIR = path.join(CSS_DIR, 'fonts');

// Helper functions (same as in the other scripts)
function download(url, options = {}) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, { ...options, agent: false }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                const redirectUrl = new URL(response.headers.location, url).href;
                download(redirectUrl, options).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download ${url}. Status Code: ${response.statusCode}`));
            }
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
        });
        request.on('error', (err) => reject(new Error(`Error downloading ${url}: ${err.message}`)));
    });
}

function saveAndValidateFile(outputPath, data, name) {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, data);
    try {
        const stats = fs.statSync(outputPath);
        if (stats.size > 0) {
            console.log(`[ Success  ] ✅ ${name} saved to: ${outputPath} (${stats.size} bytes)`);
        } else {
            throw new Error(`Validation failed: File is empty.`);
        }
    } catch (e) {
        throw new Error(`Validation failed for ${name}: ${e.message}`);
    }
}

async function downloadSimpleDependency({ name, url, outputPath, options = {} }) {
    console.log(`[ Starting ] Downloading ${name}...`);
    const data = await download(url, options);
    saveAndValidateFile(outputPath, data, name);
}

async function main() {
    console.log(`--- Processing Google Fonts ---`);
    const cssUrl = 'https://fonts.googleapis.com/css2?display=swap&family=Inter%3Awght%40400%3B500%3B700%3B900&family=Noto+Sans%3Awght%40400%3B500%3B700%3B900';
    const cssOutputPath = path.join(CSS_DIR, 'fonts.css');
    const userAgent = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36' } };

    try {
        const originalCssContent = (await download(cssUrl, userAgent)).toString('utf8');

        const fontFaceRegex = /@font-face\s*\{[\s\S]*?\}/g;
        const fontUrlRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^\)]+)\)/;
        const unicodeRangeRegex = /unicode-range:.*?(U\+0000-00FF)/;

        const fontFaceBlocks = originalCssContent.match(fontFaceRegex);
        let finalCssContent = "/* Downloaded and modified by Paperback Web download script */\n\n";
        const fontDownloadTasks = [];

        if (!fontFaceBlocks) {
            saveAndValidateFile(cssOutputPath, originalCssContent, 'Google Fonts CSS');
            return;
        }

        for (const block of fontFaceBlocks) {
            if (block.includes('latin') || block.match(unicodeRangeRegex)) {
                const urlMatch = block.match(fontUrlRegex);
                if (!urlMatch) continue;

                const fontUrl = urlMatch[1];
                const fontFilename = path.basename(new URL(fontUrl).pathname);
                const relativePath = `./fonts/${fontFilename}`;

                fontDownloadTasks.push({ name: fontFilename, url: fontUrl, outputPath: path.join(FONTS_DIR, fontFilename), options: userAgent });
                const modifiedBlock = block.replace(fontUrl, relativePath);
                finalCssContent += modifiedBlock + '\n\n';
            }
        }

        if (fontDownloadTasks.length > 0) {
            console.log(`[ Info     ] Found ${fontDownloadTasks.length} English font files to download.`);
            await Promise.all(fontDownloadTasks.map(task => downloadSimpleDependency(task)));
        }

        saveAndValidateFile(cssOutputPath, finalCssContent, 'fonts.css (local)');
        console.log('--- Google Fonts processing complete ---');
    } catch (error) {
        console.error('\n--- A download or validation failed for Google Fonts ---');
        console.error(error.message);
        process.exit(1);
    }
}

main();