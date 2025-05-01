// IMPORTS
import { tempEntry, loadTempEntry, saveTempEntry, deleteTempEntry } from './db.js'
import { showLoadingOverlay, hideLoadingOverlay, loadingLog } from './overlayLoading.js';
import { updatePageElement, removePageElement } from './pageElement.js';
import { scanner } from '../utils/externalLib.js';
import { consoleLogCanvas } from '../utils/helper.js';
import { drawHistogram } from './histogram.js';
import { positionSliders } from './adjustmentSliders.js'

// - - - - - - - - - - - - - - -

// HTML ELEMENTS
const parameterOverlay = document.getElementById('parameters-overlay');
const imageContainer  = parameterOverlay.querySelector('#parameter-image-container');
const imageElem = parameterOverlay.querySelector('#parameter-image');
const cornersElem = {
    topLeftCorner: parameterOverlay.querySelector('#top-left-corner'),
    topRightCorner: parameterOverlay.querySelector('#top-right-corner'),
    bottomRightCorner: parameterOverlay.querySelector('#bottom-right-corner'),
    bottomLeftCorner: parameterOverlay.querySelector('#bottom-left-corner'),
};
const highlightEdge = parameterOverlay.querySelector('#highlight-edge-polygon');

// ACTION BUTTONS
const saveButton = parameterOverlay.querySelector('#parameter-save-button');
const cancelButton = parameterOverlay.querySelector('#parameter-cancel-button');
const deleteButton = parameterOverlay.querySelector('#parameter-delete-button');
saveButton.addEventListener('click', parametersSave);
cancelButton.addEventListener('click', parametersCancel);
deleteButton.addEventListener('click', parametersDelete);

// ROTATE BUTTONS
const rotateLeftButton = parameterOverlay.querySelector('#parameter-rotate-left-button');
const rotateRightButton = parameterOverlay.querySelector('#parameter-rotate-right-button');

// - - - - - - - - - - - - - - -



// - - - - - - - - - - - - - - -

// UI
function prepareParameterOverlay() {
    parameterOverlay.classList.add('invisible');
    parameterOverlay.classList.remove('hidden');
}
function showParameterOverlay() {
    hideLoadingOverlay();
    parameterOverlay.classList.remove('hidden');
    parameterOverlay.classList.remove('invisible');
    document.body.classList.add('no-scroll');
}
function hideParameterOverlay() {
    parameterOverlay.classList.add('hidden');
    document.body.classList.remove('no-scroll');
}

// showParameterOverlay();

// - - - - - - - - - - - - - - -

/*
    At loadParameterOverlay()
    1 - ✅ Update the filter elements based on : tempEntry.imageParameters.filter
    2 - ✅ Extract the canvas, based on : tempEntry.imageScaled.source and .rotation
    3 - ✅ Draw the image on the working canvas based on : tempEntry.imageParameters.filter and the rotated canvas
    4 - ✅ Update the image source in the UI based on the working canvas
    5 - ✅ Remove the loading overlay and show the parameter overlay
    6 - ✅ Place the corner elements based on : tempEntry.cornerPoints, tempEntry.imageScaled.size.scaleFactor and tempEntry.imageScaled.position

    Initialize the interactions
    - On the filter sliders
        (3-4)
    - On the grayscale toggle
        (3-4)
    - On the delete button
    - On the save button
    - On the cancel button
    - On the rotate left button
        (2-3-4)
    - On the rotate right button
        (2-3-4)
*/

// Load the parameter overlay
// (only once tempEntry is loaded)
export async function loadParameterOverlay() {
    console.log('> loadParameterOverlay()');
    loadingLog('Loading parameters...');

    prepareParameterOverlay();

    // Extract the canvas
    await drawBaseCanvas();

    // Start preparing the working canvas
    initializeWorkingCanvas();
}


// IMAGE CANVAS
// For base image with rotation
const baseCanvas = document.createElement('canvas');
const baseCtx = baseCanvas.getContext('2d');

