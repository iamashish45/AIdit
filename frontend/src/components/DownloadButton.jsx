import React, { useState } from 'react';
import { Box, Button, CircularProgress, Typography, ButtonGroup } from '@mui/material';
import { Download } from '@mui/icons-material';

/**
 * A helper function to create a download link for a data URL.
 */
function triggerDownload(dataUrl, fileName) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * A helper function to resize an image from a blob/data URL.
 * @param {string} imageUrl - The blob or data URL of the image.
 * @param {number} targetWidth - The desired output width (e.g., 720).
 * @returns {Promise<string>} - A promise that resolves with the data URL of the resized image.
 */
function resizeImage(imageUrl, targetWidth) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const originalWidth = img.width;
      const originalHeight = img.height;
      
      // Calculate new height to maintain aspect ratio
      const scaleFactor = targetWidth / originalWidth;
      const targetHeight = originalHeight * scaleFactor;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Resolve with the new data URL
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = imageUrl;
  });
}

/**
 * This component renders 360px and 720px download buttons.
 * It can accept either a blob URL (from BG/Enhancer tools) or a Fabric.js canvas instance.
 */
function DownloadButton({ source, fileName = "aidit-export.png" }) {
  const [isLoading, setIsLoading] = useState(null); // '360', '720', or null

  const handleDownload = async (targetWidth) => {
    if (!source) return;
    
    const size = targetWidth.toString();
    setIsLoading(size);

    try {
      let dataUrl;
      const downloadFileName = `${fileName.split('.')[0]}-${size}px.png`;
      
      // --- Case 1: Source is a Fabric.js canvas instance ---
      if (typeof source === 'object' && source.toDataURL) {
        const fabricCanvas = source;
        const scaleFactor = targetWidth / fabricCanvas.width;
        dataUrl = fabricCanvas.toDataURL({
          format: 'png',
          multiplier: scaleFactor,
        });
      } 
      // --- Case 2: Source is a blob URL (string) ---
      else if (typeof source === 'string') {
        dataUrl = await resizeImage(source, targetWidth);
      } 
      else {
        throw new Error("Invalid download source");
      }
      
      triggerDownload(dataUrl, downloadFileName);

    } catch (err) {
      console.error(`Failed to download ${size}px:`, err);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h6" gutterBottom>Download</Typography>
      <ButtonGroup variant="outlined" aria-label="download buttons">
        <Button
          startIcon={isLoading === '360' ? <CircularProgress size={20} /> : <Download />}
          onClick={() => handleDownload(360)}
          disabled={!!isLoading}
        >
          360px
        </Button>
        <Button
          startIcon={isLoading === '720' ? <CircularProgress size={20} /> : <Download />}
          onClick={() => handleDownload(720)}
          disabled={!!isLoading}
        >
          720px
        </Button>
      </ButtonGroup>
    </Box>
  );
}

export default DownloadButton;