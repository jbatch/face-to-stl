import React from "react";
import { Upload } from "lucide-react";

const FileUploader = ({ onFileChange }) => {
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const resizedFile = await resizeImage(file);
      onFileChange(resizedFile);
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

  return (
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
    </div>
  );
};

export default FileUploader;
