import React from 'react';
import { Modal, Box, Typography, Grid, Button } from '@mui/material';

// Style for the modal box
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: 800,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  textAlign: 'center',
};

const imageContainerStyle = {
  border: '1px dashed grey',
  padding: '8px',
  borderRadius: '4px',
};

const imgStyle = {
  width: '100%',
  height: 'auto',
  maxHeight: '60vh',
  objectFit: 'contain',
};

function PreviewModal({ open, onClose, original, processed }) {
  
  const handleDownload = () => {
    // This creates a temporary link to download the processed image blob
    const link = document.createElement('a');
    link.href = processed; // 'processed' is a blob URL
    link.setAttribute('download', 'aidit-processed.png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h5" component="h2" gutterBottom>
          Preview Result
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Original</Typography>
            <Box sx={imageContainerStyle}>
              <img src={original} alt="Original" style={imgStyle} />
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Background Removed</Typography>
            <Box sx={imageContainerStyle}>
              <img src={processed} alt="Processed" style={imgStyle} />
            </Box>
          </Grid>
        </Grid>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleDownload}
          sx={{ mt: 3, mr: 1 }}
        >
          Download Processed
        </Button>
        <Button 
          variant="outlined" 
          onClick={onClose}
          sx={{ mt: 3 }}
        >
          Close
        </Button>
      </Box>
    </Modal>
  );
}

export default PreviewModal;