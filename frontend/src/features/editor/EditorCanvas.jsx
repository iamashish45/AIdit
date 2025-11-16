import React, { useRef, useLayoutEffect } from 'react';
import * as fabric from 'fabric';
import { Box } from '@mui/material';

export default function EditorCanvas({ onCanvasReady }) {
  const containerRef = useRef(null);
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);
  const resizeObserverRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const canvasEl = canvasElRef.current;
    if (!container || !canvasEl) return;

    canvasEl.style.width = '100%';
    canvasEl.style.height = '100%';
    canvasEl.style.display = 'block';
    canvasEl.id = 'editor-canvas';

    const rect = container.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = Math.max(1, Math.floor(rect.height));

    const canvas = new fabric.Canvas(canvasEl, {
      width: cssW,
      height: cssH,
      backgroundColor: '#f0f0f0',
      preserveObjectStacking: true,
      enableRetinaScaling: false,
      renderOnAddRemove: false,
    });

    try {
      const el = canvas.lowerCanvasEl || canvas.upperCanvasEl || canvas.getElement?.();
      if (el) {
        el.style.width = `${cssW}px`;
        el.style.height = `${cssH}px`;
        el.width = cssW;
        el.height = cssH;
        const ctx = el.getContext && el.getContext('2d');
        if (ctx && typeof ctx.setTransform === 'function') ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    } catch (e) { /* ignore */ }

    fabricRef.current = canvas;

    if (typeof onCanvasReady === 'function') {
      try { onCanvasReady(canvas); } catch (_) {}
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      window.requestAnimationFrame(() => {
        const { width, height } = entry.contentRect;
        canvas.setWidth(Math.max(1, Math.floor(width)));
        canvas.setHeight(Math.max(1, Math.floor(height)));
        try { canvas.calcOffset?.(); } catch (_) {}
        try { canvas.renderAll?.(); } catch (_) {}
      });
    });
    ro.observe(container);
    resizeObserverRef.current = ro;

    return () => {
      try { ro.disconnect(); } catch (_) {}
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
