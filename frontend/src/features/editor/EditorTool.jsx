// src/features/editor/EditorTool.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import * as fabric from 'fabric';

import EditorSidebar from './EditorSidebar';
import EditorCanvas from './EditorCanvas';

export default function EditorTool() {
  const [canvasInstance, setCanvasInstance] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const selectedObjectRef = useRef(null);

  // CSS filter slider state (0..100, 50 = neutral)
  const [cssBrightness, setCssBrightness] = useState(50);
  const [cssContrast, setCssContrast] = useState(50);

  useEffect(() => {
    selectedObjectRef.current = selectedObject;
  }, [selectedObject]);

  // canvas ready callback
  const onCanvasReady = useCallback((canvas) => {
    setCanvasInstance(canvas);

    if (!canvas) return;

    if (typeof canvas.on === 'function') {
      canvas.on('selection:created', (e) => setSelectedObject(e.target));
      canvas.on('selection:updated', (e) => setSelectedObject(e.target));
      canvas.on('selection:cleared', () => setSelectedObject(null));
    }
  }, []);

  // -------------------------
  // CSS FILTERS (define before handlers so hooks see the dependency)
  // -------------------------
  const applyCssFiltersToCanvas = useCallback(
    (brightnessSlider, contrastSlider) => {
      try {
        const el =
          document.getElementById('editor-canvas') ||
          (canvasInstance &&
            (canvasInstance.lowerCanvasEl ||
              canvasInstance.getElement?.()));
        if (!el) return;

        const b = brightnessSlider / 50; // 50→1
        const c = contrastSlider / 50; // 50→1

        el.style.filter = `brightness(${b}) contrast(${c})`;
      } catch (e) {
        console.warn('[CSS Filters] apply failed', e);
      }
    },
    [canvasInstance]
  );

  // initialize CSS filter when canvas is ready or slider values change
  useEffect(() => {
    if (!canvasInstance) return;
    applyCssFiltersToCanvas(cssBrightness, cssContrast);
  }, [canvasInstance, cssBrightness, cssContrast, applyCssFiltersToCanvas]);

  // -------------------------
  // IMAGE UPLOAD (objectURL -> native Image -> fabric.Image)
  // -------------------------
  const handleImageUpload = useCallback(
    (file) => {
      if (!file) {
        console.warn('[ET] no file provided');
        return;
      }
      if (!canvasInstance) {
        console.warn('[ET] canvas not ready');
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const imgEl = new Image();
      imgEl.crossOrigin = 'anonymous';

      imgEl.onload = () => {
        try {
          const fImg = new fabric.Image(imgEl);

          fImg.filters = fImg.filters || [];
          const nativeW = imgEl.naturalWidth || fImg.width || 1;
          const nativeH = imgEl.naturalHeight || fImg.height || 1;
          fImg._origW = nativeW;
          fImg._origH = nativeH;

          try {
            fImg.set({
              selectable: true,
              opacity: 1,
              visible: true,
              evented: true,
            });
          } catch (_) {}

          try {
            canvasInstance.clear();
          } catch (_) {}

          try {
            canvasInstance.set('backgroundColor', '#f0f0f0');
          } catch (_) {
            canvasInstance.backgroundColor = '#f0f0f0';
          }

          try {
            canvasInstance.calcOffset?.();
          } catch (_) {}

          const cW = canvasInstance.getWidth();
          const cH = canvasInstance.getHeight();

          fImg.set({ originX: 'center', originY: 'center' });

          if (typeof fImg.scaleToWidth === 'function') {
            fImg.scaleToWidth(cW);
            const scaledH =
              (fImg.height || nativeH) * (fImg.scaleY || 1);
            if (scaledH > cH && typeof fImg.scaleToHeight === 'function') {
              fImg.scaleToHeight(cH);
            }
          } else {
            const scale = Math.min(cW / nativeW, cH / nativeH);
            fImg.set({ scaleX: scale, scaleY: scale });
          }

          fImg.set({ left: cW / 2, top: cH / 2 });

          try {
            canvasInstance.add(fImg);
          } catch (err) {
            console.warn('[ET] add failed fallback', err);
            try {
              canvasInstance._objects = canvasInstance._objects || [];
              canvasInstance._objects.push(fImg);
            } catch (_) {}
          }

          try {
            canvasInstance.centerObject(fImg);
          } catch (_) {}

          try {
            fImg.setCoords();
          } catch (_) {}

          try {
            canvasInstance.setActiveObject(fImg);
          } catch (_) {}

          try {
            canvasInstance.calcOffset?.();
          } catch (_) {}

          try {
            canvasInstance.renderAll();
          } catch (_) {}

          setSelectedObject(fImg);

          // Apply CSS filters to newly added image
          applyCssFiltersToCanvas(cssBrightness, cssContrast);

          try {
            URL.revokeObjectURL(objectUrl);
          } catch (_) {}
        } catch (err) {
          console.error('fabric.Image load error', err);
          try {
            URL.revokeObjectURL(objectUrl);
          } catch (_) {}
        }
      };

      imgEl.onerror = (e) => {
        console.error('Image load error', e);
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (_) {}
      };

      imgEl.src = objectUrl;
    },
    [canvasInstance, applyCssFiltersToCanvas, cssBrightness, cssContrast]
  );

  // -------------------------
  // Slider handlers (now include applyCssFiltersToCanvas in deps)
  // -------------------------
  const handleBrightnessChange = useCallback(
    (sliderValue) => {
      setCssBrightness(sliderValue);
      applyCssFiltersToCanvas(sliderValue, cssContrast);
    },
    [applyCssFiltersToCanvas, cssContrast]
  );

  const handleContrastChange = useCallback(
    (sliderValue) => {
      setCssContrast(sliderValue);
      applyCssFiltersToCanvas(cssBrightness, sliderValue);
    },
    [applyCssFiltersToCanvas, cssBrightness]
  );

  // keep selection state in sync
  useEffect(() => {
    if (!canvasInstance) return undefined;

    const onSel = (e) => setSelectedObject(e?.target ?? null);

    canvasInstance.on('selection:created', onSel);
    canvasInstance.on('selection:updated', onSel);
    canvasInstance.on('selection:cleared', () => setSelectedObject(null));

    return () => {
      canvasInstance.off('selection:created', onSel);
      canvasInstance.off('selection:updated', onSel);
    };
  }, [canvasInstance]);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
        gap: 2,
        p: 1,
      }}
    >
      <Box>
        <EditorSidebar
          onImageUpload={handleImageUpload}
          selectedObject={selectedObject}
          onBrightnessChange={handleBrightnessChange}
          onContrastChange={handleContrastChange}
        />
      </Box>

      <Box>
        <EditorCanvas onCanvasReady={onCanvasReady} />
      </Box>
    </Box>
  );
}
