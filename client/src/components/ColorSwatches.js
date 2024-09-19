import React from 'react';

const ColorSwatches = ({ colorPalette }) => {
  return (
    <div className="flex justify-center mt-4">
      {colorPalette.map((color, index) => (
        <div
          key={index}
          className="w-8 h-8 mx-1 rounded-full border border-gray-300"
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
};

export default ColorSwatches;