// Function to draw the base canvas
// At start and when rotating
function drawBaseCanvas() {
    return new Promise(resolve => {
        console.log('> drawBaseCanvas()');

        // Extract the clean current rotation
        let currentRotation = tempEntry.imageScaled.rotation

        // Set the canvas dimensions based on the rotation
        if(currentRotation == 90 || currentRotation == 270) {
            baseCanvas.width = tempEntry.imageScaled.size.height;
            baseCanvas.height = tempEntry.imageScaled.size.width;
        }
        else {
            baseCanvas.width = tempEntry.imageScaled.size.width;
            baseCanvas.height = tempEntry.imageScaled.size.height;
        }

        // Set the preview image size
        tempEntry.imagePreview.size.width = baseCanvas.width;
        tempEntry.imagePreview.size.height = baseCanvas.height;

        // Draw the tempEntry.imageScaled source on the canvas
        const img = new Image();
        img.src = tempEntry.imageScaled.source;
        img.onload = () => {
            // Apply rotation
            baseCtx.translate(baseCanvas.width / 2, baseCanvas.height / 2);
            baseCtx.rotate((currentRotation * Math.PI) / 180);
            // baseCtx.drawImage(img, -baseCanvas.width / 2, -baseCanvas.height / 2);
            // Draw the scaled image
            baseCtx.drawImage(
                img,
                -tempEntry.imageScaled.size.width / 2, // Center the image
                -tempEntry.imageScaled.size.height / 2,
                tempEntry.imageScaled.size.width, // Use scaled width
                tempEntry.imageScaled.size.height // Use scaled height
            );

            console.log('Base canvas drawn.');
            consoleLogCanvas(baseCanvas);
            resolve();
        }
    });
}



// - - - - - - - - - - - - - - -
//           ROTATTION
// - - - - - - - - - - - - - - -

rotateRightButton.addEventListener('click', () => rotateImage(90));
rotateLeftButton.addEventListener('click', () => rotateImage(-90));

// ROTATE BUTTONS
// 'degrees' might only be -90 or 90
async function rotateImage(degrees) {
    console.log('> rotateImage()');

    // Check if the rotation is valid
    if(degrees !== 90 && degrees !== -90) {
        console.log('Invalid degrees rotation:', degrees);
        return;
    }

    // Update the indicator
    markersIsSet = false;

    // Update the rotation
    let rotation = (tempEntry.imageScaled.rotation + degrees) % 360;

    // Normalize the rotation to a 0–360 range
    const normalizedRotation = ((rotation % 360) + 360) % 360;

    // Save back the new rotation
    tempEntry.imageScaled.rotation = normalizedRotation;

    // Re draw the canvas
    await drawBaseCanvas();

    // Update the corner points based on rotation
    // Either -90 or 90
    await rotateCornerPoints(degrees);

    // Invert dimensions of the original image
    const { width, height } = tempEntry.imageOriginal.size;
    tempEntry.imageOriginal.size = {
        width: height,
        height: width,
    };

    // Reset the working canvas
    initializeWorkingCanvas();
}

