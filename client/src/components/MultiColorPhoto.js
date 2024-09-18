import React, { useState, useEffect, useRef } from "react";
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
  const [reversePalette, setReversePalette] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const stlPreviewRef = useRef(null);
  const [imageProcessorWorker, setImageProcessorWorker] = useState(null);
  const [stlGeneratorWorker, setStlGeneratorWorker] = useState(null);

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

  useEffect(() => {
    const imgWorker = new Worker(new URL('../workers/imageProcessor.worker.js', import.meta.url));
    const stlWorker = new Worker(new URL('../workers/stlGenerator.worker.js', import.meta.url));

    setImageProcessorWorker(imgWorker);
    setStlGeneratorWorker(stlWorker);

    return () => {
      imgWorker.terminate();
      stlWorker.terminate();
    };
  }, []);

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
    if (!selectedFile || !imageProcessorWorker) {
      alert("Please select an image first!");
      return;
    }

    setIsProcessing(true);
    setProcessedImageUrl(null);
    setColorPalette([]);
    setStlFile(null);
    setShowPreview(false);

    const imageData = await createImageData(selectedFile);
    
    imageProcessorWorker.postMessage({
      imageData,
      numColors,
      selectedColors,
      remapColors
    });

    imageProcessorWorker.onmessage = (e) => {
      const { quantizedImageData, colorPalette } = e.data;
      const canvas = document.createElement('canvas');
      canvas.width = quantizedImageData.width;
      canvas.height = quantizedImageData.height;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(quantizedImageData, 0, 0);
      
      setProcessedImageUrl(canvas.toDataURL());
      setColorPalette(colorPalette);
      setIsProcessing(false);
    };
  };

  const handleGenerateSTL = async () => {
    if (!processedImageUrl || colorPalette.length === 0 || !stlGeneratorWorker) {
      alert("Please process the image first!");
      return;
    }

    setIsGeneratingSTL(true);
    setStlFile(null);

    const aspectRatio = imageDimensions.height / imageDimensions.width;
    const width = 70;
    const height = Math.round(width * aspectRatio);

    const imageData = await createImageData(processedImageUrl);

    stlGeneratorWorker.postMessage({
      imageData,
      colorPalette,
      objectWidth: width,
      objectHeight: height,
      baseHeight: 5 // Specify the desired base height in mm
    });

    stlGeneratorWorker.onmessage = (e) => {
      const stlData = e.data;
      setStlFile(btoa(stlData));
      setIsGeneratingSTL(false);
    };
  };

  const createImageData = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      img.src = typeof src === 'string' ? src : URL.createObjectURL(src);
    });
  };

  useEffect(() => {
    if (stlFile && stlPreviewRef.current) {
      stlPreviewRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [stlFile]);

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
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reversePalette}
                    onChange={(e) => setReversePalette(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">Reverse Palette Order</span>
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
              {processedImageUrl && (
                <StlGenerator
                  imageProcessed={processedImageUrl !== undefined}
                  isGeneratingSTL={isGeneratingSTL}
                  handleGenerateSTL={handleGenerateSTL}
                />
              )}
            </div>
          </div>
        </div>

        {stlFile && (
          <div ref={stlPreviewRef}>
            <StlComponent stlFile={stlFile} colorPalette={colorPalette} />
          </div>
        )}
      </main>
    </div>
  );
};

export default MultiColorPhoto;
