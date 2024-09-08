import React, { useState, useEffect } from "react";
import { Upload, Image as LucideImage, Loader } from "lucide-react";

const FileUploader = ({
  selectedFile,
  handleFileChange,
  handleProcessImages,
  isProcessing,
  settings,
  updateSettings,
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(null);

  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(selectedFile);

      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        // Set initial width to 70mm and calculate height to maintain aspect ratio
        const ar = img.height / img.width;
        setAspectRatio(ar);
        const initialWidth = 70;
        const initialHeight = Math.round(initialWidth * ar);
        updateSettings({
          objectWidth: initialWidth,
          objectHeight: initialHeight,
        });
      };
      img.src = URL.createObjectURL(selectedFile);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile, updateSettings]);

  const handleDimensionChange = (dimension, value) => {
    if (aspectRatio) {
      if (dimension === "width") {
        updateSettings({
          objectWidth: value,
          objectHeight: Math.round(value * aspectRatio),
        });
      } else {
        updateSettings({
          objectHeight: value,
          objectWidth: Math.round(value / aspectRatio),
        });
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex flex-wrap -mx-4">
        {/* Left column */}
        <div className="w-full md:w-1/2 px-4 mb-4 md:mb-0">
          <div className="flex flex-col items-center">
            <label
              htmlFor="file-upload"
              className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded inline-flex items-center mb-4"
            >
              <Upload className="w-5 h-5 mr-2" />
              <span>Choose an image</span>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
              />
            </label>
            {previewUrl && (
              <div className="mt-4 w-full max-w-md">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-auto object-contain rounded-lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="w-full md:w-1/2 px-4">
          {selectedFile && (
            <div>
              <p className="text-gray-600 mb-4">{selectedFile.name}</p>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="threshold-range"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Threshold Range
                  </label>
                  <div className="mt-1">
                    <input
                      type="range"
                      id="min-threshold"
                      min="0"
                      max="255"
                      value={settings.minThreshold}
                      onChange={(e) =>
                        updateSettings({
                          minThreshold: parseInt(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                    <input
                      type="range"
                      id="max-threshold"
                      min="0"
                      max="255"
                      value={settings.maxThreshold}
                      onChange={(e) =>
                        updateSettings({
                          maxThreshold: parseInt(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{settings.minThreshold}</span>
                    <span>{settings.maxThreshold}</span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="num-images"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Number of Output Images (2-9)
                  </label>
                  <input
                    id="num-images"
                    type="number"
                    min="2"
                    max="9"
                    value={settings.numImages}
                    onChange={(e) =>
                      updateSettings({ numImages: parseInt(e.target.value) })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="object-height"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Object Height (mm)
                  </label>
                  <input
                    id="object-height"
                    type="number"
                    min="1"
                    value={settings.objectHeight}
                    onChange={(e) =>
                      handleDimensionChange("height", parseInt(e.target.value))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="object-width"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Object Width (mm)
                  </label>
                  <input
                    id="object-width"
                    type="number"
                    min="1"
                    value={settings.objectWidth}
                    onChange={(e) =>
                      handleDimensionChange("width", parseInt(e.target.value))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
              </div>

              <button
                onClick={handleProcessImages}
                className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded inline-flex items-center"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <LucideImage className="w-5 h-5 mr-2" />
                    Process Image
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
