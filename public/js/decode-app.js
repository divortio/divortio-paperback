// public/js/decode-app.js

import { initializeLogging } from './shared/logging.js';
import { initializeNavigation } from './shared/nav.js';
import { decode } from './lib/main/index.js';

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

        let selectedImages = [];

        function handleImageSelect(files) {
            selectedImages = Array.from(files);
            decodeFileList.innerHTML = '<strong>Selected Images:</strong><ul>' + selectedImages.map(f => `<li class="ml-4">${f.name}</li>`).join('') + '</ul>';
            decodeFileList.classList.remove('hidden');
            decodeDropZone.classList.add('hidden');
            decodeButton.disabled = selectedImages.length === 0;
            log(`Selected ${files.length} image(s) for decoding.`);
        }

        imageInput.addEventListener('change', (e) => handleImageSelect(e.target.files));

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            decodeDropZone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); });
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            decodeDropZone.addEventListener(eventName, () => decodeDropZone.classList.add('drag-over'));
        });
        ['dragleave', 'drop'].forEach(eventName => {
            decodeDropZone.addEventListener(eventName, () => decodeDropZone.classList.remove('drag-over'));
        });
        decodeDropZone.addEventListener('drop', (e) => handleImageSelect(e.dataTransfer.files));

        decodeButton.addEventListener('click', async () => {
            if (selectedImages.length === 0) return;

            decodeButton.disabled = true;
            spinner.classList.remove('hidden');
            decodeProgressContainer.classList.remove('hidden');
            downloadLinkContainer.innerHTML = '';
            decodeProgress.style.backgroundColor = '#101418';

            try {
                decodeStatusText.textContent = "Processing images...";
                decodeProgress.style.width = '50%';
                log("Decoding started...");

                // *** THE FIX: Pass the reportError function from this scope into the library ***
                const options = { reportError };
                const result = await decode(selectedImages, options);

                decodeProgress.style.width = '100%';
                if (result && result.blob) {
                    decodeStatusText.textContent = `File restored: ${result.filename}`;
                    log(`File restored successfully: ${result.filename}`);

                    const url = URL.createObjectURL(result.blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = result.filename;
                    a.textContent = `Download ${result.filename}`;
                    a.className = "block bg-green-500 hover:bg-green-600 text-white text-center rounded py-2 px-4 font-bold";
                    downloadLinkContainer.appendChild(a);
                } else {
                    decodeStatusText.textContent = "Decoding failed.";
                    log("Decoding failed or returned no result.");
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
        const { reportError } = initializeLogging();
        reportError("A critical error occurred while loading the Decode page. Please check the console for details and refresh.", error);
    }
});