import React, { useEffect, useState, useRef } from "react";
import { LucideImage } from "lucide-react";
import StlViewer from "./StlViewer";

const StlComponent = ({ stlFile, colorPalette }) => {
  const containerRef = useRef(null);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">STL File</h2>
      <div
        ref={containerRef}
        className="mb-4"
        style={{ height: "400px", width: "100%" }}
      >
        {stlFile && <StlViewer stlFile={stlFile} colorPalette={colorPalette} />}
      </div>
      <div className="text-center">
        <a
          href={stlFile}
          download="face_model.stl"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded inline-flex items-center"
        >
          <LucideImage className="w-5 h-5 mr-2" />
          <span>Download STL File</span>
        </a>
      </div>
    </div>
  );
};

export default StlComponent;