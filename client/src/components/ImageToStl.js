import React, { useState, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import FileUploader from "./FileUploader";
import ProcessedImages from "./ProcessedImages";
import StlComponent from "./StlComponent";

const ImageToStl = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processedImages, setProcessedImages] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [stlFile, setStlFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingSTL, setIsGeneratingSTL] = useState(false);
  const [settings, setSettings] = useState({
    minThreshold: 64,
    maxThreshold: 192,
    numImages: 5,
    objectWidth: 70,
    objectHeight: 41,
  });

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setProcessedImages([]);
    setSelectedImageIndex(null);
    setStlFile(null);
  };

  const updateSettings = useCallback((newSettings) => {
    setSettings((prevSettings) => ({ ...prevSettings, ...newSettings }));
  }, []);

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
    formData.append("min_threshold", settings.minThreshold);
    formData.append("max_threshold", settings.maxThreshold);
    formData.append("num_thresholds", settings.numImages);

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
    formData.append("object_height", settings.objectHeight);
    formData.append("object_width", settings.objectWidth);

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
        <FileUploader
          selectedFile={selectedFile}
          handleFileChange={handleFileChange}
          handleProcessImages={handleProcessImages}
          isProcessing={isProcessing}
          settings={settings}
          updateSettings={updateSettings}
        />

        {processedImages.length > 0 && (
          <ProcessedImages
            processedImages={processedImages}
            thresholds={thresholds}
            selectedImageIndex={selectedImageIndex}
            setSelectedImageIndex={setSelectedImageIndex}
            handleGenerateSTL={handleGenerateSTL}
            isGeneratingSTL={isGeneratingSTL}
          />
        )}

        {stlFile && <StlComponent stlFile={stlFile} />}
      </main>
    </div>
  );
};

export default ImageToStl;
