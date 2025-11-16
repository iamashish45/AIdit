// src/features/editor/EditorTool.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import * as fabric from 'fabric';

import EditorSidebar from './EditorSidebar';
import EditorCanvas from './EditorCanvas';

export default function EditorTool({ pixabayKey: propPixabayKey } = {}) {
  const [canvasInstance, setCanvasInstance] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const selectedObjectRef = useRef(null);

  // CSS filter slider state (0-100)
  const [cssBrightness, setCssBrightness] = useState(50);
  const [cssContrast, setCssContrast] = useState(50);

  // Text tool state
  const [textInput, setTextInput] = useState('');
  const [fontSize, setFontSize] = useState(40);
  const [fontColor, setFontColor] = useState('#000000');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textAlign, setTextAlign] = useState('center');

  // Undo / redo stacks
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);

  // Pixabay state
  const [pixabayResults, setPixabayResults] = useState([]);
  const [pixabayLoading, setPixabayLoading] = useState(false);
  const [pixabayError, setPixabayError] = useState(null);
  const pixabayAbortRef = useRef(null);

  // Use prop -> env -> hardcoded fallback (your provided key)
  const pixabayKey = propPixabayKey || process.env.REACT_APP_PIXABAY_KEY || '53270247-aef2cd84e1e877abd1580c8ea';

  // RAF refs for throttling
  const rafRef = useRef(null);
  const cssFilterRafRef = useRef(null);
  const fabricFilterRafRef = useRef(null);

  useEffect(() => { selectedObjectRef.current = selectedObject; }, [selectedObject]);

  // -----------------------------
  // Canvas ready callback & listeners
  // -----------------------------
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

      canvas.on('object:added', (e) => {
        const obj = e.target;
        if (!obj) return;
        if (obj._userAdded) {
          undoStackRef.current.push({ type: 'add', obj });
          redoStackRef.current = [];
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) { window.cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (cssFilterRafRef.current) { window.cancelAnimationFrame(cssFilterRafRef.current); cssFilterRafRef.current = null; }
      if (fabricFilterRafRef.current) { window.cancelAnimationFrame(fabricFilterRafRef.current); fabricFilterRafRef.current = null; }
      if (pixabayAbortRef.current) { try { pixabayAbortRef.current.abort(); } catch (_) {} pixabayAbortRef.current = null; }
    };
  }, []);

  const safeRender = useCallback(() => {
    if (!canvasInstance) return;
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      try { canvasInstance.renderAll(); } catch (_) {}
    });
  }, [canvasInstance]);

  // -----------------------------
  // CSS preview filters (fast preview)
  // -----------------------------
  const applyCssFiltersToCanvas = useCallback((brightnessSlider, contrastSlider) => {
    try {
      const el =
        document.getElementById('editor-canvas') ||
        (canvasInstance && (canvasInstance.lowerCanvasEl || canvasInstance.getElement?.()));
      if (!el) return;
      const b = (brightnessSlider || 50) / 50;
      const c = (contrastSlider || 50) / 50;
      el.style.filter = `brightness(${b}) contrast(${c})`;
    } catch (_) { /* ignore */ }
  }, [canvasInstance]);

  useEffect(() => {
    if (!canvasInstance) return;
    applyCssFiltersToCanvas(cssBrightness, cssContrast);
  }, [canvasInstance, cssBrightness, cssContrast, applyCssFiltersToCanvas]);

  // -----------------------------
  // Downscale helper (uses createImageBitmap/OffscreenCanvas when available)
  // -----------------------------
  const downscaleFileToDataUrl = useCallback(async (file, maxSide = 1600) => {
    try {
      const blob = file;
      if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(blob);
        const iw = bitmap.width;
        const ih = bitmap.height;
        const scale = Math.min(1, maxSide / Math.max(iw, ih));
        if (scale >= 1) {
          return await new Promise((res) => {
            const r = new FileReader();
            r.onload = (ev) => res(ev.target?.result);
            r.onerror = () => res(null);
            r.readAsDataURL(blob);
          });
        }
        const cw = Math.max(1, Math.round(iw * scale));
        const ch = Math.max(1, Math.round(ih * scale));
        if (typeof OffscreenCanvas === 'function') {
          try {
            const oc = new OffscreenCanvas(cw, ch);
            const ctx = oc.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, iw, ih, 0, 0, cw, ch);
            const outBlob = await oc.convertToBlob({ type: 'image/png', quality: 0.9 });
            return await new Promise((res) => {
              const r = new FileReader();
              r.onload = (ev) => res(ev.target?.result);
              r.onerror = () => res(null);
              r.readAsDataURL(outBlob);
            });
          } catch (err) { /* fallback */ }
        }
        return await new Promise((resolve) => {
          setTimeout(() => {
            try {
              const c = document.createElement('canvas');
              c.width = cw;
              c.height = ch;
              const ctx = c.getContext('2d');
              ctx.drawImage(bitmap, 0, 0, iw, ih, 0, 0, cw, ch);
              resolve(c.toDataURL('image/png', 0.9));
            } catch (err) {
              const fr = new FileReader();
              fr.onload = (ev) => resolve(ev.target?.result);
              fr.onerror = () => resolve(null);
              fr.readAsDataURL(blob);
            }
          }, 8);
        });
      }
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result;
          const img = new Image();
          img.onload = () => {
            const iw = img.naturalWidth || img.width;
            const ih = img.naturalHeight || img.height;
            const scale = Math.min(1, maxSide / Math.max(iw, ih));
            if (scale >= 1) return resolve(dataUrl);
            const cw = Math.max(1, Math.round(iw * scale));
            const ch = Math.max(1, Math.round(ih * scale));
            setTimeout(() => {
              try {
                const c = document.createElement('canvas');
                c.width = cw;
                c.height = ch;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0, iw, ih, 0, 0, cw, ch);
                resolve(c.toDataURL('image/png', 0.9));
              } catch (err) {
                resolve(dataUrl);
              }
            }, 8);
          };
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    } catch (err) {
      try {
        return await new Promise((res) => {
          const fr = new FileReader();
          fr.onload = (ev) => res(ev.target?.result);
          fr.onerror = () => res(null);
          fr.readAsDataURL(file);
        });
      } catch (_) { return null; }
    }
  }, []);

  // -----------------------------
  // Fabric filters (apply as Fabric Image filters)
  // -----------------------------
  const applyFabricFiltersToSelectedImage = useCallback((brightnessSlider = cssBrightness, contrastSlider = cssContrast) => {
    if (!canvasInstance) return;
    if (fabricFilterRafRef.current) return;
    fabricFilterRafRef.current = window.requestAnimationFrame(() => {
      fabricFilterRafRef.current = null;
      try {
        const sel = selectedObjectRef.current;
        let target = null;
        if (sel && (sel.type === 'image' || sel instanceof fabric.Image)) target = sel;
        else {
          const objs = (canvasInstance.getObjects && canvasInstance.getObjects()) || [];
          for (let i = objs.length - 1; i >= 0; i -= 1) {
            const o = objs[i];
            if (o && (o.type === 'image' || o instanceof fabric.Image)) { target = o; break; }
          }
        }
        if (!target) return;

        const fBrightness = (brightnessSlider / 50) - 1;
        const fContrast = (contrastSlider / 50) - 1;

        const ImgFilters = fabric.Image && fabric.Image.filters ? fabric.Image.filters : null;
        const newFilters = [];
        if (ImgFilters && typeof ImgFilters.Brightness === 'function') {
          try { newFilters.push(new ImgFilters.Brightness({ brightness: fBrightness })); } catch (_) {}
        }
        if (ImgFilters && typeof ImgFilters.Contrast === 'function') {
          try { newFilters.push(new ImgFilters.Contrast({ contrast: fContrast })); } catch (_) {}
        }

        if (newFilters.length === 0) return;

        try {
          target.filters = newFilters;
          if (typeof target.applyFilters === 'function') target.applyFilters();
        } catch (_) {}
        try { canvasInstance.requestRenderAll?.(); } catch (_) { safeRender(); }
      } catch (_) {}
    });
  }, [canvasInstance, cssBrightness, cssContrast, safeRender]);

  // -----------------------------
  // Background image upload (uses downscaling helper)
  // -----------------------------
  const handleImageUpload = useCallback(async (file) => {
    if (!file || !canvasInstance) return;
    try {
      const dataUrl = await downscaleFileToDataUrl(file, 1600);
      if (!dataUrl) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const fImg = new fabric.Image(img);
          fImg.filters = fImg.filters || [];
          const nativeW = img.naturalWidth || fImg.width || 1;
          const nativeH = img.naturalHeight || fImg.height || 1;
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
            if (scaledH > cH && typeof fImg.scaleToHeight === 'function') fImg.scaleToHeight(cH);
          } else {
            const scale = Math.min(cW / nativeW, cH / nativeH);
            fImg.set({ scaleX: scale, scaleY: scale });
          }

          fImg.set({ left: cW / 2, top: cH / 2 });
          fImg._userAdded = true;

          try { canvasInstance.add(fImg); } catch (err) { try { canvasInstance._objects = canvasInstance._objects || []; canvasInstance._objects.push(fImg); } catch (_) {} }

          try { canvasInstance.centerObject(fImg); } catch (_) {}
          try { fImg.setCoords(); } catch (_) {}
          try { canvasInstance.setActiveObject(fImg); } catch (_) {}
          try { canvasInstance.calcOffset?.(); } catch (_) {}
          safeRender();

          setSelectedObject(fImg);
          applyCssFiltersToCanvas(cssBrightness, cssContrast);
          applyFabricFiltersToSelectedImage(cssBrightness, cssContrast);
        } catch (err) {
          console.error('fabric.Image load error', err);
        }
      };
      img.onerror = () => {};
      img.src = dataUrl;
    } catch (err) {
      console.error('handleImageUpload error', err);
    }
  }, [canvasInstance, downscaleFileToDataUrl, applyCssFiltersToCanvas, cssBrightness, cssContrast, applyFabricFiltersToSelectedImage, safeRender]);

  // -----------------------------
  // Elements: shapes & image-url (fetch-first)
  // -----------------------------
  const addElement = useCallback((type, payload = {}) => {
    if (!canvasInstance) return;
    const cW = canvasInstance.getWidth();
    const cH = canvasInstance.getHeight();

    // shapes
    if (type === 'rect') {
      const r = new fabric.Rect({ left: cW / 2, top: cH / 2, originX: 'center', originY: 'center', width: payload.width || 200, height: payload.height || 120, fill: payload.fill || '#ffffff', stroke: payload.stroke || '#000000', strokeWidth: payload.strokeWidth || 2, selectable: true });
      r._userAdded = true; canvasInstance.add(r); canvasInstance.setActiveObject(r); r.setCoords(); canvasInstance.renderAll(); setSelectedObject(r); undoStackRef.current.push({ type: 'add', obj: r }); redoStackRef.current = []; return;
    }
    if (type === 'circle') {
      const c = new fabric.Circle({ left: cW / 2, top: cH / 2, originX: 'center', originY: 'center', radius: payload.radius || 60, fill: payload.fill || '#ffffff', stroke: payload.stroke || '#000000', strokeWidth: payload.strokeWidth || 2, selectable: true });
      c._userAdded = true; canvasInstance.add(c); canvasInstance.setActiveObject(c); c.setCoords(); canvasInstance.renderAll(); setSelectedObject(c); undoStackRef.current.push({ type: 'add', obj: c }); redoStackRef.current = []; return;
    }
    if (type === 'triangle') {
      const t = new fabric.Triangle({ left: cW / 2, top: cH / 2, originX: 'center', originY: 'center', width: payload.width || 140, height: payload.height || 140, fill: payload.fill || '#ffffff', stroke: payload.stroke || '#000000', strokeWidth: payload.strokeWidth || 2, selectable: true });
      t._userAdded = true; canvasInstance.add(t); canvasInstance.setActiveObject(t); t.setCoords(); canvasInstance.renderAll(); setSelectedObject(t); undoStackRef.current.push({ type: 'add', obj: t }); redoStackRef.current = []; return;
    }
    if (type === 'line') {
      const line = new fabric.Line([0, 0, payload.length || 200, 0], { left: cW / 2, top: cH / 2, originX: 'center', originY: 'center', stroke: payload.stroke || '#000000', strokeWidth: payload.strokeWidth || 3, selectable: true });
      line._userAdded = true; canvasInstance.add(line); canvasInstance.setActiveObject(line); line.setCoords(); canvasInstance.renderAll(); setSelectedObject(line); undoStackRef.current.push({ type: 'add', obj: line }); redoStackRef.current = []; return;
    }

    // payload.url: fetch first (more robust with proxies)
    if (payload.url) {
      const urlToLoad = payload.url;
      setPixabayError(null);

      // fetch image as blob first
      (async () => {
        try {
          // try to fetch with default CORS mode. If you use a proxy, ensure it returns image bytes and CORS headers.
          const resp = await fetch(urlToLoad, { mode: 'cors' });
          if (!resp.ok) {
            const statusText = `${resp.status} ${resp.statusText}`;
            console.error('Pixabay image fetch failed', urlToLoad, statusText);
            setPixabayError(`Image fetch failed: ${statusText}`);
            return;
          }

          const contentType = resp.headers.get('Content-Type') || '';
          if (!contentType.startsWith('image/')) {
            console.error('Pixabay proxy returned non-image content-type:', contentType, urlToLoad);
            setPixabayError('Image proxy returned non-image content.');
            return;
          }

          const blob = await resp.blob();
          if (!blob || blob.size === 0) {
            console.error('Fetched blob is empty for', urlToLoad);
            setPixabayError('Fetched image is empty.');
            return;
          }

          const objectUrl = URL.createObjectURL(blob);
          // create an Image element so we can pass a fully loaded element into fabric.Image constructor
          const imageEl = new Image();
          imageEl.crossOrigin = 'anonymous';
          imageEl.onload = () => {
            try {
              const fImg = new fabric.Image(imageEl);
              fImg.set({ left: cW / 2, top: cH / 2, originX: 'center', originY: 'center', selectable: true });
              const maxDim = Math.min(cW, cH) * 0.35;
              const scale = Math.min(1, maxDim / Math.max(fImg.width || 1, fImg.height || 1));
              fImg.scaleX = (fImg.scaleX || 1) * scale;
              fImg.scaleY = (fImg.scaleY || 1) * scale;
              fImg._userAdded = true;
              canvasInstance.add(fImg);
              canvasInstance.setActiveObject(fImg);
              fImg.setCoords();
              canvasInstance.renderAll?.();
              undoStackRef.current.push({ type: 'add', obj: fImg });
              redoStackRef.current = [];
              // apply filters if any
              try { applyFabricFiltersToSelectedImage(cssBrightness, cssContrast); } catch (_) {}
            } catch (err) {
              console.error('fabric fallback image creation error', err);
              setPixabayError('Failed to create fabric image.');
            } finally {
              try { URL.revokeObjectURL(objectUrl); } catch (_) {}
            }
          };
          imageEl.onerror = (e) => {
            console.error('Image element failed to load objectUrl', e);
            setPixabayError('Failed to load image element.');
            try { URL.revokeObjectURL(objectUrl); } catch (_) {}
          };
          // start the load from blob URL
          imageEl.src = objectUrl;
        } catch (err) {
          console.error('Error fetching pixabay image', err);
          setPixabayError(err?.message || String(err));
        }
      })();
    }
  }, [canvasInstance, cssBrightness, cssContrast, applyFabricFiltersToSelectedImage]);

  // -----------------------------
  // Undo / Redo
  // -----------------------------
  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (!stack || stack.length === 0) return;
    const action = stack.pop();
    if (!action) return;
    if (action.type === 'add' && action.obj) {
      try {
        const obj = action.obj;
        if (canvasInstance && canvasInstance.contains && canvasInstance.contains(obj)) {
          canvasInstance.remove(obj);
        } else if (canvasInstance && canvasInstance.getObjects && canvasInstance.getObjects().includes(obj)) {
          canvasInstance.remove(obj);
        }
        redoStackRef.current.push(action);
        try { canvasInstance && canvasInstance.renderAll(); } catch (_) {}
        setSelectedObject((prev) => (prev === action.obj ? null : prev));
      } catch (err) { console.warn('undo failed', err); }
    }
  }, [canvasInstance]);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (!stack || stack.length === 0) return;
    const action = stack.pop();
    if (!action) return;
    if (action.type === 'add' && action.obj) {
      try {
        const obj = action.obj;
        canvasInstance && canvasInstance.add(obj);
        undoStackRef.current.push(action);
        try { canvasInstance && canvasInstance.renderAll(); } catch (_) {}
        setSelectedObject(obj);
      } catch (err) { console.warn('redo failed', err); }
    }
  }, [canvasInstance]);

  // slider handlers (update CSS preview + apply Fabric filters)
  const handleBrightnessChange = useCallback((sliderValue) => {
    setCssBrightness(sliderValue);
    applyCssFiltersToCanvas(sliderValue, cssContrast);
    applyFabricFiltersToSelectedImage(sliderValue, cssContrast);
  }, [applyCssFiltersToCanvas, cssContrast, applyFabricFiltersToSelectedImage]);

  const handleContrastChange = useCallback((sliderValue) => {
    setCssContrast(sliderValue);
    applyCssFiltersToCanvas(cssBrightness, sliderValue);
    applyFabricFiltersToSelectedImage(cssBrightness, sliderValue);
  }, [applyCssFiltersToCanvas, cssBrightness, applyFabricFiltersToSelectedImage]);

  // -----------------------------
  // PIXABAY: search function
  // -----------------------------
  const searchPixabay = useCallback(async (query, opts = {}) => {
    if (!query || !pixabayKey) {
      setPixabayResults([]);
      setPixabayError(pixabayKey ? null : 'Missing Pixabay API key (set REACT_APP_PIXABAY_KEY or pass pixabayKey prop)');
      return;
    }

    if (pixabayAbortRef.current) {
      try { pixabayAbortRef.current.abort(); } catch (_) {}
      pixabayAbortRef.current = null;
    }
    const ac = new AbortController();
    pixabayAbortRef.current = ac;

    setPixabayLoading(true);
    setPixabayError(null);
    setPixabayResults([]);

    try {
      const params = new URLSearchParams({
        key: pixabayKey,
        q: query,
        image_type: opts.image_type || 'photo',
        per_page: String(opts.per_page || 24),
        safesearch: String(typeof opts.safesearch !== 'undefined' ? opts.safesearch : true),
      });
      const url = `https://pixabay.com/api/?${params.toString()}`;
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText || 'Unknown error');
        throw new Error(`Pixabay fetch failed: ${res.status} ${txt}`);
      }
      const json = await res.json();
      const hits = Array.isArray(json.hits) ? json.hits : [];
      setPixabayResults(hits);
    } catch (err) {
      if (err && err.name === 'AbortError') { /* ignore aborted */ }
      else setPixabayError(err?.message || String(err));
    } finally {
      setPixabayLoading(false);
      pixabayAbortRef.current = null;
    }
  }, [pixabayKey]);

  // click handler for sidebar thumbnails
  const addImageFromUrl = useCallback((url) => {
    if (!url) return;
    addElement('image', { url });
  }, [addElement]);

  // Text helpers
  const addTextToCanvas = useCallback((text, options = {}) => {
    if (!canvasInstance) return;
    const cW = canvasInstance.getWidth();
    const cH = canvasInstance.getHeight();
    const tb = new fabric.Textbox(text || 'New text', {
      left: cW / 2, top: cH / 2, originX: 'center', originY: 'center',
      width: Math.min(400, cW * 0.8),
      fontSize: options.fontSize || fontSize || 40,
      fill: options.fill || fontColor || '#000000',
      fontWeight: options.fontWeight || (isBold ? 'bold' : 'normal'),
      fontStyle: options.fontStyle || (isItalic ? 'italic' : 'normal'),
      textAlign: options.textAlign || textAlign || 'center',
      editable: true, selectable: true,
    });
    tb._userAdded = true;
    canvasInstance.add(tb);
    try { canvasInstance.centerObject(tb); } catch (_) {}
    try { tb.setCoords(); } catch (_) {}
    try { canvasInstance.setActiveObject(tb); } catch (_) {}
    try { canvasInstance.renderAll(); } catch (_) {}
    setSelectedObject(tb);
  }, [canvasInstance, fontSize, fontColor, isBold, isItalic, textAlign]);

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
    } catch (err) { console.warn('updateSelectedText failed', err); }
  }, [canvasInstance]);

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
    } catch (err) { console.warn('updateSelectedTextStyle failed', err); }
  }, [canvasInstance]);

  const toggleInlineEdit = useCallback((obj) => {
    const target = obj || selectedObjectRef.current || (canvasInstance && canvasInstance.getActiveObject && canvasInstance.getActiveObject());
    if (!target) return;
    try {
      if (target.isEditing) { target.exitEditing(); target.setCoords?.(); } else { target.enterEditing(); try { target.selectAll(); } catch (_) {} }
      canvasInstance?.renderAll?.();
    } catch (err) { /* ignore */ }
  }, [canvasInstance]);

  // keep selection state in sync
  useEffect(() => {
    if (!canvasInstance) return undefined;
    const onSel = (e) => setSelectedObject(e?.target ?? null);
    canvasInstance.on('selection:created', onSel);
    canvasInstance.on('selection:updated', onSel);
    canvasInstance.on('selection:cleared', () => setSelectedObject(null));
    return () => {
      try { canvasInstance.off('selection:created', onSel); } catch (_) {}
      try { canvasInstance.off('selection:updated', onSel); } catch (_) {}
    };
  }, [canvasInstance]);

  const canUndo = useCallback(() => (undoStackRef.current && undoStackRef.current.length > 0), []);

  // final render
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 2, p: 1 }}>
      <Box>
        <EditorSidebar
          onImageUpload={handleImageUpload}
          selectedObject={selectedObject}
          onBrightnessChange={handleBrightnessChange}
          onContrastChange={handleContrastChange}
          textInput={textInput}
          setTextInput={(v) => { setTextInput(v); if (selectedObject && (selectedObject.type === 'textbox' || selectedObject.type === 'i-text' || selectedObject.type === 'text')) updateSelectedText(v); }}
          fontSize={fontSize}
          setFontSize={(v) => { setFontSize(v); updateSelectedTextStyle({ fontSize: v }); }}
          fontColor={fontColor}
          setFontColor={(v) => { setFontColor(v); /* effect applies */ }}
          isBold={isBold}
          setIsBold={(v) => { setIsBold(v); updateSelectedTextStyle({ fontWeight: v ? 'bold' : 'normal' }); }}
          isItalic={isItalic}
          setIsItalic={(v) => { setIsItalic(v); updateSelectedTextStyle({ fontStyle: v ? 'italic' : 'normal' }); }}
          textAlign={textAlign}
          setTextAlign={(v) => { setTextAlign(v); updateSelectedTextStyle({ textAlign: v }); }}
          addText={() => { addTextToCanvas(textInput, { fontSize, fill: fontColor, fontWeight: isBold ? 'bold' : 'normal', fontStyle: isItalic ? 'italic' : 'normal', textAlign }); }}
          updateText={(newText) => updateSelectedText(newText)}
          toggleInlineEdit={() => { toggleInlineEdit(); }}
          addElement={addElement}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          pixabayResults={pixabayResults}
          pixabayLoading={pixabayLoading}
          pixabayError={pixabayError}
          onSearchPixabay={searchPixabay}
          onAddImageFromUrl={addImageFromUrl}
        />
      </Box>

      <Box>
        <EditorCanvas onCanvasReady={onCanvasReady} />
      </Box>
    </Box>
  );
}
