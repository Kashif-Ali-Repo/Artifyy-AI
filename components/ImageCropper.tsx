import React, { useState, useRef } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { ImageFile } from '../types';

interface ImageCropperProps {
  imageFile: ImageFile;
  onCropComplete: (file: ImageFile) => void;
  onCancel: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageFile, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState<Crop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        1, // Aspect ratio (1 for freeform)
        width,
        height
      ),
      width,
      height
    );
    setCrop(newCrop);
  }

  const handleConfirmCrop = async () => {
    if (!crop || !imgRef.current) return;
    setIsProcessing(true);

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;

    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );
    
    const dataUrl = canvas.toDataURL(imageFile.mimeType);
    const base64 = dataUrl.split(',')[1];
    
    const croppedImageFile: ImageFile = {
      base64,
      mimeType: imageFile.mimeType,
      url: dataUrl,
    };
    
    onCropComplete(croppedImageFile);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg animate-fade-in">
      <h2 className="text-2xl font-bold text-center text-indigo-400 mb-4">Crop Your Image</h2>
      <p className="text-gray-400 mb-6 text-center">Adjust the selection to focus on the most important part of your photo.</p>
      
      <div className="max-w-full max-h-[60vh] overflow-auto mb-6 flex justify-center items-center bg-gray-900/50 rounded-md">
        <ReactCrop
          crop={crop}
          onChange={c => setCrop(c)}
          aspect={undefined} // Freeform crop
        >
          <img 
            ref={imgRef}
            src={imageFile.url}
            alt="Image to crop"
            onLoad={onImageLoad}
            style={{ maxHeight: '60vh', objectFit: 'contain' }}
          />
        </ReactCrop>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleConfirmCrop}
          disabled={!crop || isProcessing}
          className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Confirm & Analyze'}
        </button>
        <button
          onClick={onCancel}
          className="w-full sm:w-auto text-center px-6 py-3 text-base font-semibold text-gray-200 transition-all duration-200 bg-gray-600 border border-transparent rounded-md hover:bg-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ImageCropper;
