import React from 'react';

const ColorSwatches = ({ colorPalette, reversePalette }) => {
  const displayPalette = reversePalette ? [...colorPalette].reverse() : colorPalette;

  return (
    <div className="mt-4">
      <div className="flex justify-center">
        {displayPalette.map((color, index) => (
          <div
            key={index}
            className="w-8 h-8 mx-1 rounded-full border border-gray-300"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <p className="text-center text-sm text-gray-600 mt-2">Base &rarr; Peaks</p>
    </div>
  );
};

export default ColorSwatches;