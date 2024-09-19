/* eslint-disable no-restricted-globals */
import kMeans from 'kmeans-js';

self.onmessage = function(e) {
  const { imageData, numColors, selectedColors, remapColors } = e.data;
  console.log("Worker received data:", {
    imageDataSize: `${imageData.width}x${imageData.height}`,
    numColors,
    selectedColors,
    remapColors
  });
  const result = quantizeColors(imageData, numColors, selectedColors, remapColors);
  self.postMessage(result);
};

function quantizeColors(imageData, numColors, selectedColors, remapColors) {
  const pixels = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    pixels.push([
      imageData.data[i],
      imageData.data[i + 1],
      imageData.data[i + 2]
    ]);
  }

  let centroids;
  if (remapColors) {
    // Use the selectedColors as centroids
    centroids = selectedColors;
  } else {
    // Use k-means to find the centroids
    const km = new kMeans({
      K: numColors
    });

    km.cluster(pixels);
    while (km.step()) {
      km.findClosestCentroids();
      km.moveCentroids();

      if(km.hasConverged()) break;
    }

    centroids = km.centroids;
  }

  console.log("Centroids:", centroids);

  const newImageData = new Uint8ClampedArray(imageData.data.length);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const pixel = [
      imageData.data[i],
      imageData.data[i + 1],
      imageData.data[i + 2]
    ];
    const closestCentroidIndex = findClosestCentroidIndex(pixel, centroids);
    const paletteColor = centroids[closestCentroidIndex];

    newImageData[i] = paletteColor[0];
    newImageData[i + 1] = paletteColor[1];
    newImageData[i + 2] = paletteColor[2];
    newImageData[i + 3] = 255;
  }

  const result = {
    quantizedImageData: {
      data: newImageData,
      width: imageData.width,
      height: imageData.height
    },
    colorPalette: centroids.map(rgbToHex)
  };

  console.log("Worker processing complete. Result:", {
    quantizedImageDataSize: `${result.quantizedImageData.width}x${result.quantizedImageData.height}`,
    colorPalette: result.colorPalette
  });

  return result;
}

function findClosestCentroidIndex(pixel, centroids) {
  let minDistance = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < centroids.length; i++) {
    const distance = euclideanDistance(pixel, centroids[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }

  return closestIndex;
}

function euclideanDistance(a, b) {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) +
    Math.pow(a[1] - b[1], 2) +
    Math.pow(a[2] - b[2], 2)
  );
}

function rgbToHex(rgb) {
  return "#" + ((1 << 24) + (Math.round(rgb[0]) << 16) + (Math.round(rgb[1]) << 8) + Math.round(rgb[2])).toString(16).slice(1).padStart(6, '0');
}