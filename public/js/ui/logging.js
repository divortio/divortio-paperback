// public/js/shared/logging.js

export function initializeLogging() {
    const statusLog = document.getElementById('status-log');
    const errorModal = document.getElementById('error-modal');
    const errorModalMessage = document.getElementById('error-modal-message');
    const errorModalDismiss = document.getElementById('error-modal-dismiss');
    const errorModalRefresh = document.getElementById('error-modal-refresh');

    if (errorModal && errorModalDismiss && errorModalRefresh) {
        errorModalDismiss.addEventListener('click', () => {
            errorModal.classList.add('hidden');
        });
        errorModalRefresh.addEventListener('click', () => {
            window.location.reload();
        });
    }

    function log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `${timestamp}: ${message}`;
        if (statusLog) {
            statusLog.textContent += logMessage + '\n';
            statusLog.scrollTop = statusLog.scrollHeight;
        }
        if (level === 'error') console.error(logMessage);
        else console.log(logMessage);
    }

    function reportError(userMessage, error) {
        log(`ERROR: ${userMessage}\n${error}`, 'error');
        if (error) {
            console.error("Underlying Error:", error);
        }

        if (errorModal && errorModalMessage) {
            errorModalMessage.textContent = userMessage;
            errorModal.classList.remove('hidden');
        } else {
            // Fallback for the unlikely event the modal is missing.
            alert(`CRITICAL ERROR: ${userMessage}`);
        }
    }

    return { log, reportError };
}