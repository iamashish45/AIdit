import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  Slider,
  TextField,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  CircularProgress,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';

export default function EditorSidebar(props) {
  const {
    onImageUpload,
    onBrightnessChange,
    onContrastChange,
    textInput,
    setTextInput,
    fontSize,
    setFontSize,
    fontColor,
    setFontColor,
    isBold,
    setIsBold,
    isItalic,
    setIsItalic,
    textAlign,
    setTextAlign,
    addText,
    updateText,
    toggleInlineEdit,
    addElement,
    onUndo,
    onRedo,
    canUndo,
    pixabayResults = [],
    pixabayLoading = false,
    pixabayError = null,
    onSearchPixabay = null,
    onAddImageFromUrl = null,
  } = props;

  const [searchTerm, setSearchTerm] = useState('');
  const imageInputRef = useRef(null);

  const triggerImageInput = () => { imageInputRef.current?.click(); };

  const onImageFileSelected = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    onImageUpload?.(f);
    ev.target.value = '';
  };

  const handleAddShape = (type) => {
    addElement?.(type);
  };

  const handleBrightnessChange = (e, value) => {
    if (typeof value !== 'number') return;
    onBrightnessChange?.(value);
  };
  const handleContrastChange = (e, value) => {
    if (typeof value !== 'number') return;
    onContrastChange?.(value);
  };

  const runSearch = () => {
    if (!onSearchPixabay) return;
    const q = (searchTerm || '').trim();
    if (!q) return;
    onSearchPixabay(q, { per_page: 24, image_type: 'photo', safesearch: true });
  };

  return (
    <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h6">Editor</Typography>

      {/* Pixabay search */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField size="small" placeholder="Search Pixabay" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }} sx={{ flex: 1 }} />
        <Button variant="contained" onClick={runSearch} disabled={!onSearchPixabay}>Search</Button>
      </Box>

      {pixabayLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}><CircularProgress size={24} /></Box> : null}
      {pixabayError ? <Typography color="error" variant="caption">{String(pixabayError)}</Typography> : null}
      {Array.isArray(pixabayResults) && pixabayResults.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5, maxHeight: 160, overflow: 'auto', p: 0.5 }}>
          {pixabayResults.map((hit) => {
            const thumb = hit.previewURL || hit.webformatURL || hit.largeImageURL || hit.userImageURL;
            const full = hit.largeImageURL || hit.webformatURL || hit.previewURL;
            return (
              <Box key={hit.id || thumb} sx={{ width: '100%', aspectRatio: '1/1', cursor: onAddImageFromUrl ? 'pointer' : 'default' }} onClick={() => { if (onAddImageFromUrl && full) onAddImageFromUrl(full); }}>
                <img src={thumb} alt={hit.tags || 'pixabay'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 4 }} />
              </Box>
            );
          })}
        </Box>
      )}

      {/* Image upload (background) */}
      <input ref={imageInputRef} onChange={onImageFileSelected} accept="image/*" type="file" style={{ display: 'none' }} />
      <Button variant="contained" onClick={triggerImageInput} fullWidth>Upload Background Image</Button>

      {/* Brightness */}
      <Box>
        <Typography variant="subtitle2">Brightness</Typography>
        <Slider min={0} max={100} defaultValue={50} onChange={handleBrightnessChange} onChangeCommitted={(_, v) => { if (typeof v === 'number') onBrightnessChange?.(v); }} aria-label="brightness" />
      </Box>

      {/* Contrast */}
      <Box>
        <Typography variant="subtitle2">Contrast</Typography>
        <Slider min={0} max={100} defaultValue={50} onChange={handleContrastChange} onChangeCommitted={(_, v) => { if (typeof v === 'number') onContrastChange?.(v); }} aria-label="contrast" />
      </Box>

      {/* Text tool */}
      <Typography variant="subtitle2">Text</Typography>
      <TextField size="small" placeholder="Text" value={textInput} onChange={(e) => setTextInput?.(e.target.value)} onBlur={() => updateText?.(textInput)} />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField type="number" size="small" label="Font size" value={fontSize} onChange={(e) => setFontSize?.(Math.max(6, Number(e.target.value) || 12))} sx={{ width: 100 }} />
        <input type="color" value={fontColor} onChange={(e) => setFontColor?.(e.target.value)} style={{ width: 40, height: 32, border: 'none', padding: 0, background: 'none' }} />
        <ToggleButtonGroup value={isBold ? 'bold' : isItalic ? 'italic' : null} size="small">
          <ToggleButton value="bold" selected={isBold} onChange={() => setIsBold?.(!isBold)} title="Bold"><FormatBoldIcon /></ToggleButton>
          <ToggleButton value="italic" selected={isItalic} onChange={() => setIsItalic?.(!isItalic)} title="Italic"><FormatItalicIcon /></ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box>
        <ToggleButtonGroup exclusive value={textAlign} size="small" aria-label="text alignment">
          <ToggleButton value="left" onClick={() => setTextAlign?.('left')} title="Left"><FormatAlignLeftIcon /></ToggleButton>
          <ToggleButton value="center" onClick={() => setTextAlign?.('center')} title="Center"><FormatAlignCenterIcon /></ToggleButton>
          <ToggleButton value="right" onClick={() => setTextAlign?.('right')} title="Right"><FormatAlignRightIcon /></ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={() => addText?.(textInput)} fullWidth>Add Text</Button>
        <Button variant="outlined" onClick={() => toggleInlineEdit?.()} fullWidth>Edit</Button>
      </Box>

      {/* Elements (shapes) */}
      <Typography variant="subtitle2">Elements</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="outlined" onClick={() => handleAddShape('rect')}>Rect</Button>
        <Button variant="outlined" onClick={() => handleAddShape('circle')}>Circle</Button>
        <Button variant="outlined" onClick={() => handleAddShape('triangle')}>Triangle</Button>
        <Button variant="outlined" onClick={() => handleAddShape('line')}>Line</Button>
      </Box>

      {/* Undo / Redo */}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start', mt: 1 }}>
        <IconButton onClick={() => onUndo?.()} title="Undo" disabled={!canUndo?.()}><UndoIcon /></IconButton>
        <IconButton onClick={() => onRedo?.()} title="Redo"><RedoIcon /></IconButton>
      </Box>
    </Box>
  );
}
