// src/workers/stlGenerator.worker.js

/* eslint-disable no-restricted-globals */
import * as THREE from 'three';

self.onmessage = function(e) {
  const { imageData, colorPalette, objectWidth, objectHeight, baseHeight = 2 } = e.data;
  const stlData = generateSTL(imageData, colorPalette, objectWidth, objectHeight, baseHeight);
  self.postMessage(stlData);
};

function generateSTL(imageData, colorPalette, objectWidth, objectHeight, baseHeight) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const normals = [];
  const indices = [];

  const width = imageData.width;
  const height = imageData.height;
  const scaleX = objectWidth / (width - 1);
  const scaleY = objectHeight / (height - 1);

  // Generate top surface
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const color = rgbToHex([r, g, b]);
      const colorIndex = colorPalette.indexOf(color);
      const z = baseHeight + colorIndex * 0.5; // Adjust this value to change the height of each color layer

      vertices.push(x * scaleX, y * scaleY, z);
      normals.push(0, 0, 1);

      if (x < width - 1 && y < height - 1) {
        const a = y * width + x;
        const b = y * width + (x + 1);
        const c = (y + 1) * width + x;
        const d = (y + 1) * width + (x + 1);

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  // Generate base
  const baseVertexOffset = vertices.length / 3;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      vertices.push(x * scaleX, y * scaleY, 0);
      normals.push(0, 0, -1);
    }
  }

  // Add base faces
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const a = baseVertexOffset + y * width + x;
      const b = baseVertexOffset + y * width + (x + 1);
      const c = baseVertexOffset + (y + 1) * width + x;
      const d = baseVertexOffset + (y + 1) * width + (x + 1);

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  // Generate side walls
  const addSideWall = (x1, y1, x2, y2) => {
    const topZ1 = vertices[(y1 * width + x1) * 3 + 2];
    const topZ2 = vertices[(y2 * width + x2) * 3 + 2];
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
  for (let x = 0; x < width - 1; x++) {
    addSideWall(x, 0, x + 1, 0); // Front
    addSideWall(x, height - 1, x + 1, height - 1); // Back
  }
  for (let y = 0; y < height - 1; y++) {
    addSideWall(0, y, 0, y + 1); // Left
    addSideWall(width - 1, y, width - 1, y + 1); // Right
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);

  const stlExporter = new STLExporter();
  return stlExporter.parse(geometry);
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

// STLExporter implementation (simplified version)
class STLExporter {
  parse(geometry) {
    let output = 'solid exported\n';

    const vertices = geometry.getAttribute('position').array;
    const normals = geometry.getAttribute('normal').array;
    const indices = geometry.getIndex().array;

    for (let i = 0; i < indices.length; i += 3) {
      output += 'facet normal ' + this.getVector(normals, indices[i]) + '\n';
      output += 'outer loop\n';
      output += 'vertex ' + this.getVector(vertices, indices[i]) + '\n';
      output += 'vertex ' + this.getVector(vertices, indices[i + 1]) + '\n';
      output += 'vertex ' + this.getVector(vertices, indices[i + 2]) + '\n';
      output += 'endloop\n';
      output += 'endfacet\n';
    }

    output += 'endsolid exported\n';

    return output;
  }

  getVector(array, index) {
    return `${array[index * 3]} ${array[index * 3 + 1]} ${array[index * 3 + 2]}`;
  }
}