// Function to rotate the corner points in tempEntry
function rotateCornerPoints(degrees) {
    return new Promise(resolve => {
        console.log('> rotateCornerPoints()');

        // Check if the rotation is valid
        if(degrees !== 90 && degrees !== -90) {
            console.log('Invalid degrees rotation:', degrees);
            return;
        }

        // Update the corner points based on rotation
        const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = tempEntry.cornerPoints;
        let newCornerPoints;

        if (degrees === 90) {
            newCornerPoints = {
                topLeftCorner: {
                    x: tempEntry.imageOriginal.size.height - bottomLeftCorner.y,
                    y: bottomLeftCorner.x,
                },
                topRightCorner: {
                    x: tempEntry.imageOriginal.size.height - topLeftCorner.y,
                    y: topLeftCorner.x,
                },
                bottomLeftCorner: {
                    x: tempEntry.imageOriginal.size.height - bottomRightCorner.y,
                    y: bottomRightCorner.x,
                },
                bottomRightCorner: {
                    x: tempEntry.imageOriginal.size.height - topRightCorner.y,
                    y: topRightCorner.x,
                },
            };
        } 
        else if (degrees === -90) {
            newCornerPoints = {
                topLeftCorner: {
                    x: topRightCorner.y,
                    y: tempEntry.imageOriginal.size.width - topRightCorner.x,
                },
                topRightCorner: {
                    x: bottomRightCorner.y,
                    y: tempEntry.imageOriginal.size.width - bottomRightCorner.x,
                },
                bottomLeftCorner: {
                    x: topLeftCorner.y,
                    y: tempEntry.imageOriginal.size.width - topLeftCorner.x,
                },
                bottomRightCorner: {
                    x: bottomLeftCorner.y,
                    y: tempEntry.imageOriginal.size.width - bottomLeftCorner.x,
                },
            }
        }

        console.log('Old Coner Points', tempEntry.cornerPoints);
        console.log('New Coner Points', newCornerPoints);

        // Update the corner points
        tempEntry.cornerPoints = newCornerPoints;
        resolve();
    });
}



// - - - - - - - - - - - - - - -
//       LEVELS ADJUSTMENT
// - - - - - - - - - - - - - - -


// For filter modifications
const workingCanvas = document.createElement('canvas');
const workingCtx = workingCanvas.getContext('2d');
// let workingMat;
// Wait for OpenCV.js to initialize
// console.log(cv.getBuildInformation());
if (typeof cv.imshow === 'function') {
    console.warn('> Targetted function IS available in this build.');
} else {
    console.warn('> Targetted function IS NOT available in this build.');
}
// cv['onRuntimeInitialized'] = () => {
//     workingMat = new cv.Mat();
// };
let workingSrc = null;
let workingCvIsSet = false;
let histogramIsSet = false;
let previewImageIsSet = false;

// Initialize the working canvas once the base is ready
function initializeWorkingCanvas() {
    console.log('> initializeWorkingCanvas()');
    console.log('Initializating the working canvas...');

    // Set the canvas size based on the base canvas
    workingCanvas.width = baseCanvas.width;
    workingCanvas.height = baseCanvas.height;

    // Load the canvas into an OpenCV Mat
    workingSrc = cv.imread(baseCanvas);

    // We save
    workingCvIsSet = true;

    console.log('Working canvas is ready.');
    // Update the filter elements UI

    // Draw the histogram
    if(!histogramIsSet) {
        drawHistogram(workingSrc);
        histogramIsSet = true;
    }

    // Apply levels
    applyLevelsWithOpenCV();
}

// Function to apply Levels Adjustment with OpenCV.js
export function applyLevelsWithOpenCV() {
    console.log('> applyLevelsWithOpenCV()');
    console.log('Filters', tempEntry.imageParameters.filter);

    // Check if OpenCV is initialized
    if (!workingCvIsSet) {
        initializeWorkingCanvas();
        return;
    }

    // Retrieve the filter values
    const black = tempEntry.imageParameters.filter.black;
    const white = tempEntry.imageParameters.filter.white;
    const middle = tempEntry.imageParameters.filter.middle;
    const grayscale = tempEntry.imageParameters.filter.colorMode === 'grayscale';
    const blackAndWhite = tempEntry.imageParameters.filter.blackAndWhite;
    const colorMode = tempEntry.imageParameters.filter.colorMode;

    // Initialize workingDst with the same size and type as workingSrc
    let workingDst = new cv.Mat(workingSrc.rows, workingSrc.cols, workingSrc.type());
    
    // Directly access source and destination data
    let srcData = workingSrc.data;
    let dstData = workingDst.data;


    // Prepare the LUT
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        let value = (i - black) / (white - black); // Normalize
        value = Math.max(0, Math.min(1, value)); // Clamp
        value = Math.pow(value, middle); // Mid-tone adjustment
        lut[i] = Math.round(value * 255); // Scale to 0-255
    }

    // Apply grayscale and LUT in a single loop
    console.log('Applying LUT...');
    for (let i = 0; i < srcData.length; i += 4) {
        let r = srcData[i];
        let g = srcData[i + 1];
        let b = srcData[i + 2];
        let a = srcData[i + 3]; // Alpha channel

        // Convert to grayscale if needed
        if (colorMode == 'grayscale') {
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            r = g = b = gray;
        }

        // Apply LUT
        dstData[i] = lut[r];
        dstData[i + 1] = lut[g];
        dstData[i + 2] = lut[b];
        dstData[i + 3] = a; // Preserve alpha channel
    }

    // Update the canvas
    console.log('Updating the canvas...');
    cv.imshow(workingCanvas, workingDst);

    // Release memory
    workingDst.delete();
    srcData = null;
    dstData = null;

    // console.log('Levels applied on working canvas.');
    updateImage();
}

