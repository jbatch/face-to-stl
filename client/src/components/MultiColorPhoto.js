import React, { useState, useEffect } from "react";
import { Upload, Image as LucideImage } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import StlComponent from "./StlComponent";

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

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const resizedFile = await resizeImage(file);
      setSelectedFile(resizedFile);
    }
  };

  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height && width > 800) {
            height *= 800 / width;
            width = 800;
          } else if (height > 800) {
            width *= 800 / height;
            height = 800;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              resolve(
                new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                })
              );
            },
            "image/jpeg",
            0.85
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(selectedFile);

      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(selectedFile);
    } else {
      setPreviewUrl(null);
      setImageDimensions(null);
    }
  }, [selectedFile]);

  const handleProcessImage = async () => {
    if (!selectedFile) {
      alert("Please select an image first!");
      return;
    }

    setIsProcessing(true);
    setProcessedImageUrl(null);
    setColorPalette([]);
    setStlFile(null);

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

    const formData = new FormData();
    formData.append("image", dataURItoBlob(processedImageUrl));
    formData.append("color_palette", colorPalette.join(","));
    formData.append("object_height", imageDimensions.height);
    formData.append("object_width", imageDimensions.width);

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
      <main className="flex-grow container mx-auto px-4 py-8">
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
                    {imageDimensions && (
                      <p className="text-center mt-2 text-sm text-gray-600">
                        Dimensions: {imageDimensions.width} x{" "}
                        {imageDimensions.height} pixels
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="w-full md:w-1/2 px-4">
              {selectedFile && (
                <div>
                  <p className="text-gray-600 mb-4">{selectedFile.name}</p>

                  {/* Number of colors slider */}
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

                  {/* Color palette selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Suggested Color Palette
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedColors.map((color, index) => (
                        <input
                          key={index}
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const newColors = [...selectedColors];
                            newColors[index] = e.target.value;
                            setSelectedColors(newColors);
                          }}
                          className="w-8 h-8 p-0 border-0 rounded-full cursor-pointer"
                        />
                      ))}
                    </div>
                  </div>

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
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <LucideImage className="w-5 h-5 mr-2 animate-spin" />
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

        {/* Processed Image Section */}
        {processedImageUrl && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Processed Image</h2>
            <div className="flex justify-center mb-4">
              <img
                src={processedImageUrl}
                alt="Processed"
                className="max-w-full h-auto object-contain rounded-lg"
              />
            </div>
            <div className="flex justify-center space-x-4 mb-4">
              {colorPalette.map((color, index) => (
                <div
                  key={index}
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: `#${color}` }}
                />
              ))}
            </div>
            <div className="flex justify-center">
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
          </div>
        )}

        {/* StlComponent Section */}
        {stlFile && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">3D Model Preview</h2>
            <StlComponent stlFile={stlFile} />
          </div>
        )}
      </main>
    </div>
  );
};

export default MultiColorPhoto;
