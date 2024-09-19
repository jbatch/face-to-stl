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
  try {
    const result = quantizeColors(imageData, numColors, selectedColors, remapColors);
    self.postMessage(result);
  } catch (error) {
    console.error("Error in worker:", error);
    self.postMessage({ error: error.message });
  }
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

  // Perform k-means clustering
  const km = new kMeans({ K: numColors, initialize: initializeUniqueCentroids });
  km.cluster(pixels);
  while (km.step()) {
    km.findClosestCentroids();
    km.moveCentroids();
    if(km.hasConverged()) break;
  }

  const centroids = km.centroids;
  console.log("K-means centroids:", centroids.map(rgbToHex));

  // Generate new image data based on k-means centroids
  const kmeansImageData = new Uint8ClampedArray(imageData.data.length);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const pixel = [imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]];
    const closestCentroidIndex = findClosestCentroidIndex(pixel, centroids);
    const centroidColor = centroids[closestCentroidIndex];
    kmeansImageData[i] = centroidColor[0];
    kmeansImageData[i + 1] = centroidColor[1];
    kmeansImageData[i + 2] = centroidColor[2];
    kmeansImageData[i + 3] = 255;
  }

  let finalImageData = kmeansImageData;
  let paletteToUse = centroids;
  let debugColorMapping = null;

  // If remapColors is true, map the centroids to the selected colors
  if (remapColors) {
    const selectedColorsRGB = selectedColors.map(color => {
      if (Array.isArray(color)) return color;
      return typeof color === 'string' ? hexToRgb(color) : null;
    }).filter(color => color !== null);

    if (selectedColorsRGB.length === 0) {
      console.warn("No valid colors in the selected palette. Using k-means centroids.");
    } else {
      const mappingResult = mapCentroidsToSelectedColors(centroids, selectedColorsRGB);
      paletteToUse = selectedColorsRGB;
      debugColorMapping = mappingResult.debugMapping;

      // Generate final image data based on mapped colors
      finalImageData = new Uint8ClampedArray(imageData.data.length);
      for (let i = 0; i < kmeansImageData.length; i += 4) {
        const kmeansColor = [kmeansImageData[i], kmeansImageData[i + 1], kmeansImageData[i + 2]];
        const mappedColor = mappingResult.colorMap.get(rgbToHex(kmeansColor)) || kmeansColor;
        finalImageData[i] = mappedColor[0];
        finalImageData[i + 1] = mappedColor[1];
        finalImageData[i + 2] = mappedColor[2];
        finalImageData[i + 3] = 255;
      }
    }
  }

  console.log("Palette to use:", paletteToUse.map(rgbToHex));
  console.log("Debug Color Mapping:", debugColorMapping);

  const result = {
    quantizedImageData: {
      data: finalImageData,
      width: imageData.width,
      height: imageData.height
    },
    colorPalette: paletteToUse.map(rgbToHex),
    debugColorMapping: debugColorMapping
  };

  console.log("Worker processing complete. Result:", {
    quantizedImageDataSize: `${result.quantizedImageData.width}x${result.quantizedImageData.height}`,
    colorPalette: result.colorPalette,
    debugColorMapping: result.debugColorMapping
  });

  return result;
}

function initializeUniqueCentroids(X, K, m, n) {
    const uniqueColors = new Set();
    const centroids = [];
  
    while (uniqueColors.size < K) {
      const randomIndex = Math.floor(Math.random() * m);
      const color = X[randomIndex];
      const colorKey = color.join(','); // Convert color array to string for Set
  
      if (!uniqueColors.has(colorKey)) {
        uniqueColors.add(colorKey);
        centroids.push(color);
      }
    }
  
    return centroids;
  }

function mapCentroidsToSelectedColors(centroids, selectedColorsRGB) {
  const sortedCentroids = centroids.map(c => ({ color: c, luminance: getLuminance(c) }))
    .sort((a, b) => a.luminance - b.luminance);
  
  const sortedSelectedColors = selectedColorsRGB.map(c => ({ color: c, luminance: getLuminance(c) }))
    .sort((a, b) => a.luminance - b.luminance);

  const mappedCentroids = sortedCentroids.map((centroid, index) => {
    const selectedColorIndex = Math.floor(index * (sortedSelectedColors.length - 1) / (sortedCentroids.length - 1));
    return sortedSelectedColors[selectedColorIndex].color;
  });

  const colorMap = new Map(sortedCentroids.map((c, i) => [rgbToHex(c.color), mappedCentroids[i]]));

  const debugMapping = sortedCentroids.map((c, i) => ({
    from: rgbToHex(c.color),
    to: rgbToHex(mappedCentroids[i])
  }));

  return { colorMap, debugMapping };
}

function getLuminance(rgb) {
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}

function findClosestCentroidIndex(pixel, centroids) {
  return centroids.reduce((closest, centroid, index) => {
    const distance = euclideanDistance(pixel, centroid);
    return distance < closest.distance ? { distance, index } : closest;
  }, { distance: Infinity, index: -1 }).index;
}



function euclideanDistance(a, b) {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) +
    Math.pow(a[1] - b[1], 2) +
    Math.pow(a[2] - b[2], 2)
  );
}

function rgbToHex(rgb) {
  return "#" + rgb.map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}

