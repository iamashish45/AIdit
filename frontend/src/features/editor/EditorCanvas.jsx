import React, { useRef, useLayoutEffect } from 'react';
import * as fabric from 'fabric';
import { Box } from '@mui/material';

export default function EditorCanvas({ onCanvasReady }) {
  const containerRef = useRef(null);
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const canvasEl = canvasElRef.current;
    if (!container || !canvasEl) return;

    // Make the <canvas> fill the container visually (CSS)
    canvasEl.style.width = '100%';
    canvasEl.style.height = '100%';
    canvasEl.style.display = 'block';

    // Give the raw canvas a stable id so other code can target it
    canvasEl.id = 'editor-canvas';

    const rect = container.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = Math.max(1, Math.floor(rect.height));

    // Create Fabric canvas using the actual element (v4)
    const canvas = new fabric.Canvas(canvasEl, {
      width: cssW,
      height: cssH,
      backgroundColor: '#f0f0f0',
      preserveObjectStacking: true,
    });

    // Ensure Fabric's visible canvas element has the correct id (in case Fabric wraps it)
    try {
      if (canvas.lowerCanvasEl) {
        canvas.lowerCanvasEl.id = 'editor-canvas';
      }
    } catch (e) {
      // ignore
    }

    // Set DOM pixel size to match CSS * DPR for crisp, correctly placed drawings
    try {
      const DPR = window.devicePixelRatio || 1;
      const el = canvas.lowerCanvasEl || canvas.upperCanvasEl || canvas.getElement?.();
      if (el) {
        el.style.width = `${cssW}px`;
        el.style.height = `${cssH}px`;
        el.width = Math.floor(cssW * DPR);
        el.height = Math.floor(cssH * DPR);
        const ctx = el.getContext && el.getContext('2d');
        if (ctx && typeof ctx.setTransform === 'function') ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
    } catch (e) {
      console.warn('[EditorCanvas] set pixel size failed', e);
    }

  fabricRef.current = canvas;
// add this single debug line (temporary)
window.__fabricCanvas = canvas;


    // Notify parent
    if (typeof onCanvasReady === 'function') {
      try {
        onCanvasReady(canvas);
      } catch (err) {
        console.warn('[EditorCanvas] onCanvasReady threw', err);
      }
    }

    // Ensure offsets and initial render
    try { canvas.calcOffset?.(); } catch (_) {}
    try { canvas.renderAll?.(); } catch (_) {}

    return () => {
      try { canvas.dispose(); } catch (_) {}
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box ref={containerRef} sx={{ width: '100%', height: '80vh', border: '1px solid #ccc', boxSizing: 'border-box' }}>
      <canvas ref={canvasElRef} />
    </Box>
  );
}
