import axios from 'axios';

// Define the base URL for our backend API
const API_URL = 'http://127.0.0.1:8000';

// Create an axios instance
const api = axios.create({
  baseURL: API_URL
});

/**
 * Uploads an image and processes its background.
 * (This function is from Phase 2, no changes needed)
 */
export const processBackground = (imageFile, options = {}, onUploadProgress) => {
  const { bgColor, bgGradientStart, bgGradientEnd, bgImageFile } = options;
  
  const formData = new FormData();
  formData.append("file", imageFile);

  if (bgColor) formData.append("bg_color", bgColor);
  if (bgGradientStart) formData.append("bg_gradient_start", bgGradientStart);
  if (bgGradientEnd) formData.append("bg_gradient_end", bgGradientEnd);
  if (bgImageFile) formData.append("bg_image", bgImageFile);

  return api.post('/api/tools/process-background', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress,
    responseType: 'blob'
  });
};

/**
 * NEW: Uploads an image and gets the enhanced/upscaled version.
 * @param {File} imageFile - The image file to process.
 * @param {function} onUploadProgress - Callback for upload progress.
 * @returns {Promise<Blob>} - A promise that resolves with the processed image blob.
 */
export const enhanceImage = (imageFile, onUploadProgress) => {
  const formData = new FormData();
  formData.append("file", imageFile);

  return api.post('/api/tools/enhance-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress,
    responseType: 'blob'
  });
};