import React, { useState, useEffect } from 'react';

interface LoadingSpinnerProps {
  messages: string[];
  interval?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ messages, interval = 2500 }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
    }, interval);

    return () => clearInterval(timer);
  }, [messages, interval]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
      <p className="text-lg font-medium text-gray-300 text-center transition-opacity duration-500 ease-in-out">
        {messages[currentMessageIndex]}
      </p>
    </div>
  );
};

export default LoadingSpinner;
