// FileUploader.js
import React from "react";
import { Upload, Image as LucideImage, Loader } from "lucide-react";

const FileUploader = ({
  selectedFile,
  handleFileChange,
  handleProcessImages,
  isProcessing,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex items-center justify-center mb-4">
        <label
          htmlFor="file-upload"
          className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded inline-flex items-center"
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
      </div>
      {selectedFile && (
        <div className="text-center mb-4">
          <p className="text-gray-600">{selectedFile.name}</p>
          <button
            onClick={handleProcessImages}
            className="mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded inline-flex items-center"
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
  );
};

export default FileUploader;
