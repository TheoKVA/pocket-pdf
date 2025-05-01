// HTML
const loadingOverlay = document.getElementById('loading-overlay');
const loadingOutput = document.getElementById('loading-output');

// - - - - - - - - - - - - - - -

export function showLoadingOverlay() {
    loadingOverlay.classList.remove('hidden');
    document.body.classList.add('no-scroll');
    loadingLog('Loading...');
}

export function hideLoadingOverlay() {
    loadingOverlay.classList.add('hidden');
    document.body.classList.remove('no-scroll');
}

export function loadingLog(...text) {
    // Construct the full text
    const fullText = text.join(' ');

    // Ensure the span exists for the animation
    let dotsSpan = document.querySelector('.loading-dots');
    if (!dotsSpan) {
        dotsSpan = document.createElement('span');
        dotsSpan.className = 'loading-dots';
        dotsSpan.style.display = 'inline-block';
        dotsSpan.style.width = '1em';
        dotsSpan.style.textAlign = 'left';
        dotsSpan.style.visibility = 'hidden'; // Start hidden
        loadingOutput.appendChild(dotsSpan);

        // Start the animation loop
        let dots = 0;
        setInterval(() => {
            dots = (dots + 1) % 4; // Cycle through 0, 1, 2, 3
            dotsSpan.textContent = '.'.repeat(dots);
        }, 300);
    }

    // Update the main text
    loadingOutput.innerHTML = fullText;

    // Show or hide the dotsSpan based on the ending
    if (fullText.endsWith('...')) {
        dotsSpan.style.visibility = 'visible'; // Show dots
    } else {
        dotsSpan.style.visibility = 'hidden'; // Hide dots
    }
}