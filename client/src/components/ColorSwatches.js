import React from 'react';

const ColorSwatches = ({ colorPalette, reversePalette }) => {
  const displayPalette = reversePalette ? [...colorPalette].reverse() : colorPalette;

  return (<>
    <div className="flex justify-center mt-4">
      {displayPalette.map((color, index) => (
        <div
          key={index}
          className="w-8 h-8 mx-1 rounded-full border border-gray-300"
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
    <p className="text-center">Base &rarr; Peaks</p>
    </>
  );
};

export default ColorSwatches;