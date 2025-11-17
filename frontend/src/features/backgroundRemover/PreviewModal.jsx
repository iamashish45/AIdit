import React from 'react';
import { Modal, Box, Typography, Button } from '@mui/material'; // Removed 'Grid'
import DownloadButton from '../../components/DownloadButton'; // NEW: Import

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
  height: '60vh', // Fixed height for comparison
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const imgStyle = {
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
};

function PreviewModal({ open, onClose, original, processed }) {
  
  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h5" component="h2" gutterBottom>
          Preview Result
        </Typography>
        
        {/* --- CSS GRID FIX --- */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
          gap: 2 
        }}>
          <Box>
            <Typography variant="h6">Original</Typography>
            <Box sx={imageContainerStyle}>
              <img src={original} alt="Original" style={imgStyle} />
            </Box>
          </Box>
          <Box>
            <Typography variant="h6">Result</Typography>
            <Box sx={imageContainerStyle}>
              <img src={processed} alt="Processed" style={imgStyle} />
            </Box>
          </Box>
        </Box>
        {/* --- END FIX --- */}

        {/* --- NEW: Download Button Component --- */}
        {/* We pass the 'processed' blob URL as the source */}
        <DownloadButton source={processed} fileName="aidit-export.png" />
        {/* --- END NEW --- */}

        <Button 
          variant="outlined" 
          onClick={onClose}
          sx={{ mt: 1 }}
        >
          Close
        </Button>
      </Box>
    </Modal>
  );
}

export default PreviewModal;