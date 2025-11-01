// public/js/nav.js

export function initializeNavigation() {
    const tabEncode = document.getElementById('tab-encode');
    const tabDecode = document.getElementById('tab-decode');

    // Ensure the navigation elements exist before proceeding
    if (!tabEncode || !tabDecode) {
        console.error("Navigation tabs not found. Aborting navigation setup.");
        return;
    }

    const currentPage = window.location.pathname;

    if (currentPage.includes('encode.html') || currentPage === '/') {
        // Style the Encode tab as active and disable it
        tabEncode.classList.replace('border-b-transparent', 'border-b-[#101418]');
        tabEncode.classList.replace('text-[#5e758d]', 'text-[#101418]');
        tabEncode.removeAttribute('href'); // Remove link to prevent navigation
        tabEncode.style.cursor = 'default';

        // Style the Decode tab as an inactive link
        tabDecode.href = '/decode.html';
        tabDecode.classList.replace('border-b-[#101418]', 'border-b-transparent');
        tabDecode.classList.replace('text-[#101418]', 'text-[#5e758d]');
    } else if (currentPage.includes('decode.html')) {
        // Style the Decode tab as active and disable it
        tabDecode.classList.replace('border-b-transparent', 'border-b-[#101418]');
        tabDecode.classList.replace('text-[#5e758d]', 'text-[#101418]');
        tabDecode.removeAttribute('href');
        tabDecode.style.cursor = 'default';

        // Style the Encode tab as an inactive link
        tabEncode.href = '/encode.html';
        tabEncode.classList.replace('border-b-[#101418]', 'border-b-transparent');
        tabEncode.classList.replace('text-[#101418]', 'text-[#5e758d]');
    }
}