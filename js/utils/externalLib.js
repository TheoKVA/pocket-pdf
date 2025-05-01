// - - - - - - - - - - - - - - -

// JSCANIFY

// Ensure the library is available globally
if (!window.jscanify) {
    throw new Error('jscanify library is not loaded. Please include it in your HTML.');
}

// Create and export the singleton scanner instance
export const scanner = new jscanify();