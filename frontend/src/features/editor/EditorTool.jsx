import React, { useState } from 'react';
import { Box } from '@mui/material';
import * as fabric from 'fabric';

import EditorSidebar from './EditorSidebar';
import EditorCanvas from './EditorCanvas';

function EditorTool() {
  const [canvasInstance, setCanvasInstance] = useState(null);

  const handleImageUpload = async (file) => {
    if (!canvasInstance) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      const imageUrl = e.target.result;

      console.log('Canvas instance:', canvasInstance);
      console.log('Image URL length:', imageUrl.length);

      try {
        // ✅ Use async/await form — stable for Fabric v6+
        const img = await fabric.Image.fromURL(imageUrl, {
          crossOrigin: 'anonymous',
        });

        console.log('✅ Image loaded successfully:', img.width, 'x', img.height);

        // Scale to fit canvas
        const scale = Math.min(
          canvasInstance.width / img.width,
          canvasInstance.height / img.height
        );

        img.set({
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
        });

        canvasInstance.clear();
        canvasInstance.add(img);
        canvasInstance.centerObject(img);
        canvasInstance.renderAll();

        console.log('✅ Image rendered on canvas');
      } catch (err) {
        console.error('❌ Error loading image:', err);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        height: '80vh',
      }}
    >
      {/* Sidebar */}
      <Box sx={{ width: { xs: '100%', md: '25%' }, height: '100%' }}>
        <EditorSidebar onImageUpload={handleImageUpload} />
      </Box>

      {/* Canvas */}
      <Box sx={{ flexGrow: 1, height: '100%' }}>
        <EditorCanvas onCanvasReady={setCanvasInstance} />
      </Box>
    </Box>
  );
}

export default EditorTool;
