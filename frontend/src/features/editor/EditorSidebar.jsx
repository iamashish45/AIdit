import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { UploadFile } from '@mui/icons-material';

function EditorSidebar({ onImageUpload }) {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImageUpload(file);
    }
    e.target.value = null; // allow re-uploading the same file
  };

  return (
    <Paper
      elevation={3}
      sx={{ width: '100%', height: '100%', p: 2, overflowY: 'auto' }}
    >
      <Typography variant="h6" gutterBottom>
        Controls
      </Typography>
      <Box>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadFile />}
          fullWidth
        >
          Upload Base Image
          <input
            type="file"
            hidden
            accept="image/png, image/jpeg"
            onChange={handleFileChange}
          />
        </Button>
      </Box>
    </Paper>
  );
}

export default EditorSidebar;
