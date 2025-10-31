import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ImageComparatorProps {
  beforeImage: string;
  afterImage: string;
}

const ImageComparator: React.FC<ImageComparatorProps> = ({ beforeImage, afterImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // New state for zoom effect
  const [isZoomed, setIsZoomed] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState('center center');

  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleSliderMove(e.clientX);
    } else if (containerRef.current) {
      // Not dragging, so we are just hovering for zoom
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setTransformOrigin(`${x}% ${y}%`);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setIsZoomed(false); // Disable zoom when dragging starts
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseUp = () => isDragging && setIsDragging(false);
    
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleSliderMove(e.touches[0].clientX);
      }
    };
    
    const handleTouchEnd = () => isDragging && setIsDragging(false);

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleSliderMove]);
  
  const imageStyle: React.CSSProperties = {
    transform: isZoomed ? 'scale(2)' : 'scale(1)',
    transformOrigin: transformOrigin,
    transition: 'transform 0.2s ease-out',
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full aspect-square md:aspect-[4/3] max-w-full mx-auto select-none overflow-hidden rounded-lg shadow-2xl bg-gray-800"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => !isDragging && setIsZoomed(true)}
      onMouseLeave={() => setIsZoomed(false)}
    >
      <img src={afterImage} alt="After" className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none" style={imageStyle} />
      <div 
        className="absolute top-0 left-0 w-full h-full object-contain overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img src={beforeImage} alt="Before" className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none" style={imageStyle}/>
      </div>
      <div 
        className="absolute top-0 h-full w-1 bg-white/50 cursor-ew-resize"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        aria-hidden="true"
      >
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 shadow-md flex items-center justify-center backdrop-blur-sm cursor-ew-resize"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          role="separator"
          aria-valuenow={sliderPosition}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Image comparison slider"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
        </div>
      </div>
    </div>
  );
};

export default ImageComparator;