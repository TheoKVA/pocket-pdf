// IMPORTS
import { tempEntry, loadTempEntry } from './db.js'
import { scanner } from '../utils/externalLib.js'
import { showLoadingOverlay, loadingLog } from './overlayLoading.js';
import { loadParameterOverlay } from './overlayParameter.js'

// - - - - - - - - - - - - - - -

// HTML
const fileInputDIV = document.getElementById('fileInput');
fileInputDIV.addEventListener('change', handleFileInput);

// VARIABLES
const previewMinWidth = 500;

// - - - - - - - - - - - - - - -

// BUTTON
export function handleAddBtn() {
    console.log('handleAddBtn()');
    fileInputDIV.value = '';
    fileInputDIV.click();
};
export function handleFileDragover(e) {
    e.preventDefault(); // Prevent default behavior (e.g., open file in browser)
    e.dataTransfer.dropEffect = 'copy'; // Indicate that a copy is expected
};
export function handleFileDrop(e) {
    e.preventDefault(); // Prevent default behavior
    const files = e.dataTransfer.files;

    // Check if there are any image files
    for (const file of files) {
        if (file.type.startsWith('image/')) {
            console.log('Image file dropped.');

            // Create a FileList-like object and trigger the file input's change event
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            // Update the file input's files property
            fileInputDIV.files = dataTransfer.files;

            // Trigger the change event manually
            fileInputDIV.dispatchEvent(new Event('change'));
            break;
        }
    }
};

// - - - - - - - - - - - - - - -

// FILE INPUT
async function handleFileInput(e) {
    const files = e.target.files;
    console.log('handleFileInput() is fired', files);
    loadingLog('Processing image...');
    
    for (const file of files) {
        showLoadingOverlay();
        console.log('Processing file:', file.name);

        const reader = new FileReader();
        reader.onload = async (e) => {

            let imgSrc = e.target.result;

            // If the file is HEIC, convert it
            if (file.type === 'image/heic' || file.type === 'image/heif') {
                console.log('HEIC image conversion..');
                loadingLog('Converting', file.name, 'to JPEG...');
                try {
                    const heicToJpg = await heic2any({ blob: file, toType: 'image/jpeg' });
                    imgSrc = URL.createObjectURL(heicToJpg);
                    console.log('HEIC image converted to JPEG:');
                    loadingLog('HEIC image converted to JPEG.');
                } catch (error) {
                    console.error('Error converting HEIC to JPEG:', error);
                    loadingLog('Error converting HEIC to JPEG.', error);
                }
            }

            // Prepare the new image
            newImage(imgSrc);
        };

        reader.readAsDataURL(file);
    }
};

// LOAD NEW IMAGE
async function newImage(imgSrc) {
    console.log('newImage()');
    loadingLog('Processing image...');

    // Load the image
    const img = new Image();
    img.src = imgSrc;
    img.onload = () => {
        console.log('Image loaded for processing');

        // Load a new tempEntry
        loadTempEntry(-1);
        console.log('TempEntry loaded with id:', tempEntry.id);

        // Save the image source and dimensions
        tempEntry.imageOriginal.source = imgSrc;
        tempEntry.imageOriginal.size.width = img.naturalWidth;
        tempEntry.imageOriginal.size.height = img.naturalHeight;
        console.log('Image source and dimensions saved to TempEntry.');

        // == CORNERS DETECTION ==

        // Convert image to OpenCV mat
        const mat = cv.imread(img);
        console.log('Converted image to cv.Mat.');

        // Find the paper contour
        const contour = scanner.findPaperContour(mat);
        console.log('Paper contour detected:', contour);

        // Get corner points from the contour
        const cornerPoints = scanner.getCornerPoints(contour);
        console.log('Corner points detected:', cornerPoints);

        // Save the corner points to the tempEntry
        tempEntry.cornerPoints = cornerPoints;
        console.log('Corner points saved to TempEntry.');

        // Release the memory
        mat.delete();
        console.log('Memory released.');


        // == MAKE SMALLER IMAGE ==

        // Create a new canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set the canvas dimensions
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        if (aspectRatio > 1) {
            // Landscape: shorter side is height
            canvas.width = Math.round(previewMinWidth * aspectRatio);
            canvas.height = previewMinWidth;
        } else {
            // Portrait: shorter side is width
            canvas.width = previewMinWidth;
            canvas.height = Math.round(previewMinWidth / aspectRatio);
        }

        // Draw scaled image onto canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Save scaled canvas and JPEG data
        // tempEntry.imageScaled.canvas = canvas;
        tempEntry.imageScaled.source = canvas.toDataURL('image/jpeg'); // Save the scaled-down image as JPEG
        tempEntry.imageScaled.size.width = canvas.width;
        tempEntry.imageScaled.size.height = canvas.height;
        tempEntry.imageScaled.size.scaleFactor =  canvas.width / img.naturalWidth;
        console.log('Scaled image saved to TempEntry.');

        // Release the memory
        canvas.remove();
        URL.revokeObjectURL(img.src);
        console.log('Memory released.');

        console.log('All good. Moving on..');
        // Call loadParameterOverlay
        loadParameterOverlay();
    }
}