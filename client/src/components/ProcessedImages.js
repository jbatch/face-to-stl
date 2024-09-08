import React from "react";
import { Loader, LucideImage } from "lucide-react";

const ProcessedImages = ({
  processedImages,
  thresholds,
  selectedImageIndex,
  setSelectedImageIndex,
  handleGenerateSTL,
  isGeneratingSTL,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">Processed Images</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {processedImages.map((image, index) => (
          <div
            key={index}
            className={`cursor-pointer rounded-lg overflow-hidden border-4 ${
              selectedImageIndex === index
                ? "border-blue-500"
                : "border-transparent"
            }`}
            onClick={() => setSelectedImageIndex(index)}
          >
            <div className="bg-gray-200 p-2">
              <p className="text-center font-semibold">
                Threshold {thresholds[index]}
              </p>
            </div>
            <img
              src={`data:image/png;base64,${image}`}
              alt={`Processed ${index + 1}`}
              className="w-full h-auto"
            />
          </div>
        ))}
      </div>
      {selectedImageIndex !== null && (
        <div className="mt-4 text-center">
          <button
            onClick={handleGenerateSTL}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded inline-flex items-center"
            disabled={isGeneratingSTL}
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
      )}
    </div>
  );
};

export default ProcessedImages;
