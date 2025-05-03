// IMPORTS
import { tempEntry, loadTempEntry, saveTempEntry, deleteTempEntry } from './db.js'
import { showLoadingOverlay, hideLoadingOverlay, loadingLog } from './overlayLoading.js';
import { updatePageElement, removePageElement } from './pageElement.js';
import { scanner } from '../utils/externalLib.js';
import { consoleLogCanvas } from '../utils/helper.js';
import { drawHistogram } from './histogram.js';
import { positionSliders } from './adjustmentSliders.js'
import { projectSettings } from './db.js';


// - - - - - - - - - - - - - - -

// VARIABLES
const IS_TEST = false; // To show by default the UI, for testing

const MARKER_SIZE = 20; // defined in the css
const MARKER_OFFSET_DESKTOP = { x: 0, y: 0 }; 
const MARKER_OFFSET_MOBILE = { x: -50, y: -50 }; // Finger offset

const MAGNIFIER_SIZE = 100; // defined in the css
const MAGNIFIER_ZOOM = 2;
const MAGNIFIER_OFFSET_DESKTOP = { x: -MAGNIFIER_SIZE, y: -MAGNIFIER_SIZE }; 
const MAGNIFIER_OFFSET_MOBILE = { x: -MAGNIFIER_SIZE/2, y: -MAGNIFIER_SIZE/2 };


// - - - - - - - - - - - - - - -

// HTML DOM ELEMENTS
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

// MAGNIFIER OPTION
const magnifierIsChecked = parameterOverlay.querySelector('.js-show-magnifier');

// BACKGROUND
const background = parameterOverlay.querySelector('.js-parameters-background');
background.addEventListener('click', parametersCancel);



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

if(IS_TEST) showParameterOverlay();

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
// At start and when rotation happen
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
// Wait for OpenCV.js to initialize
// console.log(cv.getBuildInformation());
if (typeof cv.imshow === 'function') {
    console.warn('> Targetted function IS available in this build.');
} else {
    console.warn('> Targetted function IS NOT available in this build.');
}

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
        let a = srcData[i + 3];
    
        let gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    
        if (colorMode === 'black-white') {
            const threshold = tempEntry.imageParameters.filter.blackAndWhite || 127;
            const bw = gray > threshold ? 255 : 0;
            dstData[i] = dstData[i + 1] = dstData[i + 2] = bw;
            dstData[i + 3] = a;
        } else if (colorMode === 'grayscale') {
            const value = lut[gray];
            dstData[i] = dstData[i + 1] = dstData[i + 2] = value;
            dstData[i + 3] = a;
        } else {
            // color mode — apply LUT separately to each channel
            dstData[i] = lut[r];
            dstData[i + 1] = lut[g];
            dstData[i + 2] = lut[b];
            dstData[i + 3] = a;
        }
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
    let c = tempEntry.imageOriginal.size;
    let d = tempEntry.cornerPoints;
    // console.log('imageOriginal size', tempEntry.imageOriginal.size);
    // console.log('imagePreview size', tempEntry.imagePreview.size);

    // console.log(cornersElem);
    let temp_left = `${- MARKER_SIZE / 2 + b.left + (b.width * d.topLeftCorner.x / c.width)}px`;
    let temp_top = `${- MARKER_SIZE / 2 + b.top + (b.height * d.topLeftCorner.y / c.height)}px`;
    // console.log(MARKER_SIZE, b.left, b.width, d.topLeftCorner.x, c.width);
    // console.log(MARKER_SIZE, b.top, b.height, d.topLeftCorner.y, c.height);
    // console.log('d.topLeftCorner', d.topLeftCorner);
    // console.log('new top', temp_top, '- left', temp_left);

    cornersElem.topLeftCorner.style.left = temp_left;
    cornersElem.topLeftCorner.style.top = temp_top;

    cornersElem.topRightCorner.style.left = `${- MARKER_SIZE / 2 + b.left + (b.width * d.topRightCorner.x / c.width)}px`;
    cornersElem.topRightCorner.style.top = `${- MARKER_SIZE / 2 + b.top + (b.height * d.topRightCorner.y / c.height)}px`;

    cornersElem.bottomRightCorner.style.left = `${- MARKER_SIZE / 2 + b.left + (b.width * d.bottomRightCorner.x / c.width)}px`;
    cornersElem.bottomRightCorner.style.top = `${- MARKER_SIZE / 2 + b.top + (b.height * d.bottomRightCorner.y / c.height)}px`;

    cornersElem.bottomLeftCorner.style.left = `${- MARKER_SIZE / 2 + b.left + (b.width * d.bottomLeftCorner.x / c.width)}px`;
    cornersElem.bottomLeftCorner.style.top = `${- MARKER_SIZE / 2 + b.top + (b.height * d.bottomLeftCorner.y / c.height)}px`;

    // Update the edges
    updateEdges();
}

