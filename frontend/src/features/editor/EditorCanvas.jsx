import React, { useRef, useEffect } from 'react';
import { Canvas } from 'fabric';
import { Box } from '@mui/material';

function EditorCanvas({ onCanvasReady }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = new Canvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: '#f0f0f0',
    });

    onCanvasReady(canvas);

    let resizeFrame;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width !== canvas.getWidth() || height !== canvas.getHeight()) {
          canvas.setWidth(width);
          canvas.setHeight(height);
          canvas.renderAll();
        }
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
    };
  }, [onCanvasReady]);

  return (
    <Box
      ref={containerRef}
      sx={{ width: '100%', height: '80vh', minHeight: 400 }}
    >
      <canvas ref={canvasRef} />
    </Box>
  );
}

export default EditorCanvas;
