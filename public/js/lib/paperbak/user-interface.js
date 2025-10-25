// src/paperbak/user-interface.js

/**
 * Reports an error to the user.
 * In a web context, this logs the error to the developer console and shows a browser alert.
 * @param {string} input - The error message to display.
 */
export function Reporterror(input) {
    console.error(input);
    alert(`Error: ${input}`);
}

/**
 * Displays a status message and progress to the user.
 * In a web context, this logs the message to the developer console. A real UI would
 * use this to update an on-screen status element.
 * @param {string} input - The status message to display.
 * @param {number} progress - The progress percentage (0-100).
 */
export function Message(input, progress) {
    if (progress !== undefined) {
        console.log(`[${progress}%] ${input}`);
    } else {
        console.log(input);
    }
}

/**
 * Prompts the user to enter a password.
 * This uses the browser's native prompt. In a real application, this would
 * be replaced by a more secure and user-friendly custom modal.
 * @returns {string|null} The password entered by the user, or null if they cancelled.
 */
export function Getpassword() {
    // NOTE: window.prompt is simple but not secure for real password entry
    // as the input is visible. A custom UI element would be needed for a production app.
    const password = window.prompt("Enter encryption password:", "");
    return password;
}