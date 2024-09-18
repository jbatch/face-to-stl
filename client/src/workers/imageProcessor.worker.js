/* eslint-disable no-restricted-globals */
import kMeans from 'kmeans-js';

self.onmessage = function(e) {
  const { imageData, numColors, selectedColors, remapColors } = e.data;
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

  const km = new kMeans({
    K: numColors
  });

  km.cluster(pixels);
  while (km.step()) {
    km.findClosestCentroids();
    km.moveCentroids();

    if(km.hasConverged()) break;
  }

  const centroids = km.centroids;

  let palette;
  if (remapColors) {
    palette = selectedColors.map(color => hexToRgb(color));
  } else {
    palette = centroids;
  }

  const newImageData = new ImageData(imageData.width, imageData.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const pixel = [
      imageData.data[i],
      imageData.data[i + 1],
      imageData.data[i + 2]
    ];
    const closestCentroidIndex = findClosestCentroidIndex(pixel, centroids);
    const paletteColor = palette[closestCentroidIndex];

    newImageData.data[i] = paletteColor[0];
    newImageData.data[i + 1] = paletteColor[1];
    newImageData.data[i + 2] = paletteColor[2];
    newImageData.data[i + 3] = 255;
  }

  return {
    quantizedImageData: newImageData,
    colorPalette: palette.map(rgbToHex)
  };
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

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

function rgbToHex(rgb) {
  return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
}