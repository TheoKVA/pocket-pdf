
// IMPORTS
import { generateUniqueId, consoleLogCanvas } from '../utils/helper.js';
import { disableDownloadSection } from './generatePDF.js'

// - - - - - - - - - - - - - - -

// Shared database array
export const db = []; 

// Variable to store all the images
const defaultEntry = {
    id: null,
    pageIndex: -1,
    changeOccured: true,
    imageParameters: { 
        format: {
            name: null, // custom / A5 / A4 / A3 -- TO DO
            widthMM: null,
            heightMM: null,
        },
        orientation: 'auto', // auto / vertical / horizontal -- TO DO
        filter: {
            black: 15, // default values
            middle: 0.5, // default values
            white: 240, // default values
            blackAndWhite: 127, // default values
            colorMode: 'color', // auto / color / grayscale / blackAndWhite -- TO DO
        },
    },
    // Full Image with original size
    imageOriginal: {
        source: null,
        size: {
            width: -1,
            height: -1,
        }   
    },
    // Image with scaled size for base preview
    imageScaled: {
        source: null,
        size: {
            width: -1,
            height: -1,
            scaleFactor: -1,
        },
        rotation: 0,
    },
    // Image for preview with applied rotation and filters
    imagePreview : {
        source: null,
        size: {
            width: -1,
            height: -1,
        },
        position: {
            containerTop: -1,
            containerLeft: -1,
            top: -1,
            left: -1,
            width: -1,
            height: -1,
        },
    },
    // Final image for the page
    imagePagePreview: {
        source: null,
    },
    cornerPoints: {},
}

// Variable for storing temp parameters
export let tempEntry = {};

// Variable to store the project settings
export let projectSettings = {
    'format': {
        'name': 'A4',
        'widthMM': 210,
        'heightMM': 297,
        'dpi': 200,
    },
    'compression' : 0.8
}

// - - - - - - - - - - - - - - -


// Return a DB element based on it's ID
export const dbElemById = (id) => {
    return db.find(item => item.id === id);
}

// Return the full DB sorted based on it's pageIndex
export const sortedDB = () => {
    return db.filter(item => item.pageIndex !== undefined && item.pageIndex >= 0) // Exclude invalid or missing pageIndex
             .sort((a, b) => a.pageIndex - b.pageIndex); // Sort by pageIndex
}

// RESET
// Reset the tempEntry object to default value
export function resetTempEntry() {
    tempEntry = JSON.parse(JSON.stringify(defaultEntry));
}

// SAVE
// Save TempEntry to DB
export function saveTempEntry() {
    // (optional) Disable download section
    disableDownloadSection();

    // Check if the tempEntry already exists in the DB
    const index = db.findIndex(dbItem => dbItem.id === tempEntry.id);
    if (index !== -1) {
        // Update the existing entry
        db[index] = tempEntry;
    } else {
        // Set the pageIndex value
        tempEntry.pageIndex = db.length
        // Push the tempEntry to the DB
        db.push(tempEntry);
    }
}

// LOAD
// Load an item from DB to TempEntry
export function loadTempEntry(id) {
    console.log('> loadTempEntry()', id);
    // For new entries
    if(id==-1) {
        console.log('New entry');
        tempEntry = JSON.parse(JSON.stringify(defaultEntry));
        const newId = generateUniqueId();
        tempEntry.id = newId;
        return;
    }
    // Check if the item already exists in the DB
    const index = db.findIndex(dbItem => dbItem.id === id);
    if (index !== -1) {
        tempEntry = JSON.parse(JSON.stringify(db[index]));
        console.log('Loaded tempEntry:', tempEntry);
    } else {
        console.log(`Item with id ${id} not found in DB`);
    }
}

// DELETE
// Remove an element from DB based on id value
export function deleteTempEntry() {
    const id = tempEntry.id;
    const index = db.findIndex(item => item.id === id);
    if (index !== -1) {
        // (optional) Disable download section
        disableDownloadSection();
        
        db.splice(index, 1); // Remove the item from db
        return true;
    }
    return false;
}

export function consoleLogTempEntry() {
    console.log('>> consoleLogTempEntry()');
    console.log(tempEntry);
    if (tempEntry?.imageOriginal) {
        consoleLogCanvas(tempEntry.imageOriginal.source);
        consoleLogCanvas(tempEntry.imageScaled.source);
        consoleLogCanvas(tempEntry.imagePreview.source);
        consoleLogCanvas(tempEntry.imagePagePreview.source);
    }
}