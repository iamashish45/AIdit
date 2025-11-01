import React, { useState } from 'react';
import { Box, Button, Typography, Alert, LinearProgress, Container } from '@mui/material';
import { UploadFile } from '@mui/icons-material';

import { removeBackground } from '../../services/api';
import PreviewModal from './PreviewModal';

function BackgroundTool() {
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // Handles the file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Create a URL for the original image to preview it
      setOriginalImage(URL.createObjectURL(file));
      // Clear previous results
      setProcessedImage(null);
      setError('');
      // Start the upload and processing
      handleSubmit(file);
    }
  };

  // Handles the API call
  const handleSubmit = async (file) => {
    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Call our API service
      const response = await removeBackground(file, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percent);
      });

      // 'response.data' is a Blob, create a URL for it
      const processedImageUrl = URL.createObjectURL(response.data);
      setProcessedImage(processedImageUrl);
      setModalOpen(true); // Open the preview modal

    } catch (err) {
      console.error(err);
      setError('Image processing failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resets the state
  const handleClear = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setError('');
    setIsLoading(false);
    setUploadProgress(0);
    
    // Revoke Object URLs to free up memory
    if (originalImage) URL.revokeObjectURL(originalImage);
    if (processedImage) URL.revokeObjectURL(processedImage);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{
        border: '2px dashed #999',
        borderRadius: '8px',
        padding: '32px',
        textAlign: 'center',
        mt: 4
      }}>
        <Typography variant="h5" gutterBottom>
          AI Background Remover
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          Upload an image to automatically remove the background.
        </Typography>

        <Box sx={{ my: 3 }}>
          <Button
            variant="contained"
            component="label"
            size="large"
            startIcon={<UploadFile />}
            disabled={isLoading}
          >
            Upload Image
            <input
              type="file"
              hidden
              accept="image/png, image/jpeg"
              onChange={handleFileChange}
            />
          </Button>
        </Box>

        {isLoading && (
          <Box sx={{ width: '100%', my: 2 }}>
            <Typography>Processing... {uploadProgress}%</Typography>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

        {processedImage && !isLoading && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success">Processing complete!</Alert>
            <Button 
              variant="outlined" 
              onClick={handleClear}
              sx={{ mt: 2, mr: 1 }}
            >
              Clear Image
            </Button>
             <Button 
              variant="contained" 
              onClick={() => setModalOpen(true)}
              sx={{ mt: 2 }}
            >
              View Result
            </Button>
          </Box>
        )}
      </Box>

      {/* The Preview Modal */}
      <PreviewModal
        open={modalOpen}
        onClose={handleCloseModal}
        original={originalImage}
        processed={processedImage}
      />
    </Container>
  );
}

export default BackgroundTool;