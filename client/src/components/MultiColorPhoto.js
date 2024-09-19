import React, { useState, useEffect, useRef, useCallback } from "react";
import FileUploader from "./FileUploader";
import ColorPaletteSelector from "./ColorPaletteSelector";
import ImageDisplay from "./ImageDisplay";
import StlGenerator from "./StlGenerator";
import StlComponent from "./StlComponent";
import ColorSwatches from "./ColorSwatches";
import { FlaskConical } from "lucide-react";

const defaultColors = ["#000000", "#FF0000", "#FF00FF", "#FFA500"];

const MultiColorPhoto = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalImageData, setOriginalImageData] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [processedImageUrl, setProcessedImageUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingSTL, setIsGeneratingSTL] = useState(false);
  const [colorPalette, setColorPalette] = useState([]);
  const [stlFile, setStlFile] = useState(null);
  const [selectedColors, setSelectedColors] = useState(() => {
    const savedColors = localStorage.getItem('customColors');
    return savedColors ? JSON.parse(savedColors) : defaultColors;
  });
  const [numColors, setNumColors] = useState(() => {
    const savedColors = localStorage.getItem('customColors');
    return savedColors ? JSON.parse(savedColors).length : defaultColors.length;
  });
  const [remapColors, setRemapColors] = useState(true);
  const [reversePalette, setReversePalette] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [stlResolution, setStlResolution] = useState(0.5);
  const [simplificationLevel, setSimplificationLevel] = useState(1);
  const [baseHeight, setBaseHeight] = useState(5);
  const [layerHeight, setLayerHeight] = useState(1);
  
  const stlPreviewRef = useRef(null);
  const [stlGenerationProgress, setStlGenerationProgress] = useState(0);
  const [stlGenerationTime, setStlGenerationTime] = useState(null);
  const [stlFileSize, setStlFileSize] = useState(null);
  const [showStlViewer, setShowStlViewer] = useState(false);

  const [imageProcessorWorker, setImageProcessorWorker] = useState(null);
  const [stlGeneratorWorker, setStlGeneratorWorker] = useState(null);

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

  useEffect(() => {
    console.log("STL File updated:", stlFile);
  }, [stlFile]);

  const handleSetSelectedColors = useCallback((colors) => {
    setSelectedColors(colors);
    localStorage.setItem('customColors', JSON.stringify(colors));
  }, []);

  const handleSetNumColors = useCallback((num) => {
    setNumColors(num);
    if (selectedColors.length < num) {
      const newColors = [
        ...selectedColors,
        ...Array(num - selectedColors.length).fill().map(() => getRandomColor())
      ];
      handleSetSelectedColors(newColors);
    } else if (selectedColors.length > num) {
      handleSetSelectedColors(selectedColors.slice(0, num));
    }
  }, [selectedColors, handleSetSelectedColors]);

  const getRandomColor = () => {
    return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
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
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      setOriginalImageData(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.src = URL.createObjectURL(file);
  };

  const handleProcessImage = async () => {
    if (!selectedFile || !imageProcessorWorker || !originalImageData) {
      alert("Please select an image first!");
      return;
    }

    setIsProcessing(true);
    setProcessedImageUrl(null);
    setColorPalette([]);
    setStlFile(null);
    setShowPreview(false);

    // Create a stable color palette based on selectedColors
    const stableColorPalette = selectedColors.map(color => {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return [r, g, b];
    });

    console.log("Sending data to worker:", {
      imageDataSize: `${originalImageData.width}x${originalImageData.height}`,
      numColors,
      selectedColors: stableColorPalette,
      remapColors
    });

    imageProcessorWorker.postMessage({
      imageData: originalImageData,
      numColors,
      selectedColors: stableColorPalette,
      remapColors
    });

    imageProcessorWorker.onmessage = (e) => {
      console.log("Received response from worker:", e.data);
      const { quantizedImageData, colorPalette } = e.data;
      
      if (!quantizedImageData || !quantizedImageData.data || quantizedImageData.data.length === 0) {
        console.error("Received invalid quantizedImageData from worker");
        setIsProcessing(false);
        alert("Error processing image. Please try again.");
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = quantizedImageData.width;
      canvas.height = quantizedImageData.height;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(new ImageData(new Uint8ClampedArray(quantizedImageData.data), quantizedImageData.width, quantizedImageData.height), 0, 0);
      
      const dataURL = canvas.toDataURL();
      console.log("Generated dataURL:", dataURL.slice(0, 100) + "...");  // Log the first 100 characters of the dataURL
      
      setProcessedImageUrl(dataURL);
      // Store the color palette as an array of hex codes
      setColorPalette(colorPalette.map(color => `#${color.toString(16).padStart(6, '0')}`));
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
    setStlGenerationProgress(0);
    setStlGenerationTime(null);
    setStlFileSize(null);

    const aspectRatio = imageDimensions.height / imageDimensions.width;
    const width = 70;
    const height = Math.round(width * aspectRatio);

    const imageData = await createImageData(processedImageUrl);

    const scaleZ = layerHeight;

    // Apply reverse palette if the option is selected
    const stlColorPalette = reversePalette ? [...colorPalette].reverse() : colorPalette;

    stlGeneratorWorker.postMessage({
      imageData,
      colorPalette: stlColorPalette,
      objectWidth: width,
      objectHeight: height,
      resolution: stlResolution,
      baseHeight,
      scaleZ,
      simplificationLevel
    });

    stlGeneratorWorker.onmessage = (e) => {
      const { type, message, data, percentage, generationTime, fileSizeInMB } = e.data;
      switch (type) {
        case 'log':
          console.log(`STL Generator: ${message}`, data);
          break;
        case 'progress':
          setStlGenerationProgress(percentage);
          break;
        case 'result':
          console.log("STL Generation complete. Setting STL file...");
          console.log(`Generation Time: ${generationTime.toFixed(2)} seconds`);
          console.log(`File Size: ${fileSizeInMB.toFixed(2)} MB`);
          const blob = new Blob([data], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          setStlFile(url);
          setIsGeneratingSTL(false);
          setStlGenerationProgress(100);
          setStlGenerationTime(generationTime);
          setStlFileSize(fileSizeInMB);
          break;
        case 'error':
          console.error('STL Generation Error:', message);
          console.error('Stack:', data?.stack);
          setIsGeneratingSTL(false);
          alert(`Error generating STL: ${message}`);
          break;
      }
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

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  useEffect(() => {
    if (stlFile && stlPreviewRef.current) {
      stlPreviewRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [stlFile]);

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
              {processedImageUrl && (
                <ColorSwatches colorPalette={colorPalette} reversePalette={reversePalette} />
              )}
            </div>
            <div className="w-full md:w-1/2 px-4">
            <ColorPaletteSelector
                numColors={numColors}
                setNumColors={setNumColors}
                selectedColors={selectedColors}
                setSelectedColors={handleSetSelectedColors}
                defaultColors={defaultColors}
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
                  <span className="ml-2 text-gray-700">Reverse Palette</span>
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
                <>
                  <hr className="mb-4 mt-4" />
                  <div className="mb-4 mt-4">
                    <label htmlFor="stl-resolution" className="block text-sm font-medium text-gray-700">
                      STL Resolution: {(stlResolution * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      id="stl-resolution"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={stlResolution}
                      onChange={(e) => setStlResolution(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="simplification-level" className="block text-sm font-medium text-gray-700">
                      Simplification Level: {simplificationLevel}
                    </label>
                    <input
                      type="range"
                      id="simplification-level"
                      min="0"
                      max="3"
                      step="1"
                      value={simplificationLevel}
                      onChange={(e) => setSimplificationLevel(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="base-height" className="block text-sm font-medium text-gray-700">
                      Base Height (mm): {baseHeight}
                    </label>
                    <input
                      type="range"
                      id="base-height"
                      min="1"
                      max="10"
                      step="0.5"
                      value={baseHeight}
                      onChange={(e) => setBaseHeight(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="layer-height" className="block text-sm font-medium text-gray-700">
                      Layer Height (mm): {layerHeight}
                    </label>
                    <input
                      type="range"
                      id="layer-height"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={layerHeight}
                      onChange={(e) => setLayerHeight(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={showStlViewer}
                        onChange={(e) => setShowStlViewer(e.target.checked)}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700">Show STL viewer</span>
                    </label>
                  </div>
                  <StlGenerator
                    imageProcessed={processedImageUrl !== undefined}
                    isGeneratingSTL={isGeneratingSTL}
                    handleGenerateSTL={handleGenerateSTL}
                  />
                </>
              )}
            </div>
          </div>
          {isGeneratingSTL && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Generating STL...</h3>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{width: `${stlGenerationProgress}%`}}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {stlGenerationProgress.toFixed(2)}% complete
              </p>
            </div>
          )}
        </div>

        {stlFile && (
          <div ref={stlPreviewRef}>
            <StlComponent 
              stlFile={stlFile} 
              colorPalette={reversePalette ? [...colorPalette].reverse() : colorPalette}
              generationTime={stlGenerationTime}
              fileSize={stlFileSize}
              baseHeight={baseHeight}
              layerHeight={layerHeight}
              showStlViewer={showStlViewer}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default MultiColorPhoto;