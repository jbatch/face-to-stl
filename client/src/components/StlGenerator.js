import React from "react";
import { LucideImage } from "lucide-react";

const STLGenerator = ({
  imageProcessed,
  isGeneratingSTL,
  handleGenerateSTL,
}) => {
  return (
    <div className="mt-4 mb-4">
      {imageProcessed && (
        <div className="flex ">
          <button
            onClick={handleGenerateSTL}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded inline-flex items-center"
            disabled={isGeneratingSTL}
          >
            {isGeneratingSTL ? (
              <>
                <LucideImage className="w-5 h-5 mr-2 animate-spin" />
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

export default STLGenerator;