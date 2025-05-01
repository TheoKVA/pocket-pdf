/*

/js
  ├── main.js            # Entry point for your app
  ├── utils/
  │     ├── domUtils.js  # DOM manipulation utilities
  │     ├── mathUtils.js # Math-related functions
  ├── modules/
  │     ├── dragDrop.js  # Drag-and-drop functionality
  │     ├── imageEditor.js # Image editing logic

dragDrop.js
export function handleDragStart() {  }
export function handleDragOver() {  }
export function handleDrop() {  Drop logic  }

main.js 
import { handleDragStart, handleDragOver, handleDrop } from './modules/dragDrop.js';
import { rotateImage, applyLevelsAdjustment } from './modules/imageEditor.js';
// Use imported functions
document.addEventListener('dragstart', handleDragStart);

*/

// =========
//  IMPORTS
// =========

// import { createPageElement } from './modules/pageElement.js'
import { handleAddBtn, handleFileDragover, handleFileDrop } from './modules/fileInput.js'
// import { showLoadingOverlay, hideLoadingOverlay } from './modules/overlayLoading.js';
// import { showParameterOverlay, hideParameterOverlay } from './modules/overlayParameter.js';
import { generatePDF, downloadPDF } from './modules/generatePDF.js'

// POUR LOG
import { db, consoleLogTempEntry } from './modules/db.js'


// HTML
const pageContainer = document.getElementById('js-page-container');






// ==========
// FILE INPUT
// ==========

const addButton = document.getElementById('btn-add-image');

// Handle drag and drop on the window
window.addEventListener('dragover', handleFileDragover)
window.addEventListener('drop', handleFileDrop);
// Handle click
addButton.addEventListener('click', handleAddBtn)



// ================
// IMAGE PARAMETERS
// ================








// ============
// GENERATE PDF
// ============


const generatePdfButton = document.getElementById('pdf-generate-btn');
const downloadPdfButton = document.getElementById('pdf-download-btn');

generatePdfButton.addEventListener('click', generatePDF)
downloadPdfButton.addEventListener('click', downloadPDF)




// ===========
// CONSOLE LOG
// ===========

// Add a keydown event listener to the document
document.addEventListener('keydown', (event) => {
    // Check if the key pressed is 'C' (case-insensitive)
    if (event.key.toLowerCase() === 'c') {
        consoleLogTempEntry();
    }
});










