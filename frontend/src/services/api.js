import axios from 'axios';

// Define the base URL for our backend API
const API_URL = 'http://127.0.0.1:8000';

// Create an axios instance
const api = axios.create({
  baseURL: API_URL
});

/**
 * Uploads an image and gets the background-removed version.
 * @param {File} imageFile - The image file to process.
 * @param {function} onUploadProgress - Callback for upload progress.
 * @returns {Promise<Blob>} - A promise that resolves with the processed image blob.
 */
export const removeBackground = (imageFile, onUploadProgress) => {
  // We use FormData to send a file
  const formData = new FormData();
  formData.append("file", imageFile);

  return api.post('/api/tools/remove-background', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    // This is crucial for getting progress events
    onUploadProgress,
    // This is crucial for receiving an image/file back from the server
    responseType: 'blob'
  });
};