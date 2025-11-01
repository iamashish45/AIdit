import axios from 'axios';

// Define the base URL for our backend API
const API_URL = 'http://127.0.0.1:8000';

// Create an axios instance
const api = axios.create({
  baseURL: API_URL
});

/**
 * Uploads an image and processes its background.
 * @param {File} imageFile - The image file to process.
 * @param {object} options - The processing options.
 * @param {string} [options.bgColor] - Hex color for solid background.
 * @param {string} [options.bgGradientStart] - Hex color for gradient start.
 * @param {string} [options.bgGradientEnd] - Hex color for gradient end.
 * @param {File} [options.bgImageFile] - Image file for background.
 * @param {function} onUploadProgress - Callback for upload progress.
 * @returns {Promise<Blob>} - A promise that resolves with the processed image blob.
 */
export const processBackground = (imageFile, options = {}, onUploadProgress) => {
  const { bgColor, bgGradientStart, bgGradientEnd, bgImageFile } = options;
  
  const formData = new FormData();
  formData.append("file", imageFile);

  // Add options to FormData only if they are provided
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