// public/js/encode-app.js

import { initializeLogging } from './shared/logging.js';
import { initializeNavigation } from './shared/nav.js';
import { encode } from './lib/main/index.js';

document.addEventListener('DOMContentLoaded', () => {
    // This helper function ensures an element exists before we use it.
    function getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Critical Error: HTML element with id '${id}' was not found.`);
        }
        return element;
    }

    try {
        const { log, reportError } = initializeLogging();
        initializeNavigation();

        // --- DOM Element Selection (with validation) ---
        const fileInput = getElement('file-input');
        const encodeDropZone = getElement('encode-drop-zone');
        const encodeFileInfo = getElement('encode-file-info');
        const fileInfoText = getElement('file-info-text');
        const dpiSlider = getElement('dpi-slider');
        const dpiValue = getElement('dpi-value');
        const dotsizeSlider = getElement('dotsize-slider');
        const dotsizeValue = getElement('dotsize-value');
        const redundancySlider = getElement('redundancy-slider');
        const redundancyValue = getElement('redundancy-value');
        const compressionToggle = getElement('compression-toggle');
        const encryptionToggle = getElement('encryption-toggle');
        const passwordContainer = getElement('password-container');
        const passwordInput = getElement('password-input');
        const encodeButton = getElement('encode-button');
        const spinner = getElement('spinner');
        const encodeProgressContainer = getElement('encode-progress-container');
        const encodeProgress = getElement('encode-progress');
        const encodeStatusText = getElement('encode-status-text');
        const outputContainer = getElement('output-container');
        const headerToggle = getElement('include-header-toggle');
        const borderToggle = getElement('include-border-toggle');
        let selectedFile = null;

        // --- Event Listeners for Controls ---
        dpiSlider.addEventListener('input', () => dpiValue.textContent = dpiSlider.value);
        dotsizeSlider.addEventListener('input', () => dotsizeValue.textContent = `${dotsizeSlider.value}%`);
        redundancySlider.addEventListener('input', () => redundancyValue.textContent = `1 in ${redundancySlider.value}`);
        encryptionToggle.addEventListener('change', () => {
            passwordContainer.classList.toggle('hidden', !encryptionToggle.checked);
        });

        // --- File Handling ---
        function handleFileSelect(file) {
            if (!file) return;
            selectedFile = file;
            fileInfoText.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            encodeFileInfo.classList.remove('hidden');
            encodeDropZone.classList.add('hidden');
            encodeButton.disabled = false;
            log(`Selected file: ${file.name}`);
        }

        fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));

        // Drag and Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            encodeDropZone.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            encodeDropZone.addEventListener(eventName, () => encodeDropZone.classList.add('drag-over'));
        });
        ['dragleave', 'drop'].forEach(eventName => {
            encodeDropZone.addEventListener(eventName, () => encodeDropZone.classList.remove('drag-over'));
        });
        encodeDropZone.addEventListener('drop', (e) => handleFileSelect(e.dataTransfer.files[0]));

        // --- Main Encode Logic ---
        encodeButton.addEventListener('click', async () => {
            if (!selectedFile) return;

            const options = {
                dpi: parseInt(dpiSlider.value),
                dotpercent: parseInt(dotsizeSlider.value),
                redundancy: parseInt(redundancySlider.value),
                compression: compressionToggle.checked ? 1 : 0,
                encryption: encryptionToggle.checked ? 1 : 0,
                password: passwordInput.value,
                printheader: headerToggle.checked ? 1 : 0,
                printborder: borderToggle.checked ? 1 : 0
            };

            if (options.encryption && !options.password) {
                reportError("Encryption is enabled, but no password was provided.");
                return;
            }

            encodeButton.disabled = true;
            spinner.classList.remove('hidden');
            encodeProgressContainer.classList.remove('hidden');
            outputContainer.innerHTML = '';
            encodeProgress.style.backgroundColor = '#101418';

            const totalSteps = 5;
            let stepCounter = 1;

            const updateProgress = (stepName, progress) => {
                const message = `(Step ${stepCounter}/${totalSteps}) ${stepName}`;
                encodeStatusText.textContent = message;
                encodeProgress.style.width = `${progress}%`;
                log(`${message} - ${progress}%`);
            };

            try {
                updateProgress("Preparing File...", 5);
                const encoder = encode(selectedFile, options);

                for await (const update of encoder) {
                    if (update.error) throw new Error(update.error);

                    if (update.status.startsWith('Compressing')) {
                        stepCounter = 2;
                        updateProgress("Compressing Data...", update.progress);
                    } else if (update.status.startsWith('Encrypting')) {
                        stepCounter = 3;
                        updateProgress("Encrypting Data...", update.progress);
                    } else if (update.status.startsWith('Calculating')) {
                        stepCounter = 4;
                        updateProgress("Calculating Layout...", update.progress);
                    } else if (update.status.startsWith('Generating')) {
                        stepCounter = 5;
                        updateProgress(update.status, update.progress);
                    } else if (update.status === 'Complete') {
                        updateProgress("Complete!", 100);
                        // log(`${link.href} `);

                        if (update.bitmaps && update.bitmaps.length > 0) {
                            log(`Generated ${update.bitmaps.length} bitmap(s).`);

                            update.bitmaps.forEach(page => {
                                // --- START OF REFACTOR ---
                                // Create a Blob from the raw Uint8Array pngData
                                const blob = new Blob([page.bmpData], { type: 'image/bmp' });
                                const imageUrl = URL.createObjectURL(blob);

                                // Create an <img> element for preview
                                const img = document.createElement('img');
                                img.src = imageUrl;
                                img.className = 'w-full max-w-lg mx-auto border border-gray-300';
                                img.alt = `Generated Paperback Page ${page.pageNumber}`;

                                // Create a download link
                                const link = document.createElement('a');
                                link.href = imageUrl;
                                link.download = `${selectedFile.name}_page_${page.pageNumber}.bmp`;
                                link.textContent = `Download Page ${page.pageNumber}`;
                                link.className = "block mt-2 bg-blue-500 hover:bg-blue-600 text-white text-center rounded py-2 px-4 font-bold";

                                const pageContainer = document.createElement('div');
                                pageContainer.className = 'mb-6';
                                pageContainer.appendChild(img);
                                pageContainer.appendChild(link);
                                outputContainer.appendChild(pageContainer);
                                // --- END OF REFACTOR ---
                            });
                        }
                    }
                }
            } catch (error) {
                encodeStatusText.textContent = "Encoding Failed!";
                encodeProgress.style.backgroundColor = 'red';
                reportError("An error occurred during the encoding process.", error);
            } finally {
                encodeButton.disabled = false;
                spinner.classList.add('hidden');
            }
        });
        log("Encode page initialized successfully.");
    } catch (error) {
        // The error modal is now handled by the imported reportError function
        const { reportError } = initializeLogging();
        reportError("A critical error occurred while loading the Encode page. Please check the console for details and refresh.", error);
    }
});