// Function to update the image source in the UI
function updateImage() {
    console.log('> updateImage()');

    // Extract the image data
    const img = workingCanvas.toDataURL('image/jpeg')

    // Update the db
    tempEntry.imagePreview.source = img;

    // Update the image source in the UI
    imageElem.src = img;

    // Continue with parameter adjustments
    imageElem.onload = () => {
        console.log('Image source updated.');

        // if the image is not set
        // The first time
        if(!previewImageIsSet) {
            previewImageIsSet = true;
            // Show the overlay
            showParameterOverlay();
        }

        // Position the UI markers
        if(!markersIsSet) {
            markersIsSet = true;
            positionMarkers();
            positionSliders();
        }
    };
}



// - - - - - - - - - - - - - - -
//       MARKERS POSITION
// - - - - - - - - - - - - - - -


const markerSize = 16;
let markersIsSet = false;

// Position UI markers the first time 
// at each rotation
// and when the window is resized
function positionMarkers() {
    // Get out if we dont have them already
    if(!tempEntry.cornerPoints) return

    console.log('> positionMarkers()');
    console.log(tempEntry.cornerPoints);

    // Update scaled dimensions and coordinates
    const rect_inside = imageElem.getBoundingClientRect();
    const rect_outside = imageContainer.getBoundingClientRect();
    tempEntry.imagePreview.position.width = rect_inside.width;
    tempEntry.imagePreview.position.height = rect_inside.height;
    tempEntry.imagePreview.position.containerTop = rect_outside.top;
    tempEntry.imagePreview.position.containerLeft = rect_outside.left;
    tempEntry.imagePreview.position.top = rect_inside.top - rect_outside.top;
    tempEntry.imagePreview.position.left = rect_inside.left - rect_outside.left;
    // console.log(tempEntry.imagePreview.position);

    let a = tempEntry;
    let b = tempEntry.imagePreview.position;
    // let originalSize;
    // if (a.imageScaled.rotation === 90 || a.imageScaled.rotation === 270) {
    //     originalSize = { 
    //         width: a.imageOriginal.size.height, 
    //         height: a.imageOriginal.size.width 
    //     };
    // } else {
    //     originalSize = { 
    //         width: a.imageOriginal.size.width, 
    //         height: a.imageOriginal.size.height
    //     };
    // }
    let c = tempEntry.imageOriginal.size;
    let d = tempEntry.cornerPoints;
    // console.log('imageOriginal size', tempEntry.imageOriginal.size);
    // console.log('imagePreview size', tempEntry.imagePreview.size);

    // console.log(cornersElem);
    let temp_left = `${- markerSize / 2 + b.left + (b.width * d.topLeftCorner.x / c.width)}px`;
    let temp_top = `${- markerSize / 2 + b.top + (b.height * d.topLeftCorner.y / c.height)}px`;
    // console.log(markerSize, b.left, b.width, d.topLeftCorner.x, c.width);
    // console.log(markerSize, b.top, b.height, d.topLeftCorner.y, c.height);
    // console.log('d.topLeftCorner', d.topLeftCorner);
    // console.log('new top', temp_top, '- left', temp_left);

    cornersElem.topLeftCorner.style.left = temp_left;
    cornersElem.topLeftCorner.style.top = temp_top;

    cornersElem.topRightCorner.style.left = `${- markerSize / 2 + b.left + (b.width * d.topRightCorner.x / c.width)}px`;
    cornersElem.topRightCorner.style.top = `${- markerSize / 2 + b.top + (b.height * d.topRightCorner.y / c.height)}px`;

    cornersElem.bottomRightCorner.style.left = `${- markerSize / 2 + b.left + (b.width * d.bottomRightCorner.x / c.width)}px`;
    cornersElem.bottomRightCorner.style.top = `${- markerSize / 2 + b.top + (b.height * d.bottomRightCorner.y / c.height)}px`;

    cornersElem.bottomLeftCorner.style.left = `${- markerSize / 2 + b.left + (b.width * d.bottomLeftCorner.x / c.width)}px`;
    cornersElem.bottomLeftCorner.style.top = `${- markerSize / 2 + b.top + (b.height * d.bottomLeftCorner.y / c.height)}px`;

    // Update the edges
    updateEdges();
}

