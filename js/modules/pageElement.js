// IMPORT
import { dbElemById, loadTempEntry } from './db.js'
import { loadParameterOverlay } from './overlayParameter.js'
import { disableDownloadSection } from './generatePDF.js'

// HTML
const pageContainer = document.getElementById('js-page-container');
const pageTemplate = document.getElementById('js-page-template');

// - - - - - - - - - - - - - - -

// Desktop drag event handlers
// Variables to track the dragged element and its copy
let draggedElement = null;
let draggedCopy = null;
let isDragging = false;



export function updatePageElement(id) {
    console.log('> updatePageElement()', id);

    // Retrieve the db item
    const dbItem = dbElemById(id);

    // Get the page element
    let page = pageContainer.querySelector(`[data-id="${id}"]`);
    if (!page) {
        console.log('New page element');
        // Create a new page element
        page = createPageElement(dbItem);
        pageContainer.appendChild(page);
    }
    else {
        console.log('Existing page element');
        // Update child content
        const img = page.querySelector('.page-preview');
        img.src = dbItem.imagePagePreview.source;
        // pageContainer.replaceChild(newPage, page); // Update existing element
    }
}

export function removePageElement(id) {
    console.log('> removePageElement()', id);

    // Get the page element
    const page = pageContainer.querySelector(`[data-id="${id}"]`);
    if (page) {
        page.remove();
    }
    else {
        console.log('No page element to remove', id);
    }
}

// Helper function to create a new page element
function createPageElement(dataEntry) {
    const { id, pageIndex, imagePagePreview } = dataEntry;

    const newPage = pageTemplate.cloneNode(true);
    newPage.style.display = 'block';
    newPage.setAttribute('data-id', id);
    newPage.style.order = pageIndex;
    newPage.classList.add('draggable');
    newPage.draggable = true;

    // Update child content
    const img = newPage.querySelector('.page-preview');
    img.src = imagePagePreview.source || 'https://via.placeholder.com/100';

    const indexLabel = newPage.querySelector('.page-index');
    indexLabel.textContent = `${pageIndex + 1}`;

    // Set up drag-and-drop event listeners
    newPage.addEventListener('dragstart', handleDragStart);
    newPage.addEventListener('dragmove', handleDragMove);
    newPage.addEventListener('dragend', handleDragEnd);
    newPage.addEventListener('click', () => {
        console.log('CLICK', id);
        showParameters(id);
    });

    // Add touch event listeners (mobile)
    newPage.addEventListener('touchstart', handleTouchStart, { passive: false });
    newPage.addEventListener('touchmove', handleTouchMove, { passive: false });
    newPage.addEventListener('touchend', handleTouchEnd, { passive: false });

    return newPage;
}

// Desktop drag event handlers
function handleDragStart(e) {
    e.preventDefault();
    draggedElement = e.target.closest('.draggable');
    if (!draggedElement) return;
    isDragging = false;

    // Create a copy for dragging
    draggedCopy = draggedElement.cloneNode(true);
    draggedCopy.style.position = 'absolute';
    draggedCopy.style.zIndex = '1000';
    draggedCopy.style.opacity = '0.5';
    draggedCopy.style.pointerEvents = 'none'; // Ensure the copy doesn't interfere
    document.body.appendChild(draggedCopy);

    // Set initial position of the dragged copy
    draggedCopy.style.left = `${e.clientX}px`;
    draggedCopy.style.top = `${e.clientY}px`;
    document.addEventListener('mousemove', handleDragMove);
}

function handleDragMove(e) {
    if (!draggedCopy) return;

    // Move the dragged copy
    draggedCopy.style.left = `${e.clientX}px`;
    draggedCopy.style.top = `${e.clientY}px`;

    // Detect target under the cursor
    const targetElement = document.elementFromPoint(e.clientX, e.clientY)?.closest('.draggable');

    // If we have a target, not the original one, we put it in sight
    if (targetElement && !isDragging && targetElement !== draggedElement) {
        isDragging = true;
    }

    // If we have a new target below and we are dragging
    if (targetElement && isDragging && targetElement !== draggedElement) {
        // Get the indexes
        const targetIndex = parseInt(targetElement.style.order, 10);
        const originalIndex = parseInt(draggedElement.style.order, 10);
        // Flip the indexes
        targetElement.style.order = originalIndex;
        draggedElement.style.order = targetIndex;
    }
}

