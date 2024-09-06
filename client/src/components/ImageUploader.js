import React, { useState } from "react";
import axios from "axios";
import { Upload, Image as LucideImage, Loader } from "lucide-react";
import { API_BASE_URL } from "../config";

const ImageUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processedImages, setProcessedImages] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [stlFile, setStlFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingSTL, setIsGeneratingSTL] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setProcessedImages([]);
    setSelectedImageIndex(null);
    setStlFile(null);
  };

  const handleProcessImages = async () => {
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }

    setIsProcessing(true);
    setProcessedImages([]);
    setSelectedImageIndex(null);
    setStlFile(null);

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("num_thresholds", 9);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/process-images`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setProcessedImages(response.data.processedImages);
      setThresholds(response.data.thresholds);
    } catch (error) {
      console.error("Error processing images:", error);
      alert("Error processing images. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSTL = async () => {
    if (selectedImageIndex === null) {
      alert("Please select an image first!");
      return;
    }

    setIsGeneratingSTL(true);
    setStlFile(null);

    const formData = new FormData();
    formData.append(
      "image",
      dataURItoBlob(
        `data:image/png;base64,${processedImages[selectedImageIndex]}`
      )
    );

    try {
      const response = await axios.post(
        `${API_BASE_URL}/generate-stl`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setStlFile(response.data.stlFile);
    } catch (error) {
      console.error("Error generating STL:", error);
      alert("Error generating STL. Please try again.");
    } finally {
      setIsGeneratingSTL(false);
    }
  };

  const dataURItoBlob = (dataURI) => {
    const byteString = atob(dataURI.split(",")[1]);
    const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-blue-600 text-white py-4">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold text-center">Face-to-STL</h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
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

        {processedImages.length > 0 && (
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
        )}

        {stlFile && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">STL File</h2>
            <div className="text-center">
              <a
                href={`data:application/octet-stream;base64,${stlFile}`}
                download="face_model.stl"
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded inline-flex items-center"
              >
                <LucideImage className="w-5 h-5 mr-2" />
                <span>Download STL File</span>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ImageUploader;
