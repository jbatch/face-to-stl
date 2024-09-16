import React from "react";
import { RefreshCw, Upload, Loader } from "lucide-react";

const ImageDisplay = ({
  previewUrl,
  processedImageUrl,
  colorPalette,
  imageDimensions,
  showPreview,
  togglePreview,
  isProcessing,
}) => {
  const hasImage = previewUrl || processedImageUrl;

  return (
    <div className="mt-4 w-full max-w-md">
      <div className="relative">
        {isProcessing ? (
          <div className="w-full h-64 bg-gray-200 rounded-lg flex flex-col items-center justify-center">
            <Loader className="w-12 h-12 text-blue-500 mb-2 animate-spin" />
            <p className="text-gray-700 text-center">
              Processing image...
              <br />
              Please wait.
            </p>
          </div>
        ) : hasImage ? (
          <>
            <img
              src={showPreview ? previewUrl : processedImageUrl}
              alt={showPreview ? "Preview" : "Processed"}
              className="w-full h-auto object-contain rounded-lg"
            />
            {processedImageUrl && (
              <button
                onClick={togglePreview}
                className="absolute top-2 right-2 bg-white bg-opacity-75 p-1 rounded-full hover:bg-opacity-100 transition-all duration-200"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-64 bg-gray-200 rounded-lg flex flex-col items-center justify-center">
            <Upload className="w-12 h-12 text-gray-400 mb-2" />
            <p className="text-gray-500 text-center">
              No image uploaded yet.
              <br />
              Please choose an image to begin.
            </p>
          </div>
        )}
      </div>
      {imageDimensions && !isProcessing && (
        <p className="text-center mt-2 text-sm text-gray-600">
          Dimensions: {imageDimensions.width} x {imageDimensions.height} pixels
        </p>
      )}
      {!showPreview &&
        !isProcessing &&
        colorPalette &&
        colorPalette.length > 0 && (
          <div className="flex justify-center space-x-2 mt-2">
            {colorPalette.map((color, index) => (
              <div
                key={index}
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: `#${color}` }}
              />
            ))}
          </div>
        )}
    </div>
  );
};

export default ImageDisplay;
