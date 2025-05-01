// IMPORTS
import { projectSettings, sortedDB } from './db.js'
import { showLoadingOverlay, hideLoadingOverlay, loadingLog } from './overlayLoading.js';
import { consoleLogCanvas, isIOS } from '../utils/helper.js';
import { scanner } from '../utils/externalLib.js'

// HTML SELECTION
const qualitySelect = document.getElementById('export-quality-select');
const compressionSelect = document.getElementById('export-compression-select');
const formatSelect = document.getElementById('export-format-select');

// HTML DONWLOAD
const downloadSection = document.getElementById('pdf-download-section');
const downloadLink = document.getElementById('pdf-download-link');
const downloadNameInput = document.getElementById('pdf-download-name-input');
const downloadPdfButton = document.getElementById('pdf-download-btn');


// - - - - - - - - - - - - - - -


let exportBlob = null;
let exportBlobUrl = null;

// ------------
// GENERATE PDF
// ------------

export async function generatePDF() {
    console.log('> generatePDF()');

    // Show loading overlay
    showLoadingOverlay();
    loadingLog('Generating PDF...');

    // Creat the PDF document shell
    const pdfDoc = await PDFLib.PDFDocument.create();
    console.log('PDF document created.');

    // Retrieve sorted DB
    const sortedEntries = sortedDB();

    // For each entry in the db
    for (const entry of sortedEntries) {
        // Log the index
        console.log('Processing entry:', entry.pageIndex);
        loadingLog(`Processing Page ${entry.pageIndex + 1}...`);

        // Extract original image
        const originalImg = new Image();
        originalImg.src = entry.imageOriginal.source;

        // Wait for the image to load
        await new Promise((resolve) => (originalImg.onload = resolve)); 

        // Extract the size values
        const dpi = entry.imageParameters?.format?.dpi || projectSettings.format?.dpi;
        const widthMM = entry.imageParameters?.format?.widthMM || projectSettings.format.widthMM;
        const heightMM = entry.imageParameters?.format?.heightMM || projectSettings.format.heightMM;
        let widthPx, heightPx;

        // Check if height or width is set to 'auto'
        if (heightMM === 'auto' || widthMM === 'auto') {
            // Calculate dimensions based on corner points
            const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = entry.cornerPoints;

            // Calculate aspect ratio from the corners
            const topWidth = Math.sqrt(Math.pow(topRightCorner.x - topLeftCorner.x, 2) + Math.pow(topRightCorner.y - topLeftCorner.y, 2));
            const bottomWidth = Math.sqrt(Math.pow(bottomRightCorner.x - bottomLeftCorner.x, 2) + Math.pow(bottomRightCorner.y - bottomLeftCorner.y, 2));
            const leftHeight = Math.sqrt(Math.pow(bottomLeftCorner.x - topLeftCorner.x, 2) + Math.pow(bottomLeftCorner.y - topLeftCorner.y, 2));
            const rightHeight = Math.sqrt(Math.pow(bottomRightCorner.x - topRightCorner.x, 2) + Math.pow(bottomRightCorner.y - topRightCorner.y, 2));

            const widthCornerRatio = (topWidth + bottomWidth) / 2;
            const heightCornerRatio = (leftHeight + rightHeight) / 2;
            const aspectRatio = widthCornerRatio / heightCornerRatio;

            // If width is auto, derive it from the height
            if (widthMM === 'auto') {
                heightPx = Math.round((heightMM / 25.4) * dpi);
                widthPx = Math.round(heightPx * aspectRatio);
            }
            // If height is auto, derive it from the width
            else {
                widthPx = Math.round((widthMM / 25.4) * dpi);
                heightPx = Math.round(widthPx / aspectRatio);
            }
        } else {
            // Standard width and height calculation
            widthPx = Math.round((widthMM / 25.4) * dpi);
            heightPx = Math.round((heightMM / 25.4) * dpi);
        }

        // Use scanner to extract the paper with rotation taken into account
        const rotation = entry.imageScaled?.rotation || 0;

        // Prepare canvas dimensions based on rotation
        let finalImageWidth = originalImg.width;
        let finalImageHeight = originalImg.height;

        // Change the aspect ratio if the image is rotated
        if (rotation == 90 || rotation == 270) {
            finalImageWidth = originalImg.height;
            finalImageHeight = originalImg.width;
        }

        // Create a rotated canvas for extraction
        const rotatedCanvas = document.createElement('canvas');
        rotatedCanvas.width = finalImageWidth;
        rotatedCanvas.height = finalImageHeight;
        const rotatedCtx = rotatedCanvas.getContext('2d');

        // Apply rotation to the canvas
        rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
        rotatedCtx.rotate((rotation * Math.PI) / 180);
        rotatedCtx.drawImage(originalImg, -originalImg.width / 2, -originalImg.height / 2);
        
        // Extract paper from the rotated canvas using scanner
        // const extractedCanvas = scanner.extractPaper(rotatedCanvas, widthPx, heightPx, entry.cornerPoints);
        const extractedCanvas = scanner.extractPaper(rotatedCanvas, widthPx, heightPx, entry.cornerPoints);

        console.log('Extracted canvas:');
        consoleLogCanvas(extractedCanvas);

        // Load extracted image into OpenCV for color correction
        const src = cv.imread(extractedCanvas);
        const dst = new cv.Mat();
        src.copyTo(dst);

        // Apply levels adjustments
        applyLevelsToMat(src, dst, entry.imageParameters.filter);

        // Prepare the canvas
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        finalCanvas.width = widthPx;
        finalCanvas.height = heightPx;

        // Draw adjusted image on finalCanvas
        cv.imshow(finalCanvas, dst);

        // ===========================================================
        // Make image color changes
        

        // Clean up OpenCV matrices
        src.delete();
        dst.delete();

        // Compress the final image for the PDF
        const compression = projectSettings.compression || 0.8;
        const imgBytes = await fetch(finalCanvas.toDataURL('image/jpeg', compression)).then(res => res.arrayBuffer());

        // Add the image to the PDF
        const pdfImage = await pdfDoc.embedJpg(imgBytes);
        // const pdfImage = await pdfDoc.embedPng(imgBytes); // For PNG image
        const page = pdfDoc.addPage([widthPx, heightPx]);
        page.drawImage(pdfImage, {
            x: 0,
            y: 0,
            width: pdfImage.width,
            height: pdfImage.height,
        });

        // Log
        console.log('Image drawn on PDF page.');
    }

    // Save as raw bytes
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    // Print PDF size in MB
    const pdfSizeBytes = blob.size;
    const pdfSizeKB = (blob.size / 1024).toFixed(2);
    const pdfSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
    console.log(`PDF Size: ${pdfSizeMB} MB`);

    // Store the blob for IOS
    if(isIOS()) {
        exportBlob = blob;
    }
    // Store the object URL for other platforms
    else {
        // Prepare download for other platforms

        // Revoke the object URL
        if(exportBlobUrl) URL.revokeObjectURL(exportBlobUrl);
        exportBlobUrl = URL.createObjectURL(blob); // Save the URL for reuse
        downloadLink.href = exportBlobUrl;
    }

    // Enable the download section
    enableDownloadSection();

    // Remove the loading element
    hideLoadingOverlay();

    console.log('PDF generation complete.');
};



