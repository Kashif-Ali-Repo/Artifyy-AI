
import React from 'react';

const LoadingSpinner: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
      <p className="text-lg font-medium text-gray-300">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
