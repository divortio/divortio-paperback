// public/js/decode-app.js

import { initializeLogging } from './ui/logging.js';
import { initializeNavigation } from './ui/nav.js';
import { decode } from '../floppyPaper/lib/main/index.js';

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
        const passwordInput = getElement('password-input');

        let selectedImages = [];

        function handleImageSelect(files) {
            selectedImages = Array.from(files);
            // Sort files numerically, as the C code does
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

        decodeButton.addEventListener('click', async () => {
            decodeButton.disabled = true;
            spinner.classList.remove('hidden');
            decodeProgressContainer.classList.remove('hidden');
            decodeProgress.style.width = '0%';
            decodeProgress.style.backgroundColor = '#3B82F6'; // blue-500
            decodeStatusText.textContent = 'Starting...';
            downloadLinkContainer.innerHTML = ''; // Clear previous link

            try {
                const password = passwordInput.value;
                let finalResult = null;

                // C: for (int i = 0; i < pb_npages; i++) { ... Decodebitmap (path); ... }
                // We loop through each selected file, decoding them one by one
                // until the file processor has a complete file.
                let i = 0;
                for (const file of selectedImages) {
                    try {
                        log(`Processing ${file.name}...`);

                        // 1. Read the file into an ArrayBuffer
                        const buffer = await file.arrayBuffer();

                        // 2. Call the backend decode function
                        // This now returns { blob, filename } on success or null
                        const result = await decode(buffer, password);

                        // 3. Update progress
                        const percent = Math.round(((i + 1) / selectedImages.length) * 100);
                        decodeProgress.style.width = `${percent}%`;
                        decodeStatusText.textContent = `Processing: ${percent}%`;

                        // 4. Check if the file is complete
                        if (result && result.blob) {
                            log(`File restored successfully from ${file.name}!`);
                            finalResult = result;
                            break; // File is complete, exit the loop
                        } else {
                            log(`Page ${file.name} processed, file not yet complete.`);
                        }
                        i++;
                    } catch (e) {
                        reportError(`An error occurred processing ${file.name}`, e);
                    }

                }

                // 5. Handle the final result (after the loop)
                if (finalResult && finalResult.blob) {
                    decodeStatusText.textContent = `File restored: ${finalResult.filename}`;
                    log(`File restored successfully: ${finalResult.filename}`);

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