// Update edges of the polygon
function updateEdges() {
    // console.log('> updateEdges()');

    const points = Object.values(cornersElem)
        .map(marker => {
            const left = parseFloat(marker.style.left) + markerSize / 2;
            const top = parseFloat(marker.style.top) + markerSize / 2;
            return `${left},${top}`;
        })
        .join(' ');

    // console.log(points);
    highlightEdge.setAttribute('points', points);
}

// Function to make markers draggable
// Only once
function makeMarkersDraggable(marker, cornerKey) {
    const markerOffset_final = { x: -20, y: -20 }; // Finger offset
    const markerOffset = { x: 0, y: 0 }; // For testing

    const moveMarkerAt = (x, y) => {
        console.log('> moveMarkerAt()');
        // Grab the data
        // let a = tempEntry;
        let b = tempEntry.imagePreview.position;
        let c = tempEntry.imageOriginal.size;

        // Update the UI
        marker.style.left = `${Math.max(-8, x - 8 - b.containerLeft)}px`;
        marker.style.top = `${Math.max(-8, y - 8 - b.containerTop)}px`;
        // marker.style.top = `${Math.max(-8, y - b.top)}px`;

        // Refaire la trad !
        tempEntry.cornerPoints[cornerKey] = {
            x: c.width * (x - b.containerLeft - b.left ) / b.width, 
            y: c.height * (y - b.containerTop - b.top ) / b.height
        };

        // Update the polygon
        updateEdges();

        // on indique un changement
        tempEntry.changeOccured = true;
    };

    const onMouseMove = (e) => moveMarkerAt(e.clientX, e.clientY);
    const onTouchMove = (e) => moveMarkerAt(e.touches[0].clientX + markerOffset.x, e.touches[0].clientY + markerOffset.y);

    // MOUSE EVENTS
    marker.addEventListener('mousedown', (e) => {
        e.preventDefault();
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', onMouseMove);
            // console.log(tempEntrie.cornerPoints);
        }, { once: true });
    });

    // TOUCH EVENTS
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
Object.entries(cornersElem).forEach(([key, marker]) => {
    makeMarkersDraggable(marker, key);
});

// Window resize event
window.addEventListener('resize', handleResize);
function handleResize() {
    console.log("> Window resized: ", window.innerWidth, "x", window.innerHeight);
    positionMarkers();
}



// - - - - - - - - - - - - - - -
//      SAVE CANCEL DELETE
// - - - - - - - - - - - - - - -


