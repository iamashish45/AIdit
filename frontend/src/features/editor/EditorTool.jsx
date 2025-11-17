// src/features/editor/EditorTool.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import * as fabric from 'fabric';
import axios from 'axios';

import EditorSidebar from './EditorSidebar';
import EditorCanvas from './EditorCanvas';

export default function EditorTool() {
  const [canvasInstance, setCanvasInstance] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const selectedObjectRef = useRef(null);

  // CSS filter slider state
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

  // RAF refs for throttled rendering/filters
  const rafRef = useRef(null);
  const cssFilterRafRef = useRef(null);
  const fabricFilterRafRef = useRef(null);

  useEffect(() => { selectedObjectRef.current = selectedObject; }, [selectedObject]);

  // -----------------------------
  // Canvas ready
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

  // -----------------------------
  // safeRender (RAF-throttled)
  // -----------------------------
  const safeRender = useCallback(() => {
    if (!canvasInstance) return;
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      try { canvasInstance.renderAll(); } catch (_) {}
    });
  }, [canvasInstance]);

  useEffect(() => {
    return () => {
      if (rafRef.current) { window.cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (cssFilterRafRef.current) { window.cancelAnimationFrame(cssFilterRafRef.current); cssFilterRafRef.current = null; }
      if (fabricFilterRafRef.current) { window.cancelAnimationFrame(fabricFilterRafRef.current); fabricFilterRafRef.current = null; }
    };
  }, []);

  // -----------------------------
  // CSS filters (preview)
  // -----------------------------
  const applyCssFiltersToCanvas = useCallback((brightnessSlider, contrastSlider) => {
    try {
      const el = document.getElementById('editor-canvas') || ((canvasInstance && (canvasInstance.lowerCanvasEl || canvasInstance.getElement?.())));
      if (!el) return;
      const b = brightnessSlider / 50;
      const c = contrastSlider / 50;
      el.style.filter = `brightness(${b}) contrast(${c})`;
    } catch (e) { /* ignore */ }
  }, [canvasInstance]);

  useEffect(() => {
    if (!canvasInstance) return;
    applyCssFiltersToCanvas(cssBrightness, cssContrast);
  }, [canvasInstance, cssBrightness, cssContrast, applyCssFiltersToCanvas]);

  // -----------------------------
  // Downscale helper (non-blocking)
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
          } catch (err) { /* fallback below */ }
        }
        return await new Promise((resolve) => {
          setTimeout(() => {
            try {
              const c = document.createElement('canvas');
              c.width = cw;
              c.height = ch;
              const ctx = c.getContext('2d');
              ctx.drawImage(bitmap, 0, 0, iw, ih, 0, 0, cw, ch);
              const dataUrl = c.toDataURL('image/png', 0.9);
              resolve(dataUrl);
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
  // Fabric filters application (Brightness / Contrast)
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
        } catch (err) { /* non-fatal */ }
        try { canvasInstance.requestRenderAll?.(); } catch (_) { safeRender(); }
      } catch (err) { /* swallow */ }
    });
  }, [canvasInstance, cssBrightness, cssContrast, safeRender]);

  // -----------------------------
  // Image upload (base/background)
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
          fImg.set({ left: cW / 2, top: cH / 2, _userAdded: true });
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
      img.onerror = () => { /* ignore */ };
      img.src = dataUrl;
    } catch (err) {
      console.error('handleImageUpload error', err);
    }
  }, [canvasInstance, downscaleFileToDataUrl, applyCssFiltersToCanvas, cssBrightness, cssContrast, applyFabricFiltersToSelectedImage, safeRender]);

  // -----------------------------
  // Robust helper: fetch proxied/external URL and create fabric.Image from blob
  // -----------------------------
  const loadImageViaFetchForFabric = useCallback(async (url, timeoutMs = 20000) => {
    if (!url) throw new Error('url required');

    // If url is not http(s), let fabric handle it directly (data:, blob:)
    if (!/^https?:\/\//i.test(url)) {
      return new Promise((resolve, reject) => {
        fabric.Image.fromURL(url, (fabricImg) => {
          if (!fabricImg) return reject(new Error('fabric failed to create image from non-http url'));
          resolve(fabricImg);
        }, { crossOrigin: 'anonymous' });
      });
    }

    // --- THIS IS THE FIX ---
    // This function is now more robust for loading blobs.
    const blobToFabricImage = async (blob) => {
      const blobUrl = URL.createObjectURL(blob);
      try {
        // 1. Create a standard HTML Image element
        const htmlImage = new Image();
        htmlImage.src = blobUrl;
        
        // 2. Wait for the image to load from the blob URL
        await new Promise((resolve, reject) => {
          htmlImage.onload = () => resolve();
          htmlImage.onerror = () => reject(new Error('HTMLImage failed to load blob URL'));
        });

        // 3. Pass the *loaded* HTML element to the fabric.Image constructor
        const fabricImg = new fabric.Image(htmlImage);
        return fabricImg;

      } finally {
        // 4. Clean up the blob URL to prevent memory leaks
        try { URL.revokeObjectURL(blobUrl); } catch (_) {}
      }
    };
    // --- END OF FIX ---

    // Try fetch first
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { method: 'GET', signal: controller.signal, cache: 'no-store' });
      clearTimeout(id);
      if (!resp.ok) {
        let preview = '';
        try { preview = (await resp.text()).slice(0, 200); } catch (_) { preview = ''; }
        throw new Error(`fetch returned ${resp.status} ${resp.statusText} preview:${preview}`);
      }
      const ct = (resp.headers.get('content-type') || '').toLowerCase();
      if (!ct.startsWith('image/')) {
        let preview = '';
        try { preview = (await resp.text()).slice(0, 200); } catch (_) { preview = ''; }
        throw new Error(`fetch returned non-image content-type: ${ct} preview:${preview}`);
      }
      const blob = await resp.blob();
      return await blobToFabricImage(blob);
    } catch (fetchErr) {
      clearTimeout(id);
      console.warn('fetch failed for', url, fetchErr && (fetchErr.message || fetchErr));

      // Try axios fallback (XHR may behave differently)
      try {
        const axiosResp = await axios.get(url, { responseType: 'blob', timeout: timeoutMs });
        const ct2 = ((axiosResp.headers && axiosResp.headers['content-type']) || '').toLowerCase();
        
        if (!ct2.startsWith('image/')) {
          let preview = '';
          try {
            preview = await new Response(axiosResp.data).text();
            preview = preview.slice(0, 200);
          } catch (_) { preview = ''; }
          throw new Error(`axios returned non-image content-type: ${ct2} preview:${preview}`);
        }
        return await blobToFabricImage(axiosResp.data);
      } catch (axErr) {
        console.error('Both fetch and axios failed for', url, axErr && (axErr.message || axErr));
        throw new Error(`Failed to fetch image: ${axErr && axErr.message ? axErr.message : String(axErr)}`);
      }
    }
  }, []);

  // -----------------------------
  // Elements: shapes & remote image (safe fetch)
  // -----------------------------
  const addElement = useCallback(async (type, payload = {}) => {
    if (!canvasInstance) return;
    const cW = canvasInstance.getWidth();
    const cH = canvasInstance.getHeight();

    // Shapes
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

    // Remote image by URL (stock image / proxy)
    if (payload.url) {
      try {
        const imgObj = await loadImageViaFetchForFabric(payload.url);
        if (!imgObj) { console.warn('failed to create image from url'); return; }
        imgObj.set({ left: cW / 2, top: cH / 2, originX: 'center', originY: 'center', selectable: true });
        const maxDim = Math.min(cW, cH) * 0.35;
        const scale = Math.min(1, maxDim / Math.max(imgObj.width || 1, imgObj.height || 1));
        imgObj.scaleX = (imgObj.scaleX || 1) * scale;
        imgObj.scaleY = (imgObj.scaleY || 1) * scale;
        imgObj._userAdded = true;
        canvasInstance.add(imgObj);
        canvasInstance.setActiveObject(imgObj);
        imgObj.setCoords();
        try { canvasInstance.renderAll(); } catch (_) { safeRender(); }
        setSelectedObject(imgObj);
        undoStackRef.current.push({ type: 'add', obj: imgObj });
        redoStackRef.current = [];
        applyFabricFiltersToSelectedImage(cssBrightness, cssContrast);
      } catch (err) {
        console.warn('addElement(payload.url) failed:', err && (err.message || err));
      }
    }
  }, [canvasInstance, loadImageViaFetchForFabric, cssBrightness, cssContrast, applyFabricFiltersToSelectedImage, safeRender]);

  // -----------------------------
  // Element upload (file -> add element)
  // -----------------------------
  const handleElementUpload = useCallback(async (file) => {
    if (!file || !canvasInstance) return;
    const cW = canvasInstance.getWidth();
    const cH = canvasInstance.getHeight();
    const isSvg = file.type === 'image/svg+xml' || (file.name && file.name.toLowerCase().endsWith('.svg'));
    if (isSvg) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const svgText = ev.target?.result;
        if (!svgText) return;
        try {
          fabric.loadSVGFromString(svgText, (objects, options) => {
            let objs = objects;
            if (!objs) objs = [];
            else if (!Array.isArray(objs)) objs = [objs];
            let group = null;
            try { group = fabric.util.groupSVGElements(objs, options); } catch (_) { group = null; }
            if (!group || typeof group.set !== 'function') {
              try { group = new fabric.Group(objs, options || {}); } catch (_) { group = null; }
            }
            if (!group) {
              const url = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgText);
              fabric.Image.fromURL(url, (img) => {
                if (!img) return;
                img.set({ left: cW / 2, top: cH / 2, originX: 'center', originY: 'center', selectable: true, _userAdded: true });
                const maxDim = Math.min(cW, cH) * 0.35;
                const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
                img.scaleX = (img.scaleX || 1) * scale;
                img.scaleY = (img.scaleY || 1) * scale;
                canvasInstance.add(img);
                canvasInstance.setActiveObject(img);
                img.setCoords();
                safeRender();
                setSelectedObject(img);
                undoStackRef.current.push({ type: 'add', obj: img });
                redoStackRef.current = [];
              }, { crossOrigin: 'anonymous' });
              return;
            }
            try { group.set({ left: cW / 2, top: cH / 2, originX: 'center', originY: 'center', selectable: true }); } catch (_) {}
            let bbox = { width: group.width || 1, height: group.height || 1 };
            try { const r = group.getBoundingRect(true); if (r && r.width && r.height) bbox = { width: r.width, height: r.height }; } catch (_) {}
            const maxDim = Math.min(cW, cH) * 0.35;
            const scale = Math.min(1, maxDim / Math.max(bbox.width || 1, bbox.height || 1));
            try { group.scaleX = (group.scaleX || 1) * scale; group.scaleY = (group.scaleY || 1) * scale; } catch (_) {}
            group._userAdded = true;
            try { canvasInstance.add(group); } catch (errAdd) { console.warn('add group failed', errAdd); }
            try { canvasInstance.setActiveObject(group); } catch (_) {}
            try { group.setCoords(); } catch (_) {}
            safeRender();
            setSelectedObject(group);
            undoStackRef.current.push({ type: 'add', obj: group });
            redoStackRef.current = [];
          });
        } catch (err) {
          try {
            const url = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgText);
            fabric.Image.fromURL(url, (img) => {
              if (!img) return;
              img.set({ left: cW / 2, top: cH / 2, originX: 'center', originY: 'center', selectable: true, _userAdded: true });
              const maxDim = Math.min(cW, cH) * 0.35;
              const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
              img.scaleX = (img.scaleX || 1) * scale;
              img.scaleY = (img.scaleY || 1) * scale;
              canvasInstance.add(img);
              canvasInstance.setActiveObject(img);
              img.setCoords();
              safeRender();
              setSelectedObject(img);
              undoStackRef.current.push({ type: 'add', obj: img });
              redoStackRef.current = [];
            }, { crossOrigin: 'anonymous' });
          } catch (fbErr) { console.warn('svg fallback failed', fbErr); }
        }
      };
      reader.onerror = () => {};
      reader.readAsText(file);
      return;
    }

    try {
      const dataUrl = await downscaleFileToDataUrl(file, 1000);
      if (!dataUrl) return;
      fabric.Image.fromURL(dataUrl, (img) => {
        if (!img) return;
        img.set({ left: cW / 2, top: cH / 2, originX: 'center', originY: 'center', selectable: true, _userAdded: true });
        const maxDim = Math.min(cW, cH) * 0.35;
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        img.scaleX = (img.scaleX || 1) * scale;
        img.scaleY = (img.scaleY || 1) * scale;
        canvasInstance.add(img);
        canvasInstance.setActiveObject(img);
        img.setCoords();
        safeRender();
        setSelectedObject(img);
        undoStackRef.current.push({ type: 'add', obj: img });
        redoStackRef.current = [];
      }, { crossOrigin: 'anonymous' });
    } catch (err) {
      console.warn('element image add failed', err);
    }
  }, [canvasInstance, downscaleFileToDataUrl, safeRender]);

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
      } catch (err) { /* ignore */ }
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
      } catch (err) { /* ignore */ }
    }
  }, [canvasInstance]);

  // -----------------------------
  // Slider handlers
  // -----------------------------
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
  // Selection sync
  // -----------------------------
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

  // -----------------------------
  // Text utils
  // -----------------------------
  useEffect(() => {
    try { updateSelectedTextStyle({ fill: fontColor }); } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontColor]);

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
    undoStackRef.current.push({ type: 'add', obj: tb });
    redoStackRef.current = [];
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
    } catch (err) { /* ignore */ }
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
    } catch (err) { /* ignore */ }
  }, [canvasInstance]);

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

  // -----------------------------
  // AI background generate handler (axios -> blob)
  // -----------------------------
  const handleGenerateBackground = useCallback(async (prompt, onStarted, onFinished) => {
    if (!prompt) return;
    onStarted?.();
    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      const response = await axios.post(
        'http://127.0.0.1:8000/api/tools/generate-background',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' }
      );
      const imageBlob = response.data;
      const imageFile = new File([imageBlob], 'generated-background.png', { type: 'image/png' });
      await handleImageUpload(imageFile);
    } catch (err) {
      console.error('handleGenerateBackground error', err);
      onFinished?.(err);
    } finally {
      onFinished?.();
    }
  }, [handleImageUpload]);

  // -----------------------------
  // Helpers & UI props
  // -----------------------------
  const canUndo = () => (undoStackRef.current && undoStackRef.current.length > 0);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 2, p: 1 }}>
      <Box>
        <EditorSidebar
          onImageUpload={handleImageUpload}
          selectedObject={selectedObject}
          onBrightnessChange={handleBrightnessChange}
          onContrastChange={handleContrastChange}

          // text props & handlers
          textInput={textInput}
          setTextInput={(v) => { setTextInput(v); if (selectedObject && (selectedObject.type === 'textbox' || selectedObject.type === 'i-text' || selectedObject.type === 'text')) updateSelectedText(v); }}
          fontSize={fontSize}
          setFontSize={(v) => { setFontSize(v); updateSelectedTextStyle({ fontSize: v }); }}
          fontColor={fontColor}
          setFontColor={(v) => { setFontColor(v); }}
          isBold={isBold}
          setIsBold={(v) => { setIsBold(v); updateSelectedTextStyle({ fontWeight: v ? 'bold' : 'normal' }); }}
          isItalic={isItalic}
          setIsItalic={(v) => { setIsItalic(v); updateSelectedTextStyle({ fontStyle: v ? 'italic' : 'normal' }); }}
          textAlign={textAlign}
          setTextAlign={(v) => { setTextAlign(v); updateSelectedTextStyle({ textAlign: v }); }}
          addText={() => { addTextToCanvas(textInput, { fontSize, fill: fontColor, fontWeight: isBold ? 'bold' : 'normal', fontStyle: isItalic ? 'italic' : 'normal', textAlign }); }}
          updateText={(newText) => updateSelectedText(newText)}
          toggleInlineEdit={() => { toggleInlineEdit(); }}

          // elements (shapes + remote stock via URL)
          addElement={addElement}
          onElementUpload={handleElementUpload}

          // AI generation
          onGenerateBackground={handleGenerateBackground}

          // undo/redo
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
        />
      </Box>

      <Box>
        <EditorCanvas onCanvasReady={onCanvasReady} />
      </Box>
    </Box>
  );
}