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