function parametersSave() {
    console.log('> parametersSave()');

    // Skip if no changes occurred
    if (!tempEntry.changeOccured) {
        console.log('changeOccured', tempEntry.changeOccured);
        return;
    }

    // UI
    showLoadingOverlay();
    hideParameterOverlay();

    // Deduce the scaled corners
    const scaledCornerPoints = scaleCornerPoints(tempEntry.cornerPoints, tempEntry.imageScaled.size.scaleFactor);

    // Extract the paper using the scaled corner points
    // And the workingCanvas (with rotation & LUT & filter)
    const processedCanvas = scanner.extractPaper(workingCanvas, 100, 100, scaledCornerPoints);

    // Log the canvas
    consoleLogCanvas(processedCanvas);

    // Add the canvas to the data
    tempEntry.imagePagePreview.source = processedCanvas.toDataURL('image/jpeg');

    // Update the DB
    saveTempEntry();

    // Cleanup
    cleanup();

    // Update the page in the DOM
    updatePageElement(tempEntry.id);

    // UI hide overlay
    hideLoadingOverlay();
}

function parametersCancel() {
    console.log('> parametersCancel()');

    // Cleanup
    cleanup();

    // Hide UI
    hideParameterOverlay();
}

function parametersDelete() {
    console.log('> parametersDelete()');

    // Cleanup
    cleanupVariables();

    // Remove page element
    removePageElement(tempEntry.id);

    // Remove from the DB
    deleteTempEntry();
}








// ========
//  HELPER
// ========

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

// Clean up at the end
function cleanupVariables() {
    console.log('cleanupVariables()');
    if (workingSrc) workingSrc.delete();
    if (workingCvIsSet) workingCvIsSet = false;
    if (previewImageIsSet) previewImageIsSet = false;
    if (histogramIsSet) histogramIsSet = false;
    if (markersIsSet) markersIsSet = false;
}



// =========================================================
// =========================================================
// =========================================================
// =========================================================

