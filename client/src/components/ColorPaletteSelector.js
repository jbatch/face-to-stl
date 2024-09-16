import React from "react";
import { Shuffle } from "lucide-react";

const ColorPaletteSelector = ({
  numColors,
  setNumColors,
  selectedColors,
  setSelectedColors,
}) => {
  const getRandomColor = () => {
    return (
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")
    );
  };

  const generateRandomPalette = () => {
    const newColors = Array(numColors)
      .fill()
      .map(() => getRandomColor());
    setSelectedColors(newColors);
  };

  return (
    <div>
      <div className="mb-4">
        <label
          htmlFor="num-colors"
          className="block text-sm font-medium text-gray-700"
        >
          Number of Colors: {numColors}
        </label>
        <input
          type="range"
          id="num-colors"
          min="2"
          max="8"
          value={numColors}
          onChange={(e) => setNumColors(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Color Palette
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          {selectedColors.map((color, index) => (
            <div
              key={index}
              className="w-10 h-10 rounded-full overflow-hidden relative"
            >
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  const newColors = [...selectedColors];
                  newColors[index] = e.target.value;
                  setSelectedColors(newColors);
                }}
                className="absolute top-0 left-0 w-full h-full border-0 cursor-pointer opacity-0"
              />
              <div
                className="w-full h-full"
                style={{ backgroundColor: color }}
              ></div>
            </div>
          ))}
          <button
            onClick={generateRandomPalette}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded inline-flex items-center h-10"
          >
            <Shuffle className="w-4 h-4 mr-1" />
            Random
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorPaletteSelector;
