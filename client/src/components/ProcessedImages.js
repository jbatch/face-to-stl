import React, { useEffect, useState } from "react";
import { Loader, Image as LucideImage } from "lucide-react";

const ProcessedImages = ({
  processedImages,
  thresholds,
  selectedImageIndex,
  setSelectedImageIndex,
  handleGenerateSTL,
  isGeneratingSTL,
  settings,
  updateSettings,
  imageDimensions,
}) => {
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    if (imageDimensions) {
      const ratio = imageDimensions.height / imageDimensions.width;
      setAspectRatio(ratio);

      // Set initial width to 70mm and calculate height to maintain aspect ratio
      const initialWidth = 70;
      const initialHeight = Math.round(initialWidth * ratio);
      updateSettings({
        objectWidth: initialWidth,
        objectHeight: initialHeight,
      });
    }
  }, [imageDimensions, updateSettings]);

  const handleDimensionChange = (dimension, value) => {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue <= 0) return;

    if (dimension === "width") {
      updateSettings({
        objectWidth: numValue,
        objectHeight: Math.round(numValue * aspectRatio),
      });
    } else {
      updateSettings({
        objectHeight: numValue,
        objectWidth: Math.round(numValue / aspectRatio),
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">Processed Images</h2>
      <div className="flex flex-wrap -mx-4">
        {/* Left column: Generated Images (Scrollable) */}
        <div className="w-full md:w-2/3 px-4 mb-4 md:mb-0">
          <div className="h-[calc(100vh-300px)] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processedImages.map((image, index) => (
                <div key={index} className="p-1">
                  <div
                    className={`relative cursor-pointer overflow-hidden rounded-lg transition-all duration-200 ${
                      selectedImageIndex === index
                        ? "ring-4 ring-green-500"
                        : "hover:ring-2 hover:ring-blue-300"
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img
                      src={`data:image/png;base64,${image}`}
                      alt={`Processed ${index + 1}`}
                      className="w-full h-auto object-contain"
                    />
                    <div
                      className={`absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 px-2 transition-opacity duration-200 ${
                        selectedImageIndex === index
                          ? "opacity-0"
                          : "group-hover:opacity-0"
                      }`}
                    >
                      Threshold: {thresholds[index]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Options and Generate STL button */}
        <div className="w-full md:w-1/3 px-4">
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">STL Options</h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="curved-object"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Curved Object
                </label>
                <select
                  id="curved-object"
                  value={settings.curvedObject}
                  onChange={(e) =>
                    updateSettings({ curvedObject: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                >
                  <option value="none">None</option>
                  <option value="inward">Inward</option>
                  <option value="outward">Outward</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="object-width"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Object Width (mm)
                </label>
                <input
                  id="object-width"
                  type="number"
                  min="1"
                  value={settings.objectWidth}
                  onChange={(e) =>
                    handleDimensionChange("width", e.target.value)
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label
                  htmlFor="object-height"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Object Height (mm)
                </label>
                <input
                  id="object-height"
                  type="number"
                  min="1"
                  value={settings.objectHeight}
                  onChange={(e) =>
                    handleDimensionChange("height", e.target.value)
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="invert-mask"
                  checked={settings.invertMask}
                  onChange={(e) =>
                    updateSettings({ invertMask: e.target.checked })
                  }
                  className="mr-2"
                />
                <label htmlFor="invert-mask" className="text-sm text-gray-700">
                  Invert Mask
                </label>
              </div>
            </div>
          </div>
          <button
            onClick={handleGenerateSTL}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded inline-flex items-center w-full mt-4"
            disabled={isGeneratingSTL || selectedImageIndex === null}
          >
            {isGeneratingSTL ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Generating STL...
              </>
            ) : (
              <>
                <LucideImage className="w-5 h-5 mr-2" />
                Generate STL
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcessedImages;
