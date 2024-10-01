/* eslint-disable no-restricted-globals */
import * as THREE from 'three';

function log(message, data) {
  self.postMessage({ type: 'log', message, data });
}

function reportProgress(percentage) {
  self.postMessage({ type: 'progress', percentage });
}

self.onmessage = function(e) {
  log('Received message in STL generator worker', e.data);
  
  try {
    const { imageData, colorPalette, objectWidth, objectHeight, baseHeight, resolution = 1, scaleZ, simplificationLevel = 0 } = e.data;
    
    log('Starting STL generation', { 
      imageDataSize: `${imageData.width}x${imageData.height}`, 
      colorPaletteSize: colorPalette.length,
      objectDimensions: `${objectWidth}x${objectHeight}`,
      baseHeight,
      resolution,
      scaleZ,
      simplificationLevel
    });

    const startTime = performance.now();
    const stlData = generateSTL(imageData, colorPalette, objectWidth, objectHeight, baseHeight, resolution, scaleZ, simplificationLevel);
    const endTime = performance.now();
    const generationTime = (endTime - startTime) / 1000; // Convert to seconds
    
    const fileSizeInBytes = stlData.byteLength;
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
    
    log('STL generation completed', { 
      stlDataSize: stlData.byteLength,
      generationTime: generationTime.toFixed(2) + ' seconds',
      fileSizeInMB: fileSizeInMB.toFixed(2) + ' MB'
    });
    
    // Send the ArrayBuffer directly along with generation time and file size
    self.postMessage({ 
      type: 'result', 
      data: stlData,
      generationTime: generationTime,
      fileSizeInMB: fileSizeInMB
    }, [stlData]);
  } catch (error) {
    log('Error in STL generation', { error: error.message, stack: error.stack });
    self.postMessage({ type: 'error', message: error.message, stack: error.stack });
  }
};

function generateSTL(imageData, colorPalette, objectWidth, objectHeight, baseHeight, resolution, scaleZ, simplificationLevel) {
  log('Generating STL', { stage: 'start' });

  let geometry = new THREE.BufferGeometry();
  const vertices = [];
  const normals = [];
  const indices = [];

  const width = Math.floor(imageData.width * resolution);
  const height = Math.floor(imageData.height * resolution);
  const scaleX = objectWidth / (width - 1);
  const scaleY = objectHeight / (height - 1);

  // Apply simplification
  const skipFactor = Math.pow(2, simplificationLevel);

  log('Generating top surface', { width, height, scaleX, scaleY, scaleZ, skipFactor });

  // Generate top surface
  for (let y = 0; y < height; y += skipFactor) {
    for (let x = 0; x < width; x += skipFactor) {
      const i = (Math.floor(y / resolution) * imageData.width + Math.floor(x / resolution)) * 4;
      
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      
      const color = rgbToHex([r, g, b]);
      const colorIndex = colorPalette.indexOf(color);
      
      const z = baseHeight + (colorIndex !== -1 ? colorIndex * scaleZ : 0);

      vertices.push(x * scaleX, y * scaleY, z);
      normals.push(0, 0, 1);

      if (x < width - skipFactor && y < height - skipFactor) {
        const a = (y / skipFactor) * (width / skipFactor) + (x / skipFactor);
        const b = a + 1;
        const c = ((y / skipFactor) + 1) * (width / skipFactor) + (x / skipFactor);
        const d = c + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
    
    if (y % (10 * skipFactor) === 0) {
      reportProgress((y / height) * 50); // First half of progress
    }
  }

  log('Top surface generation complete', { 
    verticesCount: vertices.length / 3, 
    indicesCount: indices.length 
  });

  log('Generating base and walls');

  // Generate base
  const baseVertexOffset = vertices.length / 3;
  for (let y = 0; y < height; y += skipFactor) {
    for (let x = 0; x < width; x += skipFactor) {
      vertices.push(x * scaleX, y * scaleY, 0);
      normals.push(0, 0, -1);
    }
  }

  // Add base faces
  for (let y = 0; y < height - skipFactor; y += skipFactor) {
    for (let x = 0; x < width - skipFactor; x += skipFactor) {
      const a = baseVertexOffset + (y / skipFactor) * (width / skipFactor) + (x / skipFactor);
      const b = a + 1;
      const c = baseVertexOffset + ((y / skipFactor) + 1) * (width / skipFactor) + (x / skipFactor);
      const d = c + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  // Generate side walls
  const addSideWall = (x1, y1, x2, y2) => {
    const index1 = (y1 / skipFactor) * (width / skipFactor) + (x1 / skipFactor);
    const index2 = (y2 / skipFactor) * (width / skipFactor) + (x2 / skipFactor);
    const topZ1 = vertices[index1 * 3 + 2];
    const topZ2 = vertices[index2 * 3 + 2];
    const bottomZ = 0;

    const v1 = [x1 * scaleX, y1 * scaleY, topZ1];
    const v2 = [x2 * scaleX, y2 * scaleY, topZ2];
    const v3 = [x1 * scaleX, y1 * scaleY, bottomZ];
    const v4 = [x2 * scaleX, y2 * scaleY, bottomZ];

    const startIndex = vertices.length / 3;
    vertices.push(...v1, ...v2, ...v3, ...v4);

    const normal = calculateNormal(v1, v2, v3);
    normals.push(...normal, ...normal, ...normal, ...normal);

    indices.push(
      startIndex, startIndex + 2, startIndex + 1,
      startIndex + 1, startIndex + 2, startIndex + 3
    );
  };

  // Add side walls
  for (let x = 0; x < width - skipFactor; x += skipFactor) {
    addSideWall(x, 0, x + skipFactor, 0); // Front
    addSideWall(x, height - skipFactor, x + skipFactor, height - skipFactor); // Back
  }
  for (let y = 0; y < height - skipFactor; y += skipFactor) {
    addSideWall(0, y, 0, y + skipFactor); // Left
    addSideWall(width - skipFactor, y, width - skipFactor, y + skipFactor); // Right
  }

  log('Creating THREE.js BufferGeometry', { 
    verticesCount: vertices.length / 3, 
    normalsCount: normals.length / 3, 
    indicesCount: indices.length 
  });

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);

  log('Exporting binary STL');

  const stlData = exportBinarySTL(geometry);

  log('Binary STL export completed', { stlDataSize: stlData.byteLength });

  return stlData;
}

function calculateNormal(v1, v2, v3) {
  const ax = v2[0] - v1[0];
  const ay = v2[1] - v1[1];
  const az = v2[2] - v1[2];
  const bx = v3[0] - v1[0];
  const by = v3[1] - v1[1];
  const bz = v3[2] - v1[2];
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;
  const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return [nx / length, ny / length, nz / length];
}

function rgbToHex(rgb) {
  return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
}

function exportBinarySTL(geometry) {
  const vertices = geometry.getAttribute('position').array;
  const indices = geometry.getIndex().array;
  const normals = geometry.getAttribute('normal').array;

  const triangles = indices.length / 3;
  const bufferSize = 84 + (50 * triangles);
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Header
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, 0);
  }

  view.setUint32(80, triangles, true);

  let offset = 84;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;

    // Normal
    for (let j = 0; j < 3; j++) {
      view.setFloat32(offset, normals[a + j], true);
      offset += 4;
    }

    // Vertices
    for (const vertexIndex of [a, b, c]) {
      for (let j = 0; j < 3; j++) {
        view.setFloat32(offset, vertices[vertexIndex + j], true);
        offset += 4;
      }
    }

    // Attribute byte count
    view.setUint16(offset, 0, true);
    offset += 2;
  }

  return buffer;
}