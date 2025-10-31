
import { ImageFile } from '../types';

export const fileToImageFile = (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({
        base64,
        mimeType: file.type,
        url: result,
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};
