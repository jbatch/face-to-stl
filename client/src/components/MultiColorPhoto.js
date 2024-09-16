import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import FileUploader from "./FileUploader";
import ColorPaletteSelector from "./ColorPaletteSelector";
import ImageDisplay from "./ImageDisplay";
import StlGenerator from "./StlGenerator";
import StlComponent from "./StlComponent";
import { FlaskConical } from "lucide-react";

const MultiColorPhoto = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [processedImageUrl, setProcessedImageUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingSTL, setIsGeneratingSTL] = useState(false);
  const [colorPalette, setColorPalette] = useState([]);
  const [stlFile, setStlFile] = useState(null);
  const [numColors, setNumColors] = useState(4);
  const [selectedColors, setSelectedColors] = useState([
    "#000000",
    "#FF0000",
    "#FF00FF",
    "#FFA500",
  ]);
  const [remapColors, setRemapColors] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const stlPreviewRef = useRef(null);

  useEffect(() => {
    // Adjust selected colors when numColors changes
    setSelectedColors((prevColors) => {
      const newColors = [...prevColors];
      if (numColors > prevColors.length) {
        // Add colors if needed
        while (newColors.length < numColors) {
          newColors.push(getRandomColor());
        }
      } else if (numColors < prevColors.length) {
        // Remove colors if needed
        newColors.splice(numColors);
      }
      return newColors;
    });
  }, [numColors]);

  const getRandomColor = () => {
    return (
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")
    );
  };

  const handleFileChange = (file) => {
    setSelectedFile(file);
    setProcessedImageUrl(null);
    setColorPalette([]);
    setStlFile(null);
    setShowPreview(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
    img.src = URL.createObjectURL(file);
  };

  const handleProcessImage = async () => {
    if (!selectedFile) {
      alert("Please select an image first!");
      return;
    }

    setIsProcessing(true);
    setProcessedImageUrl(null);
    setColorPalette([]);
    setStlFile(null);
    setShowPreview(false); // Switch to processed view immediately

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append(
      "selected_colors",
      selectedColors.map((color) => color.slice(1)).join(",")
    );
    formData.append("remap_colors", remapColors);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/quantize-colors`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setProcessedImageUrl(
        `data:image/png;base64,${response.data.quantized_image}`
      );
      setColorPalette(response.data.color_palette);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Error processing image. Please try again.");
      setShowPreview(true); // Switch back to preview if there's an error
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSTL = async () => {
    if (!processedImageUrl || colorPalette.length === 0) {
      alert("Please process the image first!");
      return;
    }

    setIsGeneratingSTL(true);
    setStlFile(null);

    const aspectRatio = imageDimensions.height / imageDimensions.width;
    const width = 70;
    const height = Math.round(width * aspectRatio);

    const formData = new FormData();
    formData.append("image", dataURItoBlob(processedImageUrl));
    formData.append("color_palette", colorPalette.join(","));
    formData.append("object_height", height);
    formData.append("object_width", width);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/generate-stl-from-heightmap`,
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

  useEffect(() => {
    if (stlFile && stlPreviewRef.current) {
      stlPreviewRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [stlFile]);

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

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap -mx-4">
            <div className="w-full md:w-1/2 px-4 mb-4 md:mb-0">
              <FileUploader onFileChange={handleFileChange} />
              <ImageDisplay
                previewUrl={previewUrl}
                processedImageUrl={processedImageUrl}
                colorPalette={colorPalette}
                imageDimensions={imageDimensions}
                showPreview={showPreview}
                togglePreview={togglePreview}
                isProcessing={isProcessing}
              />
            </div>
            <div className="w-full md:w-1/2 px-4">
              <ColorPaletteSelector
                numColors={numColors}
                setNumColors={setNumColors}
                selectedColors={selectedColors}
                setSelectedColors={setSelectedColors}
              />
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={remapColors}
                    onChange={(e) => setRemapColors(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">Remap Colors</span>
                </label>
              </div>
              <button
                onClick={handleProcessImage}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded inline-flex items-center"
                disabled={isProcessing || !selectedFile}
              >
                {isProcessing ? (
                  <>
                    <FlaskConical className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FlaskConical className="w-5 h-5 mr-2" />
                    Process Image
                  </>
                )}
              </button>
              <StlGenerator
                imageProcessed={processedImageUrl !== undefined}
                isGeneratingSTL={isGeneratingSTL}
                handleGenerateSTL={handleGenerateSTL}
              />
            </div>
          </div>
        </div>

        {stlFile && (
          <div ref={stlPreviewRef}>
            <StlComponent stlFile={stlFile} />
          </div>
        )}
      </main>
    </div>
  );
};

export default MultiColorPhoto;
