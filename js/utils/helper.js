// - - - - - - - - - - - - - - -

// Return unique ID string of lenght 8
export function generateUniqueId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// Check for iOS platform
export function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Function to log in the console a canvas
export function consoleLogCanvas(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) {
        console.error('The provided element is not a canvas.');
        return;
    }

    // Limit the height to 500px and calculate the scaling factor
    const maxHeight = 500;
    const scaleFactor = canvas.height > maxHeight ? maxHeight / canvas.height : 1;

    // Scale the width and height proportionally
    const displayWidth = canvas.width * scaleFactor;
    const displayHeight = canvas.height * scaleFactor;

    // Convert the canvas to a data URL
    const dataURL = canvas.toDataURL(); // Get the image data as a base64-encoded string

    // Log the scaled dimensions and the image
    console.log(`Canvas: (${canvas.width}x${canvas.height}), Display: (${Math.round(displayWidth)}x${Math.round(displayHeight)})`);
    console.log('%c ', `font-size: 1px; padding: ${Math.round(displayHeight / 4)}px ${Math.round(displayWidth / 4)}px; background: url(${dataURL}) no-repeat; background-size: contain;`);
}