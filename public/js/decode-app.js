// public/js/decode-app.js

import { initializeLogging } from './ui/logging.js';
import { initializeNavigation } from './ui/nav.js';
// ** FIX **: Import from the new, correct file
import { decode } from '../floppyPaper/lib/main/decode.js';

document.addEventListener('DOMContentLoaded', () => {
    function getElement(id) {
        const element = document.getElementById(id);
        if (!element) throw new Error(`Critical Error: HTML element with id '${id}' was not found.`);
        return element;
    }

    try {
        const { log, reportError } = initializeLogging();
        initializeNavigation();

        // --- DOM Element Selection ---
        const imageInput = getElement('image-input');
        const decodeDropZone = getElement('decode-drop-zone');
        const decodeFileList = getElement('decode-file-list');
        const decodeButton = getElement('decode-button');
        const spinner = getElement('spinner');
        const decodeProgressContainer = getElement('decode-progress-container');
        const decodeProgress = getElement('decode-progress');
        const decodeStatusText = getElement('decode-status-text');
        const downloadLinkContainer = getElement('download-link-container');
        const bestQualityCheckbox = getElement('best-quality-checkbox');
        const passwordInput = getElement('password-input');

        // --- Progress Update Helper (mirrors encode-app.js) ---
        let stepCounter = 0;
        // 1. Read, 2. Raster, 3. Intensity, 4. Grid, 5. Decode, 6. Finalize
        const totalSteps = 6;

        /**
         * Updates the progress bar and status text.
         * @param {string} message - The status message to display.
         * @param {number} progress - The percentage (0-100).
         */
        function updateProgress(message, progress) {
            // Always update the UI (spinner, progress bar, text)
            decodeStatusText.textContent = message;
            decodeProgress.style.width = `${progress}%`;
            log(`${message} - ${progress}%`); // Log the major step update
        }

        let selectedImages = [];

        function handleImageSelect(files) {
            selectedImages = Array.from(files);
            selectedImages.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

            decodeFileList.innerHTML = '<strong>Selected Images (processing order):</strong><ul>' + selectedImages.map(f => `<li class="ml-4">${f.name}</li>`).join('') + '</ul>';
            decodeFileList.classList.remove('hidden');
            decodeButton.disabled = false;
        }

        // --- Event Listeners ---
        imageInput.addEventListener('change', (e) => handleImageSelect(e.target.files));

        decodeDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            decodeDropZone.classList.add('border-blue-500');
        });
        decodeDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            decodeDropZone.classList.remove('border-blue-500');
        });
        decodeDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            decodeDropZone.classList.remove('border-blue-500');
            handleImageSelect(e.dataTransfer.files);
        });

        decodeDropZone.addEventListener('click', () => {
            imageInput.click();
        });

        decodeButton.addEventListener('click', async () => {
            decodeButton.disabled = true;
            spinner.classList.remove('hidden'); // This will now spin
            decodeProgressContainer.classList.remove('hidden');
            decodeProgress.style.width = '0%';
            decodeProgress.style.backgroundColor = '#3B82F6';
            downloadLinkContainer.innerHTML = '';
            stepCounter = 0;
            updateProgress("Starting...", 0);

            try {
                // ** FIX **: Pass options object, not separate args
                const options = {
                    password: passwordInput.value,
                    bestquality: bestQualityCheckbox.checked
                };

                let finalResult = null;
                let fileIndex = 0;

                for (const file of selectedImages) {
                    try {
                        log(`--- Processing ${file.name} ---`);
                        const buffer = await file.arrayBuffer();

                        // ** REFACTOR **: Call the generator and use a switch, just like encode-app.js
                        for await (const update of decode(buffer, options)) {
                            if (update.error) {
                                throw new Error(update.error);
                            }

                            const status = update.status || "";
                            const progress = update.progress || 0;
                            let stepName = "";

                            // This is the final yielded object from scanner.js
                            if (status === "Complete") {
                                if (update.file) { // 'file' is the key from scanner.js
                                    finalResult = update.file;
                                    updateProgress(`File restored! (${file.name})`, 100);
                                }
                                break;
                            }

                            // Handle step-by-step progress updates
                            // This now mirrors the logic in encode-app.js
                            if (status.startsWith('Reading bitmap')) {
                                stepCounter = 1;
                                stepName = "Reading Bitmap";
                            } else if (status.startsWith('Searching for raster')) {
                                stepCounter = 2;
                                stepName = "Searching for Raster";
                            } else if (status.startsWith('Analyzing intensity')) {
                                stepCounter = 3;
                                stepName = "Analyzing Intensity";
                            } else if (status.startsWith('Searching for grid')) {
                                stepCounter = 4;
                                stepName = "Finding Grid Lines";
                            } else if (status.startsWith('Decoding...')) { // Catches "Decoding..."
                                stepCounter = 5;
                                stepName = "Decoding";
                            } else if (status.startsWith('Finalizing')) {
                                stepCounter = 6;
                                stepName = "Finalizing File";
                            }
                            // We explicitly IGNORE "Decoding blocks..." to prevent granular logging

                            if (stepName) {
                                const message = `(Step ${stepCounter}/${totalSteps}) ${stepName}...`;
                                updateProgress(`${message} (${file.name})`, progress);
                            }
                        }

                        if (finalResult) {
                            break; // File is restored, break the outer file loop
                        }

                        log(`Page ${file.name} processed, file not yet complete.`);
                        fileIndex++;

                    } catch (e) {
                        reportError(`An error occurred processing ${file.name}`, e);
                    }
                }

                // 5. Handle the final result (after the loop)
                if (finalResult && finalResult.blob) {
                    decodeStatusText.textContent = `File restored: ${finalResult.filename}`;

                    const url = URL.createObjectURL(finalResult.blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = finalResult.filename;
                    a.textContent = `Download ${finalResult.filename}`;
                    a.className = "block bg-green-500 hover:bg-green-600 text-white text-center rounded py-2 px-4 font-bold";
                    downloadLinkContainer.appendChild(a);
                } else {
                    decodeStatusText.textContent = "Decoding complete. File not fully restored.";
                    log("Decoding complete. File not fully restored. (Try adding more pages/images)");
                }
            } catch (error) {
                decodeStatusText.textContent = `Error: ${error.message}`;
                decodeProgress.style.backgroundColor = 'red';
                reportError("An error occurred during decoding.", error);
            } finally {
                decodeButton.disabled = false;
                spinner.classList.add('hidden');
            }
        });
        log("Decode page initialized successfully.");
    } catch (error) {
        const { log, reportError } = initializeLogging();
        reportError("A critical error occurred while loading the Decode page. Please check the console for details and refresh.", error);
    }
});