import React, { useState } from 'react';
import { Box, Button, Typography, Alert, LinearProgress, Container, Paper } from '@mui/material';
import { UploadFile, AutoFixHigh, Clear } from '@mui/icons-material';

// Import the NEW API service
import { enhanceImage } from '../../services/api';
// We re-use the same PreviewModal component!
import PreviewModal from '../backgroundRemover/PreviewModal';

function EnhancerTool() {
  const [originalFile, setOriginalFile] = useState(null);
  const [originalImageURL, setOriginalImageURL] = useState(null);
  const [processedImageURL, setProcessedImageURL] = useState(null);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // Handles the file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleClear(); // Clear previous state
      setOriginalFile(file);
      setOriginalImageURL(URL.createObjectURL(file));
    }
  };

  // Handles the API call
  const handleSubmit = async () => {
    if (!originalFile) {
      setError('Please upload an image first.');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    setError('');

    try {
      // Call our new API service
      const response = await enhanceImage(originalFile, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percent);
      });

      const processedUrl = URL.createObjectURL(response.data);
      setProcessedImageURL(processedUrl);
      setModalOpen(true);

    } catch (err) {
      console.error(err);
      setError('Image processing failed. The model is heavy, please try a smaller image or try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resets everything
  const handleClear = () => {
    setOriginalFile(null);
    setError('');
    setIsLoading(false);
    setUploadProgress(0);
    
    if (originalImageURL) URL.revokeObjectURL(originalImageURL);
    if (processedImageURL) URL.revokeObjectURL(processedImageURL);
    
    setOriginalImageURL(null);
    setProcessedImageURL(null);
  };
  
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
        <Typography variant="h5" gutterBottom>
          AI Image Enhancer (4x)
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Upload a small or low-quality image to enhance and upscale it up to 4x its original size.
        </Typography>
        
        {/* --- 1. UPLOAD STEP --- */}
        {!originalFile && (
          <Box sx={{ border: '2px dashed #999', borderRadius: '8px', p: 4, textAlign: 'center' }}>
            <Button variant="contained" component="label" size="large" startIcon={<UploadFile />} disabled={isLoading}>
              Upload Image
              <input type="file" hidden accept="image/png, image/jpeg" onChange={handleFileChange} />
            </Button>
          </Box>
        )}

        {/* --- 2. PROCESS STEP --- */}
        {originalFile && (
          <Box>
            <Typography variant="h6">Preview</Typography>
            <Box sx={{ border: '1px solid #444', borderRadius: 1, p: 1, height: 300, display: 'flex', mb: 2 }}>
              <img src={originalImageURL} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </Box>
            
            <Button 
              variant="outlined" 
              size="medium" 
              onClick={handleClear} 
              startIcon={<Clear />}
              sx={{ mr: 1 }}
              disabled={isLoading}
            >
              Clear Image
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleSubmit}
              disabled={isLoading}
              startIcon={<AutoFixHigh />}
            >
              {isLoading ? `Enhancing... ${uploadProgress}%` : 'Enhance Image'}
            </Button>
          </Box>
        )}

        {isLoading && (
          <Box sx={{ width: '100%', my: 2 }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
      </Paper>

      {/* The Preview Modal */}
      <PreviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        original={originalImageURL}
        processed={processedImageURL}
      />
    </Container>
  );
}

export default EnhancerTool;