/*

// const img = new Image();
// img.src = parametersInputImage.src;

// img.onload = () => {
//     // Create the canvas
//     originalCanvas = document.createElement('canvas');
//     ctx = originalCanvas.getContext('2d');

//     // Set canvas dimensions
//     originalCanvas.width = img.width;
//     originalCanvas.height = img.height;

//     // Draw the image on the canvas
//     ctx.drawImage(img, 0, 0);

//     // Load the canvas into an OpenCV Mat
//     src = cv.imread(originalCanvas);
//     dst = new cv.Mat();
//     src.copyTo(dst); // Ensure `dst` matches dimensions of `src`

//     // Initialize sliders with default values
//     // const filter = tempEntrie.imageParameters.filter;
//     // blackSlider.value = filter.black || 0;
//     // middleSlider.value = filter.middle || 1;
//     // whiteSlider.value = filter.white || 255;

//     applyLevelsWithOpenCV(); // Apply initial levels
// };


// HTML
const parametersContainer = document.getElementById('parameters-overlay');
const parametersImageContainer  = parametersContainer.querySelector('#image-container');
const parametersInputImage = parametersContainer.querySelector('#input-image');
const parametersMarkers = {
    topLeftCorner: document.getElementById('top-left-corner'),
    topRightCorner: document.getElementById('top-right-corner'),
    bottomLeftCorner: document.getElementById('bottom-left-corner'),
    bottomRightCorner: document.getElementById('bottom-right-corner'),
};
// Pre-declare variables outside the function
const parameterHighlightPolygon = document.getElementById('highlight-polygon');
const parameterHighlightSVG = document.getElementById('highlight-svg');
const parameterEdge = document.getElementById('square-edges');
const parametersConfirmButton = document.getElementById('confirm-button');
const parametersCancelButton = document.getElementById('cancel-button');
const parametersDeleteButton = document.getElementById('delete-button');
const rotateRightButton = document.getElementById('rotate-right-button');
const rotateLeftButton = document.getElementById('rotate-left-button');
const brightnessSlider = document.getElementById('brightness-level');
const contrastSlider = document.getElementById('contrast-level');

// In pixels
const previewMinWidth = 500;

// Function to show the overlay of the parameters for each page
export function showParameters(inputId, inputImgSrc, inputCorners) {
    console.log('showParameters()', inputId);

    // If new entry
    if (inputId === -1) {
        // Clear the object and copy values
        Object.assign(tempEntrie, JSON.parse(JSON.stringify(defaultEntrie)));
        // tempEntrie = JSON.parse(JSON.stringify(defaultEntrie)); // Deep copy defaultEntrie
        tempEntrie.imageOriginal.source = inputImgSrc;
        tempEntrie.cornerPoints = inputCorners;

        // Load the original image and create a scaled-down version
        const img = new Image();
        img.src = tempEntrie.imageOriginal.source;

        img.onload = () => {
            // Update original dimensions if not already set
            tempEntrie.imageOriginal.width = img.naturalWidth;
            tempEntrie.imageOriginal.height = img.naturalHeight;

            // Create a scaled-down version
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

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
            tempEntrie.imageScaled.canvas = canvas; // Store the canvas for future operations
            tempEntrie.imageScaled.source = canvas.toDataURL('image/jpeg'); // Save the scaled-down image as JPEG
            tempEntrie.imageScaled.scaleFactor =  canvas.width / img.naturalWidth;

            // Load scaled image in the parameters window
            parametersInputImage.src = tempEntrie.imageScaled.source;

            // Continue with parameter adjustments
            parametersInputImage.onload = () => {
                handleParametersLoaded();
            };
        };
    } else {
        // Load existing entry from the database
        const dbEntry = dbElemById(inputId);
        if (dbEntry) {
            Object.assign(tempEntrie, JSON.parse(JSON.stringify(dbEntry)));
    
            // Use the already scaled image source
            parametersInputImage.src = tempEntrie.imageScaled.source;

            // Load the image
            parametersInputImage.onload = () => {

                // Recreate the canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = parametersInputImage.naturalWidth;
                canvas.height = parametersInputImage.naturalHeight;
                ctx.drawImage(parametersInputImage, 0, 0);
                // Reassign the canvas
                tempEntrie.imageScaled.canvas = canvas; 

                // We continue
                handleParametersLoaded();
            };
        } else {
            console.error('Invalid input ID:', inputId);
            return;
        }
    }
}

// Function to handle parameter adjustments after the image is loaded
function handleParametersLoaded() {
    console.log('handleParametersLoaded()');

    // UI
    hideLoadingOverlay();
    showParameterOverlay();

    // Update scaled dimensions
    // const rect = parametersInputImage.getBoundingClientRect();
    // console.log('    rect', rect);
    // tempEntrie.imageScaled.width = rect.width;
    // tempEntrie.imageScaled.height = rect.height;
    // tempEntrie.imageScaled.top = rect.top;
    // tempEntrie.imageScaled.left = rect.left;

    // Niveaux etc
    updateParameters()

    // Position the UI markers
    positionMarkers();
}

// 
function updateParameters() {
    console.log('updateParameters()');

    initializeLevels();
    // update format etc
    // aplique le filtre à l'image aussi
}

// Function to position markers based on corner points
function positionMarkers() {

    if(!tempEntrie?.imageScaled?.width) return

    console.log('positionMarkers()');

    // Update scaled dimensions and coordinates
    const rect_inside = parametersInputImage.getBoundingClientRect();
    const rect_outside = parametersImageContainer.getBoundingClientRect();
    tempEntrie.imageScaled.width = rect_inside.width;
    tempEntrie.imageScaled.height = rect_inside.height;
    tempEntrie.imageScaled.containerTop = rect_outside.top;
    tempEntrie.imageScaled.containerLeft = rect_outside.left;
    tempEntrie.imageScaled.top = rect_inside.top - rect_outside.top - 1; // -1 border
    tempEntrie.imageScaled.left = rect_inside.left - rect_outside.left -1; // -1 border

    let a = tempEntrie;
    let b = tempEntrie.imageScaled;
    let c = tempEntrie.imageOriginal;
    let d = tempEntrie.cornerPoints;

    parametersMarkers.topLeftCorner.style.left = `${- 8 + b.left + (b.width * d.topLeftCorner.x / c.width)}px`;
    parametersMarkers.topLeftCorner.style.top = `${- 8 + b.top + (b.height * d.topLeftCorner.y / c.height)}px`;

    parametersMarkers.topRightCorner.style.left = `${- 8 + b.left + (b.width * d.topRightCorner.x / c.width)}px`;
    parametersMarkers.topRightCorner.style.top = `${- 8 + b.top + (b.height * d.topRightCorner.y / c.height)}px`;

    parametersMarkers.bottomLeftCorner.style.left = `${- 8 + b.left + (b.width * d.bottomLeftCorner.x / c.width)}px`;
    parametersMarkers.bottomLeftCorner.style.top = `${- 8 + b.top + (b.height * d.bottomLeftCorner.y / c.height)}px`;

    parametersMarkers.bottomRightCorner.style.left = `${- 8 + b.left + (b.width * d.bottomRightCorner.x / c.width)}px`;
    parametersMarkers.bottomRightCorner.style.top = `${- 8 + b.top + (b.height * d.bottomRightCorner.y / c.height)}px`;
 
    updateEdges();
}

function updateEdges() {
    // console.log('updateEdges()');

    // Calculate normalized positions for the polygon points
    const topLeftX = parseFloat(parametersMarkers.topLeftCorner.style.left) + 8;
    const topLeftY = parseFloat(parametersMarkers.topLeftCorner.style.top) + 8;

    const topRightX = parseFloat(parametersMarkers.topRightCorner.style.left) + 8;
    const topRightY = parseFloat(parametersMarkers.topRightCorner.style.top) + 8;

    const bottomLeftX = parseFloat(parametersMarkers.bottomLeftCorner.style.left) + 8;
    const bottomLeftY = parseFloat(parametersMarkers.bottomLeftCorner.style.top) + 8;

    const bottomRightX = parseFloat(parametersMarkers.bottomRightCorner.style.left) + 8;
    const bottomRightY = parseFloat(parametersMarkers.bottomRightCorner.style.top) + 8;

    // Update the polygon's points
    const points = `
        ${topLeftX},${topLeftY} 
        ${topRightX},${topRightY} 
        ${bottomRightX},${bottomRightY} 
        ${bottomLeftX},${bottomLeftY}
    `;
    parameterHighlightPolygon.setAttribute('points', points);
}

// Function to make markers draggable (only once)
function makeMarkersDraggable(marker, cornerKey) {
    const markerOffset = { x: -30, y: -30 }; // Finger offset
    const markerOffset_test = { x: 0, y: 0 }; // Finger offset

    const moveMarkerAt = (x, y) => {
        console.log('moveMarkerAt()');
        // Grab the data
        let a = tempEntrie;
        let b = tempEntrie.imageScaled;
        let c = tempEntrie.imageOriginal;

        // Update the UI
        marker.style.left = `${Math.max(-8, x - 8 - b.containerLeft)}px`;
        marker.style.top = `${Math.max(-8, y - 8 - b.containerTop)}px`;
        // marker.style.top = `${Math.max(-8, y - b.top)}px`;

        // refaire la trad !
        a.cornerPoints[cornerKey] = {
            x: c.width * (x - b.containerLeft - b.left ) / b.width, 
            y: c.height * (y - b.containerTop - b.top ) / b.height
        };

        updateEdges();
        // on indique un changement
        tempEntrie.changeOccured = true;
    };

    const onMouseMove = (e) => moveMarkerAt(e.clientX, e.clientY);
    const onTouchMove = (e) => {
        const touch = e.touches[0];
        moveMarkerAt(touch.clientX + markerOffset.x, touch.clientY + markerOffset.y);
    };

    // Mouse events
    marker.addEventListener('mousedown', (e) => {
        e.preventDefault();
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', onMouseMove);
            // console.log(tempEntrie.cornerPoints);
        }, { once: true });
    });

    // Touch events
    marker.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        moveMarkerAt(touch.clientX + markerOffset.x, touch.clientY + markerOffset.y); // Set initial position
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', () => {
            document.removeEventListener('touchmove', onTouchMove);
            // console.log(tempEntrie.cornerPoints);
        }, { once: true });
    });
}
// Add all the events to the corners
Object.entries(parametersMarkers).forEach(([key, marker]) => {
    makeMarkersDraggable(marker, key);
});

// CONFIRM BTN
parametersConfirmButton.addEventListener('click', parametersConfirm);
parametersCancelButton.addEventListener('click', parametersCancel);
parametersDeleteButton.addEventListener('click', parametersDelete);
rotateRightButton.addEventListener('click', () => rotateImage(90));
rotateLeftButton.addEventListener('click', () => rotateImage(-90));

function parametersConfirm() {
    console.log('confirm()');

    // Skip if no changes occurred
    if (!tempEntrie.changeOccured) {
        console.log('changeOccured', tempEntrie.changeOccured);
        parametersContainer.style.display = 'none';
        return;
    }

    // UI
    showLoadingOverlay();
    parametersContainer.style.display = 'none';

    // Create the entry to be stored in the db
    // const dataEntrie = structuredClone(tempEntrie); // Deep copy tempEntrie
    const dataEntrie = JSON.parse(JSON.stringify(tempEntrie));

    // Update the id and pageIndex if -1
    if (tempEntrie.id === -1) dataEntrie.id = generateUniqueId();
    if (tempEntrie.pageIndex === -1) dataEntrie.pageIndex = db.length;

    // Scaled the corners
    const scaledCornerPoints = scaleCornerPoints(tempEntrie.cornerPoints, tempEntrie.imageScaled.scaleFactor);

    // Extract the paper using the scaled corner points
    // Uses the parametersInputImage (with LUT & filter)
    const processedCanvas = scanner.extractPaper(parametersInputImage, paperWidthMM, paperHeightMM, scaledCornerPoints);

    // Add the canvas to the data
    dataEntrie.imageProcessed = processedCanvas;
    dataEntrie.changeOccured = false;

    // Create HTML element
    const newPage = createPageElement(dataEntrie.pageIndex, dataEntrie.id, processedCanvas);

    // Append or update in the DOM
    const existingPage = pageContainer.querySelector(`[data-id='${dataEntrie.id}']`);
    if (existingPage) {
        pageContainer.replaceChild(newPage, existingPage); // Update existing element
    } else {
        pageContainer.appendChild(newPage); // Add new element
    }

    // Add or update in the DB
    const existingEntry = dbElemById(dataEntrie.id);
    if (existingEntry) {
        // Update existing entry
        const indexInDb = db.indexOf(existingEntry);
        if (indexInDb !== -1) {
            db[indexInDb] = dataEntrie;
        }
    } else {
        // Add new entry
        db.push(dataEntrie);
    }

    // Clean filters
    cleanupLevels();

    // Reset the ES parameter
    Object.assign(tempEntrie, {});

    console.log('Processed image updated.');
    hideLoadingOverlay();
};

function parametersCancel() {
    console.log('cancel()');
    parametersContainer.style.display = 'none';
};

function parametersDelete() {
    console.log('delete()');
    parametersContainer.style.display = 'none';

    if (tempEntrie.id !== -1) {

        // Remove the element from the DOM
        const existingPage = pageContainer.querySelector(`[data-id='${tempEntrie.id}']`);
        if (existingPage) {
            existingPage.remove();
            console.log(`Removed DOM element with ID: ${tempEntrie.id}`);
        }

        // Remove the element from the DB
        const existingEntry = dbElemById(tempEntrie.id);
        if (existingEntry) {
            const indexInDb = db.indexOf(existingEntry);
            if (indexInDb !== -1) {
                db.splice(indexInDb, 1); // Remove the entry from the DB
                console.log(`Removed DB entry with ID: ${tempEntrie.id}`);
            }
        }

        // Rearrange the pageIndex in the DB
        db.sort((a, b) => a.pageIndex - b.pageIndex); // Ensure the DB is sorted by pageIndex
        db.forEach((entry, newIndex) => {
            // Update the pageIndex
            entry.pageIndex = newIndex;

            // Update the corresponding DOM element
            const correspondingPage = pageContainer.querySelector(`[data-id='${entry.id}']`);
            if (correspondingPage) {
                correspondingPage.style.order = newIndex; // Update the CSS order
                const indexLabel = correspondingPage.querySelector('.page-index');
                if (indexLabel) {
                    indexLabel.textContent = `${newIndex + 1}`; // Update the displayed page number
                }
            }
        });
    }
};

function rotateImage(degrees) {
    console.log('rotateImage()');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Create a temporary image
    const tempImage = new Image();
    tempImage.src = tempEntrie.imageScaled.source;

    tempImage.onload = () => {
        // Update rotation
        let currentRotation = degrees % 360;
        tempEntrie.imageScaled.rotation += currentRotation; // Save it
        tempEntrie.changeOccured = true;

        // Invert dimensions for new canvas
        canvas.width = tempImage.height;
        canvas.height = tempImage.width;

        // Apply rotation
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((currentRotation * Math.PI) / 180);
        ctx.drawImage(tempImage, -tempImage.width / 2, -tempImage.height / 2);

        // Update the image source in the UI
        tempEntrie.imageScaled.canvas = canvas;
        tempEntrie.imageScaled.source = canvas.toDataURL('image/jpeg');
        
        // Update the corner points based on rotation
        const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = tempEntrie.cornerPoints;
        let newCornerPoints;

        if (degrees === 90) {
            newCornerPoints = {
                topLeftCorner: {
                    x: tempEntrie.imageOriginal.height - bottomLeftCorner.y,
                    y: bottomLeftCorner.x,
                },
                topRightCorner: {
                    x: tempEntrie.imageOriginal.height - topLeftCorner.y,
                    y: topLeftCorner.x,
                },
                bottomLeftCorner: {
                    x: tempEntrie.imageOriginal.height - bottomRightCorner.y,
                    y: bottomRightCorner.x,
                },
                bottomRightCorner: {
                    x: tempEntrie.imageOriginal.height - topRightCorner.y,
                    y: topRightCorner.x,
                },
            };
        } 
        else if (degrees === -90) {
            newCornerPoints = {
                topLeftCorner: {
                    x: topRightCorner.y,
                    y: tempEntrie.imageOriginal.width - topRightCorner.x,
                },
                topRightCorner: {
                    x: bottomRightCorner.y,
                    y: tempEntrie.imageOriginal.width - bottomRightCorner.x,
                },
                bottomLeftCorner: {
                    x: topLeftCorner.y,
                    y: tempEntrie.imageOriginal.width - topLeftCorner.x,
                },
                bottomRightCorner: {
                    x: bottomLeftCorner.y,
                    y: tempEntrie.imageOriginal.width - bottomLeftCorner.x,
                },
            };
        }

        // Log
        // console.log('Old Coner Points', tempEntrie.cornerPoints);
        // console.log('New Coner Points', newCornerPoints);

        // Update tempEntrie
        const { width, height } = tempEntrie.imageOriginal;
        tempEntrie.imageOriginal.width = height;
        tempEntrie.imageOriginal.height = width;
        tempEntrie.cornerPoints = newCornerPoints;

        // Update the src with new JPG
        parametersInputImage.src = tempEntrie.imageScaled.source;
        // Continue with parameter adjustments
        parametersInputImage.onload = () => {
            // Update scaled dimensions
            const rect = parametersInputImage.getBoundingClientRect();
            tempEntrie.imageScaled.width = rect.width;
            tempEntrie.imageScaled.height = rect.height;
            tempEntrie.imageScaled.top = rect.top;
            tempEntrie.imageScaled.left = rect.left;

            // Position the UI markers
            positionMarkers();

            // Apply again the Levels
            // applyLevelsWithOpenCV();
        };
    };
}

// WINDOW RESIZE
window.addEventListener('resize', handleResize);
function handleResize() {
    console.log("Window resized: ", window.innerWidth, "x", window.innerHeight);
    positionMarkers();
}

// LEVELS
const blackSlider = document.getElementById('black-level');
const middleSlider = document.getElementById('middle-level');
const whiteSlider = document.getElementById('white-level');
// const grayscaleState = document.getElementById('grayscale-tmp');
const grayscaleState = document.getElementById('js-grayscale');


blackSlider.addEventListener('input', applyLevelsWithOpenCV);
middleSlider.addEventListener('input', applyLevelsWithOpenCV);
whiteSlider.addEventListener('input', applyLevelsWithOpenCV);
grayscaleState.addEventListener('click', applyLevelsWithOpenCV);

let src, dst, originalCanvas, ctx;
let CV_isSet = false;

// Initialize the canvas and OpenCV matrices
function initializeLevels() {
    console.log('initializeLevels()');

    // Indicate a change
    if(!tempEntrie.changeOccured) tempEntrie.changeOccured = true

    // Retrieve the target canvas
    originalCanvas = tempEntrie.imageScaled.canvas;

    // Load the canvas into an OpenCV Mat
    src = cv.imread(originalCanvas);
    dst = new cv.Mat();
    src.copyTo(dst); // Ensure `dst` matches dimensions of `src`

    // Change the parameters to the targeted values
    blackSlider.value = tempEntrie.imageParameters.filter.black;
    middleSlider.value = tempEntrie.imageParameters.filter.middle;
    whiteSlider.value = tempEntrie.imageParameters.filter.white;
    // grayscaleState.checked = tempEntrie.imageParameters.filter.grayscale;

    // Set the toggle state based on an external value
    if (tempEntrie.imageParameters.filter.grayscale) {
        setToggleState(grayscaleState, 'grayscale');
    } else {
        setToggleState(grayscaleState, 'color');
    }

    // We save
    CV_isSet = true;

    // Apply initial levels
    applyLevelsWithOpenCV();
}

// Function to apply Levels Adjustment with OpenCV.js
function applyLevelsWithOpenCV() {
    console.log('applyLevelsWithOpenCV()');

    if(!src) {
        console.log('   > "src" not defined, return')
        return
    }

    if (!CV_isSet) {
        CV_isSet = true;
        initializeLevels();
    }

    // Retrieve the parameters values
    const black = parseInt(blackSlider.value, 10);
    const white = parseInt(whiteSlider.value, 10);
    const middle = parseFloat(middleSlider.value);
    const grayscale = grayscaleState.dataset.activeOption == 'grayscale';

    // Start with the original source matrix
    let workingMat = new cv.Mat();
    src.copyTo(workingMat); // Copy the original src matrix

    // If grayscale is enabled, convert the source to grayscale
    let graySrc = null;
    if (grayscale) {
        graySrc = new cv.Mat();
        cv.cvtColor(workingMat, graySrc, cv.COLOR_RGBA2GRAY, 0); // Convert to grayscale
        cv.cvtColor(graySrc, workingMat, cv.COLOR_GRAY2RGBA, 0); // Back to RGBA
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
    const srcData = workingMat.data;
    const dstData = dst.data;
    for (let i = 0; i < srcData.length; i++) {
        dstData[i] = lut[srcData[i]];
    }

    // Update the canvas
    cv.imshow(originalCanvas, dst);

    // Update the src file with the right values
    parametersInputImage.onload = null; // Remove the onload
    parametersInputImage.src = originalCanvas.toDataURL('image/jpeg');

    // Save the parameters for later
    tempEntrie.imageParameters.filter.black = black;
    tempEntrie.imageParameters.filter.middle = middle;
    tempEntrie.imageParameters.filter.white = white;
    tempEntrie.imageParameters.filter.grayscale = grayscale;
}

// Clean up matrices when done
function cleanupLevels() {
    if (src) src.delete();
    if (dst) dst.delete();
    if (CV_isSet) CV_isSet = false;
}



// ======
// HELPER
// ======

// Scale corner points with the scale factor
function scaleCornerPoints(cornerPoints, scaleFactor) {
    return {
        topLeftCorner: {
            x: cornerPoints.topLeftCorner.x * scaleFactor,
            y: cornerPoints.topLeftCorner.y * scaleFactor,
        },
        topRightCorner: {
            x: cornerPoints.topRightCorner.x * scaleFactor,
            y: cornerPoints.topRightCorner.y * scaleFactor,
        },
        bottomLeftCorner: {
            x: cornerPoints.bottomLeftCorner.x * scaleFactor,
            y: cornerPoints.bottomLeftCorner.y * scaleFactor,
        },
        bottomRightCorner: {
            x: cornerPoints.bottomRightCorner.x * scaleFactor,
            y: cornerPoints.bottomRightCorner.y * scaleFactor,
        },
    };
}

*/