function handleDragEnd(e) {
    if (!draggedElement) return;

    // If we stayed static, treat as a click
    if (!isDragging) {
        const id = draggedElement.getAttribute('data-id');
        cleanDragState();
        showParameters(id);
    }

    // If we moved, update the indexes
    if (isDragging) {
        cleanDragState();
        updateIndexes();
    }
}


// Mobile touch events
function handleTouchStart(e) {
    e.preventDefault();
    draggedElement = e.target.closest('.draggable');
    if (!draggedElement) return;
    isDragging = false;

    // Create a copy for dragging
    draggedCopy = draggedElement.cloneNode(true);
    draggedCopy.style.position = 'absolute';
    draggedCopy.style.zIndex = '1000';
    draggedCopy.style.opacity = '0.5';

    positionDraggedCopy(e);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!draggedCopy) return;

    // Position element
    positionDraggedCopy(e);

    // Detect target under the touch point
    // Temporarily hide the dragged copy to detect the element underneath
    draggedCopy.style.visibility = 'hidden';
    const touch = e.touches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.draggable');
    draggedCopy.style.visibility = 'visible';

    // If we have a target, not the original one, we put it in sight
    if (targetElement && !isDragging && targetElement !== draggedElement) {
        isDragging = true;
        document.body.appendChild(draggedCopy); // Show the copy
    }
    // If we have a new target bellow and we are dragging
    else if (targetElement && isDragging && targetElement !== draggedElement) {
        // Get the indexes
        const targetOrder = parseInt(targetElement.style.order);
        const draggedOrder = parseInt(draggedElement.style.order);
        // Flip the indexes
        targetElement.style.order = draggedOrder;
        draggedElement.style.order = targetOrder;
    }
    // If we have the original target bellow and we are dragging
    else if (targetElement && isDragging && targetElement == draggedElement) {
        // We are okay
    }
}

function handleTouchEnd(e) {
    e.preventDefault();

    // If we stayed static, we click
    if (!isDragging) {
        // Treat as a click
        const id = draggedElement.getAttribute('data-id');
        cleanDragState(); // Clean everything
        showParameters(id);
    }

    // If we moved we update the indexes
    if (isDragging) {
        cleanDragState();
        updateIndexes();
    }
}

// Function to clean the draged elements
function cleanDragState() {
    if (draggedCopy) {
        draggedCopy.remove();
        draggedCopy = null;
    }

    if (draggedElement) {
        draggedElement = null;
    }

    isDragging = false;
}

// Function to update indexes and DB after reordering
function updateIndexes() {
    console.log('updateIndexes()');
    // (optional) Disable download section
    disableDownloadSection();

    // Update all the indexes 
    const children = pageContainer.querySelectorAll('.draggable');
    children.forEach((child) => {
        const targetId = child.getAttribute('data-id');
        const newIndex = parseInt(child.style.order, 10);

        // Change the html label
        const indexLabel = child.querySelector('.page-index');
        indexLabel.textContent = `${newIndex + 1}`;

        // Update DB
        const dbItem = dbElemById(targetId);
        if (dbItem) dbItem.pageIndex = newIndex;
        else {
            console.log('no element with id', targetId);
        }
    });
}

function positionDraggedCopy(e) {
    if(!draggedCopy) return

    const touch = e.touches[0];
    const rect = draggedCopy.getBoundingClientRect();
    const offsetX = rect.width / 2;
    const offsetY = rect.height / 2;

    draggedCopy.style.left = `${touch.clientX - offsetX}px`;
    draggedCopy.style.top = `${touch.clientY - offsetY}px`;
}

function showParameters(id) {
    console.log('> showParameters()', id);

    // Load the targeted db item
    loadTempEntry(id);

    // 
    loadParameterOverlay();
}

// EXEMPLES
// pageContainer.appendChild(createPageElement(0, 'abc', 'https://via.placeholder.com/100'));
// pageContainer.appendChild(createPageElement(1, 'def', 'https://via.placeholder.com/100/0000FF'));
// pageContainer.appendChild(createPageElement(2, 'ghi', 'https://via.placeholder.com/100/00FF00'));
// pageContainer.appendChild(createPageElement(3, 'abc', 'https://via.placeholder.com/100'));
// pageContainer.appendChild(createPageElement(4, 'def', 'https://via.placeholder.com/100/0000FF'));
// pageContainer.appendChild(createPageElement(5, 'ghi', 'https://via.placeholder.com/100/FF0000'));