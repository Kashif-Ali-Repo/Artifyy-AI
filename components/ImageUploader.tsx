
import React, { useRef, useState, useCallback } from 'react';
import { UploadIcon } from './icons';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  disabled: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onImageUpload(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragEvents = useCallback((e: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(dragging);
    }
  }, [disabled]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onImageUpload(files[0]);
    }
  };
  
  const dragClasses = isDragging ? 'border-indigo-400 bg-gray-800' : 'border-gray-600 hover:border-indigo-500';

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onClick={handleClick}
        onDragEnter={(e) => handleDragEvents(e, true)}
        onDragLeave={(e) => handleDragEvents(e, false)}
        onDragOver={(e) => handleDragEvents(e, true)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full h-64 px-4 text-center transition-colors duration-300 ease-in-out border-2 border-dashed rounded-lg cursor-pointer ${dragClasses} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <UploadIcon className="w-12 h-12 text-gray-400" />
        <p className="mt-4 text-lg font-medium text-gray-300">
          <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
        </p>
        <p className="mt-1 text-sm text-gray-500">PNG, JPG, or WEBP</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default ImageUploader;
