import React, { useState } from 'react';
import { Box, Button, Typography, Alert, LinearProgress, Container, Paper, ToggleButtonGroup, ToggleButton, Grid, Divider } from '@mui/material';
import { UploadFile, ColorLens, Gradient, Photo, AutoFixNormal, Clear } from '@mui/icons-material';
import { SketchPicker } from 'react-color';

// Import our updated API service
import { processBackground } from '../../services/api';
import PreviewModal from './PreviewModal';

// --- Helper Component for Color Picker Popover ---
// This makes the color picker less intrusive
const ColorPickerPopover = ({ color, onChange }) => {
  const [displayPicker, setDisplayPicker] = useState(false);

  const handleClick = () => setDisplayPicker(!displayPicker);
  const handleClose = () => setDisplayPicker(false);
  const handleChange = (color) => onChange(color.hex);

  const popover = {
    position: 'absolute',
    zIndex: '2',
  };
  const cover = {
    position: 'fixed',
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px',
  };
  const swatchStyle = {
    width: '100px',
    height: '24px',
    borderRadius: '2px',
    border: '1px solid #ccc',
    background: color,
    cursor: 'pointer'
  };

  return (
    <div>
      <Box sx={swatchStyle} onClick={handleClick} />
      {displayPicker ? (
        <Box sx={popover}>
          <Box sx={cover} onClick={handleClose} />
          <SketchPicker color={color} onChange={handleChange} />
        </Box>
      ) : null}
    </div>
  );
};
// --- End Helper Component ---

function BackgroundTool() {
  const [originalFile, setOriginalFile] = useState(null);
  const [originalImageURL, setOriginalImageURL] = useState(null);
  const [processedImageURL, setProcessedImageURL] = useState(null);
  
  const [mode, setMode] = useState('remove'); // 'remove', 'color', 'gradient', 'image'
  
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [gradientStart, setGradientStart] = useState('#FF0000');
  const [gradientEnd, setGradientEnd] = useState('#0000FF');
  const [bgImageFile, setBgImageFile] = useState(null);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // Handles the MAIN image selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleClear(); // Clear previous state first
      setOriginalFile(file);
      setOriginalImageURL(URL.createObjectURL(file));
    }
  };

  // Handles the BACKGROUND image selection
  const handleBgImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setBgImageFile(file);
    }
  };

  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setMode(newMode);
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

    // Build the options object based on the current mode
    const options = {};
    if (mode === 'color') {
      options.bgColor = bgColor;
    } else if (mode === 'gradient') {
      options.bgGradientStart = gradientStart;
      options.bgGradientEnd = gradientEnd;
    } else if (mode === 'image') {
      if (!bgImageFile) {
        setError('Please upload a background image.');
        setIsLoading(false);
        return;
      }
      options.bgImageFile = bgImageFile;
    }
    // 'remove' mode sends no options

    try {
      const response = await processBackground(originalFile, options, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percent);
      });

      const processedUrl = URL.createObjectURL(response.data);
      setProcessedImageURL(processedUrl);
      setModalOpen(true);

    } catch (err) {
      console.error(err);
      setError('Image processing failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resets everything
  const handleClear = () => {
    setOriginalFile(null);
    setBgImageFile(null);
    setError('');
    setIsLoading(false);
    setUploadProgress(0);
    
    if (originalImageURL) URL.revokeObjectURL(originalImageURL);
    if (processedImageURL) URL.revokeObjectURL(processedImageURL);
    
    setOriginalImageURL(null);
    setProcessedImageURL(null);
  };
  
  const renderControls = () => {
    switch (mode) {
      case 'color':
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>Select a color:</Typography>
            <ColorPickerPopover color={bgColor} onChange={setBgColor} />
          </Box>
        );
      case 'gradient':
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item>
                <Typography variant="body2" gutterBottom>Start:</Typography>
                <ColorPickerPopover color={gradientStart} onChange={setGradientStart} />
              </Grid>
              <Grid item>
                <Typography variant="body2" gutterBottom>End:</Typography>
                <ColorPickerPopover color={gradientEnd} onChange={setGradientEnd} />
              </Grid>
            </Grid>
          </Box>
        );
      case 'image':
        return (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFile />}
              disabled={isLoading}
            >
              Upload Background
              <input type="file" hidden accept="image/png, image/jpeg" onChange={handleBgImageChange} />
            </Button>
            {bgImageFile && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {bgImageFile.name}
              </Typography>
            )}
          </Box>
        );
      case 'remove':
      default:
        return (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            This will remove the background and leave it transparent.
          </Typography>
        );
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
        <Typography variant="h5" gutterBottom>
          AI Background Remover & Replacer
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

        {/* --- 2. CONFIGURE & PROCESS STEP --- */}
        {originalFile && (
          <Grid container spacing={3}>
            {/* Original Image Preview */}
            <Grid item xs={12} md={5}>
              <Typography variant="h6">Original</Typography>
              <Box sx={{ border: '1px solid #444', borderRadius: 1, p: 1, height: 300, display: 'flex' }}>
                <img src={originalImageURL} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </Box>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={handleClear} 
                startIcon={<Clear />}
                sx={{ mt: 1 }}
              >
                Clear Image
              </Button>
            </Grid>

            {/* Controls */}
            <Grid item xs={12} md={7}>
              <Typography variant="h6">Background Options</Typography>
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={handleModeChange}
                aria-label="Background Mode"
                size="small"
                color="primary"
                sx={{ mb: 2 }}
              >
                <ToggleButton value="remove" aria-label="remove background"><AutoFixNormal sx={{mr: 1}} /> Remove</ToggleButton>
                <ToggleButton value="color" aria-label="solid color"><ColorLens sx={{mr: 1}} /> Color</ToggleButton>
                <ToggleButton value="gradient" aria-label="gradient"><Gradient sx={{mr: 1}} /> Gradient</ToggleButton>
                <ToggleButton value="image" aria-label="custom image"><Photo sx={{mr: 1}} /> Image</ToggleButton>
              </ToggleButtonGroup>
              
              <Divider />
              
              {renderControls()}

              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleSubmit}
                disabled={isLoading}
                sx={{ mt: 3 }}
              >
                {isLoading ? 'Processing...' : 'Process Image'}
              </Button>
            </Grid>
          </Grid>
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

export default BackgroundTool;