// ------------
// DOWNLOAD PDF
// ------------

// Event listener for download button
export async function downloadPDF() {
    console.log('> downloadPDF()');

    // Retrieve the targeted name
    let downloadName = downloadNameInput.value.split('.')[0] || 'myScan';
    downloadName += '.pdf'
    downloadLink.download = downloadName;

    // iOS-specific handling
    if (isIOS()) {
        console.log('We have an IOS');

        if (!exportBlob) {
            console.error('Error: exportBlob is undefined.');
            return;
        }

        if (navigator.share) {
            const file = new File([exportBlob], downloadName, { type: 'application/pdf' });
            try {
                await navigator.share({ files: [file] }); // Use the Share API
                console.log('PDF shared successfully!');
            } catch (error) {
                console.error('Error sharing PDF:', error);
            }
            return;
        } else {
            console.warn('Share API not supported. Download link click instead.');
        }
    }
    // Handling for other platforms
    else {
        console.log('Not an IOS');

        if (!exportBlobUrl) {
            console.error('Error: exportBlobUrl is undefined.');
            return;
        }

        const blobUrl = exportBlobUrl;
        console.log('Opening PDF in new tab');

        // Try to open in a new tab (optional fallback)
        const pdfWindow = window.open(blobUrl);

        if (!pdfWindow) {
            console.warn('Popup blocked. Download link clicked instead.');
            downloadLink.click();
        }

        URL.revokeObjectURL(blobUrl);
    }
}

