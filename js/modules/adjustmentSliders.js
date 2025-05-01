import { tempEntry } from "./db.js";
import { applyLevelsWithOpenCV } from './overlayParameter.js'


// - - - - - - - - - - - - - - -
//       ADJUSTMENT SLIDER
// - - - - - - - - - - - - - - -

// COLOR SPACE INPUT
const colorStateToogle = document.getElementById('js-grayscale');

// LEVEL GROUPS
const multiColorGroup = document.getElementById('multi-color-sliders');
const monoColorGroup = document.getElementById('mono-color-sliders');

// LEVEL INPUTS
const blackInput = document.getElementById('black-level');
const middleInput = document.getElementById('middle-level');
const whiteInput = document.getElementById('white-level');
const blackAndWhiteInput = document.getElementById('black-and-white-level');

// LEVEL SLIDERS
const blackSlider = document.querySelector(".slider-handle[data-input-id='black-level']");
const middleSlider = document.querySelector(".slider-handle[data-input-id='middle-level']");
const whiteSlider = document.querySelector(".slider-handle[data-input-id='white-level']");
const blackAndWhiteSlider = document.querySelector(".slider-handle[data-input-id='black-and-white-level']");

// CONTAINER (WIDTH)
const slidersContainer = document.getElementById('sliders-container');



// ========
//  EXPORT
// ========

// Set visually the sliders to the intended value
// Only once when the parameter is ready
export function positionSliders() {
    console.log('> positionSliders()');
    console.log('Setting slider values...', tempEntry.imageParameters.filter);

    // Change the input values
    blackInput.value = tempEntry.imageParameters.filter.black;
    middleInput.value = tempEntry.imageParameters.filter.middle;
    whiteInput.value = tempEntry.imageParameters.filter.white;
    blackAndWhiteInput.value = tempEntry.imageParameters.filter.blackAndWhite;

    // Set the toggle state
    setToggleState(colorStateToogle, tempEntry.imageParameters.filter.colorMode);

    // Show / hide the group based on tempEntry.imageParameters.filter.colorMode
    // Position the corresponding slider-handle
    switch( tempEntry.imageParameters.filter.colorMode ) {
        case 'color':
        case 'grayscale':
            multiColorGroup.style.display = 'block';
            monoColorGroup.style.display = 'none';
            syncSliderToInput(blackSlider, blackInput);
            syncSliderToInput(middleSlider, middleInput);
            syncSliderToInput(whiteSlider, whiteInput);
            break;
        case 'black-white':
            multiColorGroup.style.display = 'none';
            monoColorGroup.style.display = 'block';
            syncSliderToInput(blackAndWhiteSlider, blackAndWhiteInput);
            break;
    }
}



// =========
//  CHANGES
// =========

blackInput.addEventListener('input', changeLevels);
middleInput.addEventListener('input', changeLevels);
whiteInput.addEventListener('input', changeLevels);
blackAndWhiteInput.addEventListener('input', changeLevels);
colorStateToogle.addEventListener('click', toogleChanged);

// Function to trigger a level change of the image
function changeLevels() {
    console.log('> changeLevels()');
    tempEntry.changeOccured = true;

    // Save parameters for later
    console.log('Saving parameters...');
    tempEntry.imageParameters.filter.black = blackInput.value;
    tempEntry.imageParameters.filter.middle = middleInput.value;
    tempEntry.imageParameters.filter.white = whiteInput.value;
    tempEntry.imageParameters.filter.blackAndWhite = blackAndWhiteInput.value;
    tempEntry.imageParameters.filter.colorMode = colorStateToogle.dataset.activeOption;

    // Apply the levels
    applyLevelsWithOpenCV();
}

// Function to trigger also
function toogleChanged() {
    // Trigger a change on the image
    changeLevels();

    // Update UI
    positionSliders();
}



// ==============
// INITIALISATION
// ==============