// Update edges of the polygon
function updateEdges() {

    // Deduce the points from the markers
    const points = Object.values(cornersElem)
        .map(marker => {
            const left = parseFloat(marker.style.left) + MARKER_SIZE / 2;
            const top = parseFloat(marker.style.top) + MARKER_SIZE / 2;
            return `${left},${top}`;
        })
        .join(' ');

    // Update the polygon
    highlightEdge.setAttribute('points', points);
}

// Function to make markers draggable
// Only once
function makeMarkersDraggable(marker, cornerKey) {

    // MAGNIFIER DOM
    const magnifier = document.getElementById('magnifier');
    const magnifierCanvas = document.getElementById('magnifier-canvas');
    const magnifierCtx = magnifierCanvas.getContext('2d');


    const moveMarkerAt = (inputX, inputY, inputMarkerOffset, inputMagnifierOffset) => {
        console.log('> moveMarkerAt()');

        // Grab the data
        // let a = tempEntry;
        let b = tempEntry.imagePreview.position;
        let c = tempEntry.imageOriginal.size;

        const x = inputX + inputMarkerOffset.x;
        const y = inputY + inputMarkerOffset.y;

        // Shift pointer to local image space
        const localX = x - b.containerLeft - b.left;
        const localY = y - b.containerTop - b.top;

        // Clamp inside image dimensions
        const clampedX = Math.max(0, Math.min(localX, b.width));
        const clampedY = Math.max(0, Math.min(localY, b.height));

        // Set marker position (relative to container)
        marker.style.left = `${b.left + clampedX - MARKER_SIZE / 2}px`;
        marker.style.top  = `${b.top + clampedY - MARKER_SIZE / 2}px`;

        // Save the corner points
        tempEntry.cornerPoints[cornerKey] = {
            x: (clampedX / b.width) * c.width,
            y: (clampedY / b.height) * c.height,
        };

        // Update the polygon
        updateEdges();

        // Show magnifier above finger
        if(magnifierIsChecked.checked) {
            magnifier.classList.remove('hidden');
            magnifier.style.left = `${b.left + clampedX + inputMagnifierOffset.x}px`;
            magnifier.style.top = `${b.top + clampedY + inputMagnifierOffset.y}px`;
    
            // Zoom in around the drag point
            const sizeOffset = MAGNIFIER_SIZE / 2;
            const localX = workingCanvas.width * (clampedX) / b.width;
            const localY = workingCanvas.height * (clampedY) / b.height;
    
            magnifierCtx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
            magnifierCtx.drawImage(
                workingCanvas,
                localX - sizeOffset / MAGNIFIER_ZOOM, localY - sizeOffset / MAGNIFIER_ZOOM,
                sizeOffset / MAGNIFIER_ZOOM * 2, sizeOffset / MAGNIFIER_ZOOM * 2,
                0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE
            );
            magnifierCtx.strokeStyle = 'rgba(0, 255, 208, 1)';
            magnifierCtx.beginPath();
            magnifierCtx.moveTo(MAGNIFIER_SIZE/2, 0);
            magnifierCtx.lineTo(MAGNIFIER_SIZE/2, MAGNIFIER_SIZE);
            magnifierCtx.moveTo(0, MAGNIFIER_SIZE/2);
            magnifierCtx.lineTo(MAGNIFIER_SIZE, MAGNIFIER_SIZE/2);
            magnifierCtx.stroke();
        }
        
        // Indicate that a change happened
        tempEntry.changeOccured = true;
    };

    // ON DESKTOP
    const onMouseMove = (e) => moveMarkerAt(
        e.clientX, 
        e.clientY, 
        MARKER_OFFSET_DESKTOP, 
        MAGNIFIER_OFFSET_DESKTOP
    );
    // ON MOBILE
    const onTouchMove = (e) => moveMarkerAt(
        e.touches[0].clientX, 
        e.touches[0].clientY, 
        MARKER_OFFSET_MOBILE, 
        MAGNIFIER_OFFSET_MOBILE
    );

    // // MOUSE EVENTS
    // marker.addEventListener('mousedown', (e) => {
    //     e.preventDefault();
    //     document.addEventListener('mousemove', onMouseMove);
    //     document.addEventListener('mouseup', () => {
    //         magnifier.classList.add('hidden');
    //         document.removeEventListener('mousemove', onMouseMove);
    //         // console.log(tempEntrie.cornerPoints);
    //     }, { once: true });
    // });

    // // TOUCH EVENTS
    // marker.addEventListener('touchstart', (e) => {
    //     e.preventDefault();
    //     const touch = e.touches[0];
    //     // Set initial position
    //     moveMarkerAt(
    //         e.touches[0].clientX, 
    //         e.touches[0].clientY, 
    //         MARKER_OFFSET_MOBILE, 
    //         MAGNIFIER_OFFSET_MOBILE
    //     );
    //     document.addEventListener('touchmove', onTouchMove);
    //     document.addEventListener('touchend', () => {
    //         magnifier.classList.add('hidden');
    //         document.removeEventListener('touchmove', onTouchMove);
    //         // console.log(tempEntrie.cornerPoints);
    //     }, { once: true });
    // });

    // TOUCH AND MOVEMENT EVENT V2
    marker.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        marker.setPointerCapture(e.pointerId);

        const offset = e.pointerType === 'touch' ? MARKER_OFFSET_MOBILE : MARKER_OFFSET_DESKTOP;
        const magnifierOffset = e.pointerType === 'touch' ? MAGNIFIER_OFFSET_MOBILE : MAGNIFIER_OFFSET_DESKTOP;

        const onPointerMove = (ev) => {
            moveMarkerAt(ev.clientX, ev.clientY, offset, magnifierOffset);
        };

        const onPointerUp = () => {
            magnifier.classList.add('hidden');
            marker.removeEventListener('pointermove', onPointerMove);
            marker.removeEventListener('pointerup', onPointerUp);
        };

        marker.addEventListener('pointermove', onPointerMove);
        marker.addEventListener('pointerup', onPointerUp);
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

    // Save selected format & compression into the entry
    tempEntry.imageParameters.format.name = projectSettings.format.name;
    tempEntry.imageParameters.format.widthMM = projectSettings.format.widthMM;
    tempEntry.imageParameters.format.heightMM = projectSettings.format.heightMM;
    tempEntry.imageParameters.format.dpi = projectSettings.format.dpi;
    tempEntry.imageParameters.compression = projectSettings.compression;

    // Update the DB
    saveTempEntry();

    // Cleanup
    cleanupVariables();

    // Update the page in the DOM
    updatePageElement(tempEntry.id);

    // UI hide overlay
    hideLoadingOverlay();
}

function parametersCancel() {
    console.log('> parametersCancel()');

    // Cleanup
    cleanupVariables();

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

    // Hide UI
    hideParameterOverlay();
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