let downloadSectionIsEnable = false;

function enableDownloadSection() {
    // If we already have the section enable
    if(downloadSectionIsEnable) return

    downloadSection.dataset.active = true;
    downloadSectionIsEnable = true;
}

export function disableDownloadSection() {
    // If we already have a disabled section
    if(!downloadSectionIsEnable) return

    // Revoke the URL
    if(exportBlobUrl) URL.revokeObjectURL(exportBlobUrl);

    // Disable the section
    downloadSection.dataset.active = false;
    downloadSectionIsEnable = false
}


// --------
// SETTINGS
// --------

// Event listener for quality (dpi)
qualitySelect.addEventListener('change', (event) => {
    // Disable download section if needed
    disableDownloadSection();

    const newDpi = parseInt(event.target.value, 10);
    projectSettings.format.dpi = newDpi;
    console.log(`Project settings updated: DPI set to ${newDpi}`);
});

// Event listener for compression
compressionSelect.addEventListener('change', (event) => {
    // Disable download section if needed
    disableDownloadSection();

    const newCompression = parseFloat(event.target.value);
    projectSettings.compression = newCompression;
    console.log(`Project settings updated: Compression set to ${newCompression}`);
});

// Event listener for format
formatSelect.addEventListener('change', (event) => {
    // Disable download section if needed
    disableDownloadSection();

    const selectedOption = event.target.selectedOptions[0]; // Get selected option
    const newFormat = event.target.value;
    const newWidth = parseInt(selectedOption.dataset.width, 10);
    const newHeight = selectedOption.dataset.height === 'auto' ? 'auto' : parseInt(selectedOption.dataset.height, 10);

    projectSettings.format.name = newFormat;
    projectSettings.format.widthMM = newWidth;
    projectSettings.format.heightMM = newHeight;

    console.log(`Project settings updated: Format set to ${newFormat} (${newWidth} x ${newHeight})`);
});


// --------
//  HELPER
// --------

function applyLevelsToMat(src, dst, filter) {
    console.log('Applying levels adjustment with filter:', filter);

    const { black, white, middle, grayscale } = filter;

    if (grayscale) {
        // Convert src to grayscale in-place
        const graySrc = new cv.Mat();
        cv.cvtColor(src, graySrc, cv.COLOR_RGBA2GRAY, 0); // Convert to grayscale
        cv.cvtColor(graySrc, src, cv.COLOR_GRAY2RGBA, 0); // Convert back to RGBA
        graySrc.delete();
    }

    // Create the LUT
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        let value = (i - black) / (white - black); // Scale to 0-1
        value = Math.max(0, Math.min(1, value)); // Clamp between 0 and 1
        value = Math.pow(value, middle); // Apply mid-tone adjustment
        lut[i] = Math.round(value * 255); // Scale back to 0-255
    }

    // Apply the LUT to each pixel
    const srcData = src.data;
    const dstData = dst.data;
    for (let i = 0; i < srcData.length; i++) {
        dstData[i] = lut[srcData[i]];
    }
}