// Initialize event listeners for sliders
function initializeSliders() {
    const sliders = document.querySelectorAll(".slider-handle");
    sliders.forEach((slider) => {
        let isDragging = false;
        let startX = 0;
        let sliderLeft = 0;

        // Get the linked input
        const inputId = slider.getAttribute("data-input-id");
        const input = document.getElementById(inputId);

        // Function to start dragging
        const startDrag = (e) => {
            // Prevent scrolling when touch starts
            if (e.touches) e.preventDefault();

            isDragging = true;
            startX = e.touches ? e.touches[0].clientX : e.clientX; // Handle mouse or touch
            sliderLeft = parseInt(window.getComputedStyle(slider).left, 10) || 0;
        };

        // Function to handle dragging
        const drag = (e) => {
            if (!isDragging) return;

            // Prevent scrolling when touch starts
            if (e.touches) e.preventDefault();

            const containerWidth = slidersContainer.offsetWidth + 19;

            const currentX = e.touches ? e.touches[0].clientX : e.clientX; // Handle mouse or touch
            const dx = currentX - startX; // Distance moved
            const maxLeft = containerWidth - slider.offsetWidth;
            const newLeft = Math.min(Math.max(sliderLeft + dx, 0), maxLeft);

            // Change position 
            slider.style.left = `${newLeft}px`;
            
            // Sync input value
            syncInputToSlider(slider, input);
            
            // Apply constraints
            constraintSlider(slider);
        };

        // Function to stop dragging
        const stopDrag = () => {
            isDragging = false;
        };

        // Event listeners for mouse
        slider.addEventListener("mousedown", startDrag);
        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", stopDrag);

        // Event listeners for touch
        slider.addEventListener("touchstart", startDrag, { passive: false }); // Passive false to allow preventDefault
        document.addEventListener("touchmove", drag, { passive: false }); // Passive false to allow preventDefault
        document.addEventListener("touchend", stopDrag);

        // Update slider position when input value changes
        // input.addEventListener("input", syncSliderToInput);
    });
}
initializeSliders();



// ===============
// SYNCHRONISATION
// ===============

function syncSliderToInput(slider, input) {
    const containerWidth = slidersContainer.offsetWidth + 19;
    const sliderWidth = slider.offsetWidth;
    const max = parseFloat(input.max);
    const min = parseFloat(input.min);
    const value = parseFloat(input.value);

    // Calculate position based on input value
    const newLeft = ((value - min) / (max - min)) * (containerWidth - sliderWidth);
    slider.style.left = `${newLeft}px`;
}

function syncInputToSlider(slider, input) {
    const containerWidth = slidersContainer.offsetWidth + 19;
    const sliderWidth = slider.offsetWidth;
    const max = parseFloat(input.max);
    const min = parseFloat(input.min);

    // Calculate value based on slider position
    const newValue = min + (parseFloat(slider.style.left) / (containerWidth - sliderWidth)) * (max - min);
    input.value = newValue;
    input.dispatchEvent(new Event("input")); // Trigger event
}


// ===========
// CONSTRAINTS
// ===========

function constraintSlider(sliderInput) {

    const blackValue = parseFloat(blackInput.value);
    const whiteValue = parseFloat(whiteInput.value);

    switch(sliderInput) {
        // Ensure black-level cannot exceed white-level
        case blackSlider:
            if (blackValue >= whiteValue) {
                blackInput.value = whiteValue;
                syncSliderToInput(blackSlider, blackInput);
            }
            break;
        // Ensure white-level cannot go below black-level
        case whiteSlider:
            if (whiteValue <= blackValue) {
                whiteInput.value = blackValue;
                syncSliderToInput(whiteSlider, whiteInput);
            }
            break
    }

    // Constrain middle-level between low and high
    updateMiddleLevel();
}

// Update middle level's value and position dynamically
function updateMiddleLevel() {
    const blackValue = parseFloat(blackInput.value) + 15;
    const whiteValue = parseFloat(whiteInput.value) - 15;

    const containerWidth = slidersContainer.offsetWidth + 19;
    const sliderWidth = middleSlider.offsetWidth;

    // Calculate the current middle value
    const middleValue = parseFloat(middleInput.value);

    // Remap middle-slider's visual position between new black and white
    const minLeft = (blackValue / 255) * (containerWidth - sliderWidth);
    const maxLeft = (whiteValue / 255) * (containerWidth - sliderWidth);

    const newLeft =
        ((middleValue - parseFloat(middleInput.min)) / (parseFloat(middleInput.max) - parseFloat(middleInput.min))) *
        (maxLeft - minLeft) +
        minLeft;

    middleSlider.style.left = `${newLeft}px`;

    // Dispatch event to signal that the middle input value might have updated
    middleInput.dispatchEvent(new Event("input"));
}