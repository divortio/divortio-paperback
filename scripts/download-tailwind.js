// scripts/download-tailwind.js
import https from 'https';
import fs from 'fs';
import path from 'path';
import {URL} from 'url';

const VENDOR_DIR = path.join( '..', 'public', 'js', 'vendor');

const TAILWIND_CONFIG = {
    name: 'Tailwind CSS',
    url: 'https://cdn.tailwindcss.com?plugins=forms,container-queries',
    outputPath: path.join(VENDOR_DIR, 'tailwind.js'),
};

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

async function main() {
    console.log(`--- Downloading Tailwind CSS ---`);
    try {
        console.log(`[ Starting ] Downloading ${TAILWIND_CONFIG.name}...`);
        const data = await download(TAILWIND_CONFIG.url, TAILWIND_CONFIG.options);
        saveAndValidateFile(TAILWIND_CONFIG.outputPath, data, TAILWIND_CONFIG.name);
        console.log('--- Tailwind CSS download complete ---');
    } catch (error) {
        console.error(`\n--- A download or validation failed for Tailwind CSS ---`);
        console.error(error.message);
        process.exit(1);
    }
}

main();