/*
// HTML
// const parametersContainer = document.getElementById('parameters-overlay');
// const parametersImageContainer  = parametersContainer.querySelector('#image-container');
// const parametersInputImage = parametersContainer.querySelector('#input-image');
// const parametersMarkers = {
//     topLeftCorner: document.getElementById('top-left-corner'),
//     topRightCorner: document.getElementById('top-right-corner'),
//     bottomLeftCorner: document.getElementById('bottom-left-corner'),
//     bottomRightCorner: document.getElementById('bottom-right-corner'),
// };
// Pre-declare variables outside the function
// const parameterHighlightPolygon = document.getElementById('highlight-polygon');
// const parameterHighlightSVG = document.getElementById('highlight-svg');
// const parameterEdge = document.getElementById('square-edges');
// const parametersConfirmButton = document.getElementById('confirm-button');
// const parametersCancelButton = document.getElementById('cancel-button');
// const parametersDeleteButton = document.getElementById('delete-button');
// const rotateRightButton = document.getElementById('rotate-right-button');
// const rotateLeftButton = document.getElementById('rotate-left-button');

// In pixels
const previewMinWidth = 500;

// Function to show the overlay of the parameters for each page
function showParameters_old(inputId, inputImgSrc, inputCorners) {
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
            // // Update original dimensions if not already set
            // tempEntrie.imageOriginal.width = img.naturalWidth;
            // tempEntrie.imageOriginal.height = img.naturalHeight;

            // // Create a scaled-down version
            // const canvas = document.createElement('canvas');
            // const ctx = canvas.getContext('2d');

            // const aspectRatio = img.naturalWidth / img.naturalHeight;
            // if (aspectRatio > 1) {
            //     // Landscape: shorter side is height
            //     canvas.width = Math.round(previewMinWidth * aspectRatio);
            //     canvas.height = previewMinWidth;
            // } else {
            //     // Portrait: shorter side is width
            //     canvas.width = previewMinWidth;
            //     canvas.height = Math.round(previewMinWidth / aspectRatio);
            // }

            // // Draw scaled image onto canvas
            // ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // // Save scaled canvas and JPEG data
            // tempEntrie.imageScaled.canvas = canvas; // Store the canvas for future operations
            // tempEntrie.imageScaled.source = canvas.toDataURL('image/jpeg'); // Save the scaled-down image as JPEG
            // tempEntrie.imageScaled.scaleFactor =  canvas.width / img.naturalWidth;

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
function handleParametersLoaded_old() {
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
function updateParameters_old() {
    console.log('updateParameters()');

    initializeLevels();
    // update format etc
    // aplique le filtre à l'image aussi
}

// Rotate the image canvas
function rotateImage_old(degrees) {

    // Update rotation
    // let currentRotation = tempEntry.imageScaled.rotation % 360;
    // tempEntrie.imageScaled.rotation += currentRotation; // Save it
    // tempEntrie.changeOccured = true;

    // Invert dimensions for new canvas
    // canvas.width = tempImage.height;
    // canvas.height = tempImage.width;


    // Update the image source in the UI
    // tempEntrie.imageScaled.canvas = canvas;
    // tempEntrie.imageScaled.source = canvas.toDataURL('image/jpeg');
    

    // Log
    // console.log('Old Coner Points', tempEntrie.cornerPoints);
    // console.log('New Coner Points', newCornerPoints);

    // Update tempEntrie
    const { width, height } = tempEntrie.imageOriginal;
    tempEntrie.imageOriginal.width = height;
    tempEntrie.imageOriginal.height = width;

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
    }
}


// Position UI markers
function positionMarkers_old() {
    if (!tempEntrie?.imageScaled?.width) return;

    const { topLeft, topRight, bottomLeft, bottomRight } = parametersMarkers;
    const rect = parametersInputImage.getBoundingClientRect();
    const scaled = tempEntrie.imageScaled;
    const original = tempEntrie.imageOriginal;
    const corners = tempEntrie.cornerPoints;

    scaled.width = rect.width;
    scaled.height = rect.height;

    updateMarkerPosition(topLeft, corners.topLeft, scaled, original);
    updateMarkerPosition(topRight, corners.topRight, scaled, original);
    updateMarkerPosition(bottomLeft, corners.bottomLeft, scaled, original);
    updateMarkerPosition(bottomRight, corners.bottomRight, scaled, original);

    updateEdges();
}

// Update marker position
function updateMarkerPosition_old(marker, corner, scaled, original) {
    marker.style.left = `${scaled.left + (scaled.width * corner.x / original.width)}px`;
    marker.style.top = `${scaled.top + (scaled.height * corner.y / original.height)}px`;
}

// Update edges of the polygon
function updateEdges_old() {
    const points = Object.values(parametersMarkers)
        .map(marker => {
            const left = parseFloat(marker.style.left);
            const top = parseFloat(marker.style.top);
            return `${left},${top}`;
        })
        .join(' ');

    parameterHighlightPolygon.setAttribute('points', points);
}



// Function to make markers draggable (only once)
function makeMarkersDraggable_old(marker, cornerKey) {
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
// Object.entries(parametersMarkers).forEach(([key, marker]) => {
//     makeMarkersDraggable(marker, key);
// });

// CONFIRM BTN
// parametersConfirmButton.addEventListener('click', parametersConfirm);
// parametersCancelButton.addEventListener('click', parametersCancel);
// parametersDeleteButton.addEventListener('click', parametersDelete);
// rotateRightButton.addEventListener('click', () => rotateImage(90));
// rotateLeftButton.addEventListener('click', () => rotateImage(-90));

function parametersConfirm_old() {
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

function parametersCancel_old() {
    console.log('cancel()');
    parametersContainer.style.display = 'none';
};

function parametersDelete_old() {
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



// WINDOW RESIZE
// window.addEventListener('resize', handleResize);
// function handleResize() {
//     console.log("Window resized: ", window.innerWidth, "x", window.innerHeight);
//     positionMarkers();
// }

// LEVELS
// const blackSlider = document.getElementById('black-level');
// const middleSlider = document.getElementById('middle-level');
// const whiteSlider = document.getElementById('white-level');
// const grayscaleState = document.getElementById('grayscale-tmp');
// const grayscaleState = document.getElementById('js-grayscale');
// blackSlider.addEventListener('input', applyLevelsWithOpenCV);
// middleSlider.addEventListener('input', applyLevelsWithOpenCV);
// whiteSlider.addEventListener('input', applyLevelsWithOpenCV);
// grayscaleState.addEventListener('click', applyLevelsWithOpenCV);

// let src, dst, originalCanvas, ctx;
// let CV_isSet = false;

// Initialize the canvas and OpenCV matrices
function initializeLevels_old() {
    console.log('initializeLevels()');

    // Indicate a change
    if(!tempEntrie.changeOccured) tempEntrie.changeOccured = true

    // Retrieve the target canvas
    originalCanvas = tempEntrie.imageScaled.canvas;

    // Load the canvas into an OpenCV Mat
    src = cv.imread(originalCanvas);
    dst = new cv.Mat();
    src.copyTo(dst); // Ensure `dst` matches dimensions of `src`
    // We save
    CV_isSet = true;

    // // Change the parameters to the targeted values
    // blackSlider.value = tempEntrie.imageParameters.filter.black;
    // middleSlider.value = tempEntrie.imageParameters.filter.middle;
    // whiteSlider.value = tempEntrie.imageParameters.filter.white;
    // // grayscaleState.checked = tempEntrie.imageParameters.filter.grayscale;

    // // Set the toggle state based on an external value
    // if (tempEntrie.imageParameters.filter.grayscale) {
    //     setToggleState(grayscaleState, 'grayscale');
    // } else {
    //     setToggleState(grayscaleState, 'color');
    // }


    // Apply initial levels
    applyLevelsWithOpenCV();
}

// Function to apply Levels Adjustment with OpenCV.js
function applyLevelsWithOpenCV_old() {
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
function cleanupLevels_old() {
    if (src) src.delete();
    if (dst) dst.delete();
    if (CV_isSet) CV_isSet = false;
}

// ======
// HELPER
// ======






// Function to apply Levels Adjustment with OpenCV.js
function applyLevelsWithOpenCV_old() {
    console.log('> applyLevelsWithOpenCV()');

    // Check if the OpenCV is set
    if (!workingCvIsSet) {
        initializeWorkingCanvas();
        return;
    }

    // Retrieve the parameters values based on the sliders
    const black = parseInt(blackSlider.value, 10);
    const white = parseInt(whiteSlider.value, 10);
    const middle = parseFloat(middleSlider.value);
    const colorMode = grayscaleState.dataset.activeOption;

    // Start with the original source matrix
    console.log('Copying the matrix...');
    workingMat = new cv.Mat(workingSrc.rows, workingSrc.cols, workingSrc.type()); // Initialize workingMat with the same size and type
    workingDst = new cv.Mat(workingSrc.rows, workingSrc.cols, workingSrc.type()); // Initialize workingDst with the same size and type
    workingSrc.copyTo(workingMat); // Copy the original src matrix
    workingSrc.copyTo(workingDst); // Ensure destination matches dimensions of src as well

    // If grayscale is enabled, convert the source to grayscale
    console.log('Applying the grayscale...');
    let graySrc = null;
    if (colorMode === 'grayscale') {
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
    console.log('Applying the LUT...');
    for (let i = 0; i < workingMat.data.length; i++) {
        workingDst.data[i] = lut[workingMat.data[i]];
    }

    // Update the canvas
    console.log('Updateing the canvas...');
    cv.imshow(workingCanvas, workingDst);

    // Save the parameters back for later
    console.log('Saving the levels...');
    tempEntry.imageParameters.filter.black = black;
    tempEntry.imageParameters.filter.middle = middle;
    tempEntry.imageParameters.filter.white = white;
    tempEntry.imageParameters.filter.colorMode = colorMode;

    console.log('Levels applied on working canvas.');
    // consoleLogCanvas(workingCanvas);
    updateImage();
}

*/