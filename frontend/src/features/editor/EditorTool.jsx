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

  // CSS filter slider state (0..100 = slider; 50 neutral)
  const [cssBrightness, setCssBrightness] = useState(50);
  const [cssContrast, setCssContrast] = useState(50);

  // Text tool state
  const [textInput, setTextInput] = useState('');
  const [fontSize, setFontSize] = useState(40);
  const [fontColor, setFontColor] = useState('#000000'); // <- color state
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textAlign, setTextAlign] = useState('center');

  useEffect(() => {
    selectedObjectRef.current = selectedObject;
  }, [selectedObject]);

  const onCanvasReady = useCallback((canvas) => {
    setCanvasInstance(canvas);
    if (!canvas) return;

    if (typeof canvas.on === 'function') {
      canvas.on('selection:created', (e) => setSelectedObject(e.target));
      canvas.on('selection:updated', (e) => setSelectedObject(e.target));
      canvas.on('selection:cleared', () => setSelectedObject(null));
      canvas.on('mouse:dblclick', (e) => {
        const t = e.target;
        if (!t) return;
        if (t.type === 'textbox' || t.type === 'i-text' || t.type === 'text') {
          try { t.enterEditing(); t.selectAll(); } catch (_) {}
        }
      });
    }
  }, []);

  // CSS filters
  const applyCssFiltersToCanvas = useCallback((brightnessSlider, contrastSlider) => {
    try {
      const el = document.getElementById('editor-canvas') || (canvasInstance && (canvasInstance.lowerCanvasEl || canvasInstance.getElement?.()));
      if (!el) return;
      const b = brightnessSlider / 50;
      const c = contrastSlider / 50;
      el.style.filter = `brightness(${b}) contrast(${c})`;
    } catch (e) {
      console.warn('[CSS Filters] apply failed', e);
    }
  }, [canvasInstance]);

  useEffect(() => {
    if (!canvasInstance) return;
    applyCssFiltersToCanvas(cssBrightness, cssContrast);
  }, [canvasInstance, cssBrightness, cssContrast, applyCssFiltersToCanvas]);

  // IMAGE UPLOAD (unchanged robust flow)
  const handleImageUpload = useCallback((file) => {
    if (!file || !canvasInstance) return;
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

        try { fImg.set({ selectable: true, opacity: 1, visible: true, evented: true }); } catch (_) {}

        try { canvasInstance.clear(); } catch (_) {}
        try { canvasInstance.set('backgroundColor', '#f0f0f0'); } catch (_) { canvasInstance.backgroundColor = '#f0f0f0'; }
        try { canvasInstance.calcOffset?.(); } catch (_) {}

        const cW = canvasInstance.getWidth();
        const cH = canvasInstance.getHeight();

        fImg.set({ originX: 'center', originY: 'center' });

        if (typeof fImg.scaleToWidth === 'function') {
          fImg.scaleToWidth(cW);
          const scaledH = (fImg.height || nativeH) * (fImg.scaleY || 1);
          if (scaledH > cH && typeof fImg.scaleToHeight === 'function') {
            fImg.scaleToHeight(cH);
          }
        } else {
          const scale = Math.min(cW / nativeW, cH / nativeH);
          fImg.set({ scaleX: scale, scaleY: scale });
        }

        fImg.set({ left: cW / 2, top: cH / 2 });

        try { canvasInstance.add(fImg); } catch (err) { try { canvasInstance._objects = canvasInstance._objects || []; canvasInstance._objects.push(fImg); } catch (_) {} }

        try { canvasInstance.centerObject(fImg); } catch (_) {}
        try { fImg.setCoords(); } catch (_) {}
        try { canvasInstance.setActiveObject(fImg); } catch (_) {}
        try { canvasInstance.calcOffset?.(); } catch (_) {}
        try { canvasInstance.renderAll(); } catch (_) {}

        setSelectedObject(fImg);
        applyCssFiltersToCanvas(cssBrightness, cssContrast);
        try { URL.revokeObjectURL(objectUrl); } catch (_) {}
      } catch (err) {
        console.error('fabric.Image load error', err);
        try { URL.revokeObjectURL(objectUrl); } catch (_) {}
      }
    };

    imgEl.onerror = (e) => {
      console.error('Image load error', e);
      try { URL.revokeObjectURL(objectUrl); } catch (_) {}
    };

    imgEl.src = objectUrl;
  }, [canvasInstance, applyCssFiltersToCanvas, cssBrightness, cssContrast]);

  // TEXT TOOL: populate sidebar when a text object is selected
  useEffect(() => {
    if (!selectedObject) {
      setTextInput('');
      setFontSize(40);
      setFontColor('#000000');
      setIsBold(false);
      setIsItalic(false);
      setTextAlign('center');
      return;
    }

    if (selectedObject.type === 'textbox' || selectedObject.type === 'i-text' || selectedObject.type === 'text') {
      const o = selectedObject;
      setTextInput(o.text ?? o._text ?? '');
      setFontSize(o.fontSize ?? 40);
      setFontColor(o.fill ?? '#000000'); // populate color from object.fill
      setIsBold((o.fontWeight === 'bold' || o.fontWeight === 700));
      setIsItalic(o.fontStyle === 'italic');
      setTextAlign(o.textAlign ?? 'center');
    } else {
      setTextInput('');
    }
  }, [selectedObject]);

  // add text to canvas (uses current fontColor/fontSize/etc.)
  const addTextToCanvas = useCallback((text, options = {}) => {
    if (!canvasInstance) return;
    const cW = canvasInstance.getWidth();
    const cH = canvasInstance.getHeight();

    const tb = new fabric.Textbox(text || 'New text', {
      left: cW / 2,
      top: cH / 2,
      originX: 'center',
      originY: 'center',
      width: Math.min(400, cW * 0.8),
      fontSize: options.fontSize || fontSize || 40,
      fill: options.fill || fontColor || '#000000', // use fontColor
      fontWeight: options.fontWeight || (isBold ? 'bold' : 'normal'),
      fontStyle: options.fontStyle || (isItalic ? 'italic' : 'normal'),
      textAlign: options.textAlign || textAlign || 'center',
      editable: true,
      selectable: true,
    });

    canvasInstance.add(tb);
    try { canvasInstance.centerObject(tb); } catch (_) {}
    try { tb.setCoords(); } catch (_) {}
    try { canvasInstance.setActiveObject(tb); } catch (_) {}
    try { canvasInstance.renderAll(); } catch (_) {}

    setSelectedObject(tb);
  }, [canvasInstance, fontSize, fontColor, isBold, isItalic, textAlign]);

  // update selected text content
  const updateSelectedText = useCallback((newText) => {
    const obj = selectedObjectRef.current || (canvasInstance && canvasInstance.getActiveObject && canvasInstance.getActiveObject());
    if (!obj) return;
    if (!(obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text')) return;
    try {
      obj.text = newText;
      if (typeof obj.set === 'function') obj.set('text', newText);
      obj.setCoords?.();
      canvasInstance?.renderAll?.();
      setSelectedObject(obj);
    } catch (err) {
      console.warn('updateSelectedText failed', err);
    }
  }, [canvasInstance]);

  // update selected text style (fill/fontSize/fontWeight/fontStyle/textAlign)
  const updateSelectedTextStyle = useCallback((updates = {}) => {
    const obj = selectedObjectRef.current || (canvasInstance && canvasInstance.getActiveObject && canvasInstance.getActiveObject());
    if (!obj) return;
    if (!(obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text')) return;
    try {
      if (typeof updates.fontSize !== 'undefined') obj.set('fontSize', updates.fontSize);
      if (typeof updates.fill !== 'undefined') obj.set('fill', updates.fill);
      if (typeof updates.fontWeight !== 'undefined') obj.set('fontWeight', updates.fontWeight);
      if (typeof updates.fontStyle !== 'undefined') obj.set('fontStyle', updates.fontStyle);
      if (typeof updates.textAlign !== 'undefined') obj.set('textAlign', updates.textAlign);
      obj.setCoords?.();
      canvasInstance?.renderAll?.();
      setSelectedObject(obj);
    } catch (err) {
      console.warn('updateSelectedTextStyle failed', err);
    }
  }, [canvasInstance]);

  // toggle inline edit for selected object
  const toggleInlineEdit = useCallback((obj) => {
    const target = obj || selectedObjectRef.current || (canvasInstance && canvasInstance.getActiveObject && canvasInstance.getActiveObject());
    if (!target) return;
    try {
      if (target.isEditing) {
        target.exitEditing();
        target.setCoords?.();
      } else {
        target.enterEditing();
        try { target.selectAll(); } catch (_) {}
      }
      canvasInstance?.renderAll?.();
    } catch (err) { /* ignore */ }
  }, [canvasInstance]);

  // Slider handlers (CSS filters)
  const handleBrightnessChange = useCallback((sliderValue) => {
    setCssBrightness(sliderValue);
    applyCssFiltersToCanvas(sliderValue, cssContrast);
  }, [applyCssFiltersToCanvas, cssContrast]);

  const handleContrastChange = useCallback((sliderValue) => {
    setCssContrast(sliderValue);
    applyCssFiltersToCanvas(cssBrightness, sliderValue);
  }, [applyCssFiltersToCanvas, cssBrightness]);

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

  // When fontColor changes from sidebar, also update selected text if any
  useEffect(() => {
    // This effect reacts to fontColor state updates and applies them to selected object
    updateSelectedTextStyle({ fill: fontColor });
  }, [fontColor, updateSelectedTextStyle]);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 2, p: 1 }}>
      <Box>
        <EditorSidebar
          onImageUpload={handleImageUpload}
          selectedObject={selectedObject}
          onBrightnessChange={handleBrightnessChange}
          onContrastChange={handleContrastChange}

          // text tool props & handlers
          textInput={textInput}
          setTextInput={(v) => { setTextInput(v); if (selectedObject && (selectedObject.type === 'textbox' || selectedObject.type === 'i-text' || selectedObject.type === 'text')) updateSelectedText(v); }}
          fontSize={fontSize}
          setFontSize={(v) => { setFontSize(v); updateSelectedTextStyle({ fontSize: v }); }}
          fontColor={fontColor}
          setFontColor={(v) => { setFontColor(v); /* effect will apply to selected object */ }}
          isBold={isBold}
          setIsBold={(v) => { setIsBold(v); updateSelectedTextStyle({ fontWeight: v ? 'bold' : 'normal' }); }}
          isItalic={isItalic}
          setIsItalic={(v) => { setIsItalic(v); updateSelectedTextStyle({ fontStyle: v ? 'italic' : 'normal' }); }}
          textAlign={textAlign}
          setTextAlign={(v) => { setTextAlign(v); updateSelectedTextStyle({ textAlign: v }); }}

          addText={() => { addTextToCanvas(textInput, { fontSize, fill: fontColor, fontWeight: isBold ? 'bold' : 'normal', fontStyle: isItalic ? 'italic' : 'normal', textAlign }); }}
          updateText={(newText) => updateSelectedText(newText)}
          toggleInlineEdit={() => { toggleInlineEdit(); }}
        />
      </Box>

      <Box>
        <EditorCanvas onCanvasReady={onCanvasReady} />
      </Box>
    </Box>
  );
}
