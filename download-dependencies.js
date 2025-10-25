// download-dependencies.js

const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const VENDOR_DIR = path.join(__dirname, 'public', 'js', 'vendor');
const CSS_DIR = path.join(__dirname, 'public', 'css');
const FONTS_DIR = path.join(CSS_DIR, 'fonts');
const UNPKG_BASE_URL = 'https://unpkg.com';

// --- Helper Functions ---

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
            console.log(`[ Success  ] ✅ ${name} saved to: ${path.relative(__dirname, outputPath)} (${stats.size} bytes)`);
        } else {
            throw new Error(`Validation failed: File is empty.`);
        }
    } catch (e) {
        throw new Error(`Validation failed for ${name}: ${e.message}`);
    }
}

// --- Main Download Logic ---

async function downloadSimpleDependency({ name, url, outputPath, options = {} }) {
    console.log(`[ Starting ] Downloading ${name}...`);
    const data = await download(url, options);
    saveAndValidateFile(outputPath, data, name);
}

async function downloadGoogleFonts() {
    const cssUrl = 'https://fonts.googleapis.com/css2?display=swap&family=Inter%3Awght%40400%3B500%3B700%3B900&family=Noto+Sans%3Awght%40400%3B500%3B700%3B900';
    const cssOutputPath = path.join(CSS_DIR, 'fonts.css');
    const userAgent = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36' } };

    console.log(`[ Starting ] Processing Google Fonts...`);
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
}

/**
 * Fetches a package's file list from unpkg and downloads every file.
 * This logic is adapted from your provided example script.
 */
async function downloadFullPackage({ name, pkg, version, destDir }) {
    console.log(`[ Starting ] Processing full package: ${name}@${version}...`);
    const metaUrl = `${UNPKG_BASE_URL}/${pkg}@${version}/?meta`;

    let filesToDownload = [];

    try {
        const metaResponse = await download(metaUrl);
        const metaData = JSON.parse(metaResponse.toString('utf8'));

        if (!metaData || !Array.isArray(metaData.files)) {
            throw new Error('Invalid metadata response from unpkg.');
        }

        // This logic correctly gets all files from the meta response, as per your example.
        filesToDownload = metaData.files.map(item => ({
            path: item.path.substring(1), // Remove leading '/'
            size: item.size
        }));

        console.log(`[ Info     ] Found ${filesToDownload.length} files in package ${pkg}.`);

    } catch (error) {
        throw new Error(`Failed to fetch metadata for ${pkg}: ${error.message}`);
    }

    const downloadPromises = filesToDownload.map(async (file) => {
        const fileUrl = `${UNPKG_BASE_URL}/${pkg}@${version}/${file.path}`;
        const outputPath = path.join(destDir, file.path);
        const fileName = path.basename(file.path);

        await downloadSimpleDependency({ name: fileName, url: fileUrl, outputPath: outputPath });
    });

    await Promise.all(downloadPromises);
}

// Main execution function
async function downloadAll() {
    console.log('--- Starting all dependency downloads ---');
    const allTasks = [
        downloadSimpleDependency({
            name: 'Tailwind CSS',
            url: 'https://cdn.tailwindcss.com?plugins=forms,container-queries',
            outputPath: path.join(VENDOR_DIR, 'tailwind.js'),
        }),
        downloadGoogleFonts(),

        downloadFullPackage({
            name: 'fast-png',
            pkg: 'fast-png',
            version: '7.0.1', // Set to specific version
            destDir: path.join(VENDOR_DIR, 'fast-png'),
        }),
    ];

    try {
        await Promise.all(allTasks);
        console.log('\n--- All dependencies downloaded and validated successfully! ---');
    } catch (error) {
        console.error('\n--- A download or validation failed ---');
        console.error(error.message);
    }
}

downloadAll();