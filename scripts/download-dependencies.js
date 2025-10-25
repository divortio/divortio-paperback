// scripts/download-dependencies.js


import {execSync} from 'child_process';
import path from 'path';

const SCRIPTS = [
    'download-tailwind.js',
    'download-fonts.js',
    'download-packages.js'
];

function runScript(scriptName) {
    const scriptPath = path.join('', scriptName);
    console.log(`\n========================================`);
    console.log(`  Executing: ${scriptName}`);
    console.log(`========================================`);
    try {
        // Execute the script and pipe its output to our console in real-time
        execSync(`node ${scriptPath}`, { stdio: 'inherit' });
    } catch (error) {
        console.error(`\n❌ Script '${scriptName}' failed to execute.`);
        // The child script will have already printed its error, so we just exit.
        process.exit(1);
    }
}

function main() {
    console.log('Starting dependency download process...');
    for (const script of SCRIPTS) {
        runScript(script);
    }
    console.log('\n✅ All dependency scripts completed successfully!');
}

main();