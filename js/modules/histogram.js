// - - - - - - - - - - - - - - -
//          HISTOGRAM
// - - - - - - - - - - - - - - -

// Ref: https://docs.opencv.org/4.x/d7/d32/tutorial_js_histogram_begins.html

export function drawHistogram(inputMat) {
    console.log('> drawHistogram()');
    makeHistogram(inputMat);
}

let histogramArray = []

// Function to extract and log histogram values
async function makeHistogram(inputMat) {
    console.log('> makeHistogram()');

    // let src = inputMat;

    // Verify the input is a valid cv.Mat
    if (!(inputMat instanceof cv.Mat)) {
        console.error('Error: Input is not a valid cv.Mat.');
        return;
    }

    if (inputMat.empty()) {
        console.error('Error: Input matrix is empty.');
        return;
    }

    // Convert the input matrix to grayscale
    const src = new cv.Mat();
    try {
        cv.cvtColor(inputMat, src, cv.COLOR_RGBA2GRAY);
        // cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
        console.log('Grayscale conversion successful.');
    } catch (error) {
        console.error('Error during grayscale conversion:', error);
        // grayMat.delete();
        return;
    }

    // Wrap the grayscale image in a MatVector
    const srcVec = new cv.MatVector();
    srcVec.push_back(src);

    // Define histogram parameters
    const channels = [0]; // Grayscale image has one channel
    const histSize = [256]; // Number of bins
    const ranges = [0, 256]; // Pixel intensity range
    const accumulate = false;

    // Create a Mat to store the histogram / mask
    let hist = new cv.Mat();
    let mask = new cv.Mat();

    // Calculate the histogram
    try {
        cv.calcHist(srcVec, channels, mask, hist, histSize, ranges, accumulate);
        console.log('Histogram calculation successful.');
    } catch (error) {
        console.error('Error during histogram calculation:', error);
        // grayMat.delete();
        // grayMat.delete();
        srcVec.delete();
        hist.delete();
        return;
    }

    // Treat results
    let scale = 2;
    let result = cv.minMaxLoc(hist, mask);
    let max = result.maxVal;
    let dst = new cv.Mat(src.rows, histSize[0] * scale, cv.CV_8UC3); // Initialize an empty matrix

    // Sets colors
    let foregroundColor = new cv.Scalar(255*0.6, 255*0.6, 255*0.6);
    let backgroundColor = new cv.Scalar(255*0.95, 255*0.95, 255*0.95);
    dst.setTo(backgroundColor);

    // Draw histogram
    for (let i = 0; i < histSize[0]; i++) {
        let binVal = hist.data32F[i] * src.rows / max;
        let point1 = new cv.Point(i * scale, src.rows - 1);
        let point2 = new cv.Point((i + 1) * scale - 1, src.rows - binVal);
        cv.rectangle(dst, point1, point2, foregroundColor, cv.FILLED);
    }
    // cv.imshow('canvasOutput', dst);
    cv.imshow('histogram-canvas', dst);
    console.log('Histogram drawn.');

    // Release memory
    src.delete(); dst.delete(); srcVec.delete(); mask.delete(); hist.delete();

    return

    // Convert histogram data to an array for logging
    histogramArray = Array.from(hist.data32F);
    console.log('Histogram Data:', histogramArray);

    // Clean up
    grayMat.delete();
    srcVec.delete();
    hist.delete();

    // Trigger the draw
    drawHistogramCanvas();
    // return histogramArray; // Return the array for later use
}

// Function to draw the histogram on the targetted canvas
function drawHistogramCanvas() {
    console.log('drawHistogramCanvas()');

    // Set up the canvas
    const canvas = document.getElementById('histogram-canvas')
    const ctx = canvas.getContext('2d');

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const barWidth = width / histogramArray.length;

    canvas.width = width;
    canvas.height = height;

    // Custom logarithmic function
    function logBase(value, base) {
        return Math.log(value + 1) / Math.log(base); // Add 1 to avoid log(0)
    }

    // Apply logarithmic scaling to histogramArray
    const customBase = 2;
    const transformedHistogram = histogramArray.map(value => logBase(value+1, customBase)); // Add 1 to avoid log(0)
    console.log('transformedHistogram Data:', transformedHistogram);

    // Find the maximum value in the histogram for scaling
    // const maxVal = Math.max(...histogramArray);
    const maxVal = Math.max(...transformedHistogram);

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the histogram bars
    ctx.fillStyle = 'black';
    for (let i = 0; i < histogramArray.length; i++) {
        // const barHeight = (histogramArray[i] / maxVal) * height;
        const barHeight = (transformedHistogram[i] / maxVal) * height;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    }

    console.log('Histogram drawn.');
}