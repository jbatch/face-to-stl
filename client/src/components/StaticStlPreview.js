import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import StlComponent from "./StlComponent";

const StaticStlPreview = () => {
  const [stlFile, setStlFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStlFile = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/static-stl`, {
          responseType: "arraybuffer",
        });
        const base64 = btoa(
          new Uint8Array(response.data).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );
        setStlFile(base64);
        setIsLoading(false);
      } catch (err) {
        setError("Failed to load STL file");
        setIsLoading(false);
      }
    };

    fetchStlFile();
  }, []);

  if (isLoading) {
    return <div>Loading STL file...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Static STL Preview</h1>
      {stlFile && <StlComponent stlFile={stlFile} />}
    </div>
  );
};

export default StaticStlPreview;
