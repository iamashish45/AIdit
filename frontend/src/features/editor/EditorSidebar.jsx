// src/features/editor/EditorSidebar.jsx
import React, { useRef, useState } from 'react'; // NEW: Import useState
import {
  Box,
  Button,
  Slider,
  TextField,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Divider, // NEW: Import Divider
  CircularProgress // NEW: Import CircularProgress
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'; // NEW: Import AI icon

// NEW: Import Pixabay Component
import PixabaySearch from './PixabaySearch'; 

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
    onGenerateBackground, // NEW: Get handler from props
    onUndo,
    onRedo,
    canUndo,
  } = props;

  const imageInputRef = useRef(null);

  // NEW: State for generation
  const [prompt, setPrompt] = useState('A beautiful sunny beach');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

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

  // NEW: Generate Button Handler
  const handleGenerateClick = async () => {
    setIsGenerating(true);
    setGenerateError('');
    await onGenerateBackground(
      prompt, 
      () => setIsGenerating(true), // onStarted
      (err) => { // onFinished
        setIsGenerating(false);
        if(err) setGenerateError('Generation failed. Check console.');
      }
    );
  };

  return (
    <Box sx={{ 
      p: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 1.5, 
      height: '80vh', 
      overflowY: 'auto' 
    }}>
      <Typography variant="h6">Editor</Typography>

      {/* Image upload (base) */}
      <input
        ref={imageInputRef}
        onChange={onImageFileSelected}
        accept="image/*"
        type="file"
        style={{ display: 'none' }}
      />
      <Button variant="contained" onClick={triggerImageInput} fullWidth>
        Upload Background Image
      </Button>

      {/* --- NEW: AI Background Generation --- */}
      <Box>
        <Typography variant="subtitle2">AI Generate Background</Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Enter a prompt..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleGenerateClick}
          disabled={isGenerating}
          startIcon={isGenerating ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
          fullWidth
          sx={{ mt: 1 }}
        >
          {isGenerating ? 'Generating...' : 'Generate & Replace'}
        </Button>
        {generateError && <Typography color="error" variant="caption">{generateError}</Typography>}
      </Box>

      <Divider />

      {/* Brightness */}
      <Box>
        <Typography variant="subtitle2">Brightness</Typography>
        <Slider
          min={0}
          max={100}
          defaultValue={50}
          onChange={handleBrightnessChange}
          onChangeCommitted={(_, v) => { if (typeof v === 'number') onBrightnessChange?.(v); }}
          aria-label="brightness"
        />
      </Box>

      {/* Contrast */}
      <Box>
        <Typography variant="subtitle2">Contrast</Typography>
        <Slider
          min={0}
          max={100}
          defaultValue={50}
          onChange={handleContrastChange}
          onChangeCommitted={(_, v) => { if (typeof v === 'number') onContrastChange?.(v); }}
          aria-label="contrast"
        />
      </Box>

      <Divider />

      {/* Text tool */}
      <Typography variant="subtitle2">Text</Typography>
      <TextField
        size="small"
        placeholder="Text"
        value={textInput}
        onChange={(e) => setTextInput?.(e.target.value)}
        onBlur={() => updateText?.(textInput)}
      />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          type="number"
          size="small"
          label="Font size"
          value={fontSize}
          onChange={(e) => setFontSize?.(Math.max(6, Number(e.target.value) || 12))}
          sx={{ width: 100 }}
        />
        <input
          type="color"
          value={fontColor}
          onChange={(e) => setFontColor?.(e.target.value)}
          style={{ width: 40, height: 32, border: 'none', padding: 0, background: 'none' }}
        />
        <ToggleButtonGroup
          value={isBold ? 'bold' : isItalic ? 'italic' : null}
          size="small"
        >
          <ToggleButton
            value="bold"
            selected={isBold}
            onChange={() => setIsBold?.(!isBold)}
            title="Bold"
          >
            <FormatBoldIcon />
          </ToggleButton>
          <ToggleButton
            value="italic"
            selected={isItalic}
            onChange={() => setIsItalic?.(!isItalic)}
            title="Italic"
          >
            <FormatItalicIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      
        <ToggleButtonGroup
          exclusive
          value={textAlign}
          size="small"
          aria-label="text alignment"
        >
          <ToggleButton value="left" onClick={() => setTextAlign?.('left')} title="Left">
            <FormatAlignLeftIcon />
          </ToggleButton>
          <ToggleButton value="center" onClick={() => setTextAlign?.('center')} title="Center">
            <FormatAlignCenterIcon />
          </ToggleButton>
          <ToggleButton value="right" onClick={() => setTextAlign?.('right')} title="Right">
            <FormatAlignRightIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={() => addText?.(textInput)} fullWidth>
          Add Text
        </Button>
        <Button variant="outlined" onClick={() => toggleInlineEdit?.()} fullWidth>
          Edit
        </Button>
      </Box>

      <Divider />

      {/* Elements (shapes) */}
      <Typography variant="subtitle2">Elements (Shapes)</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={() => handleAddShape('rect')}>Rect</Button>
        <Button variant="outlined" onClick={() => handleAddShape('circle')}>Circle</Button>
        <Button variant="outlined" onClick={() => handleAddShape('triangle')}>Triangle</Button>
        <Button variant="outlined" onClick={() => handleAddShape('line')}>Line</Button>
      </Box>

      {/* --- NEW: Pixabay Stock Images --- */}
      <Divider />
      <Typography variant="subtitle2">Stock Images (Pixabay)</Typography>
      <PixabaySearch onImageSelect={addElement} />
      {/* This works because addElement is passed from props */}

      {/* Undo / Redo */}
      <Divider />
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start', mt: 1 }}>
        <IconButton onClick={() => onUndo?.()} title="Undo" disabled={!canUndo?.()}>
          <UndoIcon />
        </IconButton>
        <IconButton onClick={() => onRedo?.()} title="Redo">
          <RedoIcon />
        </IconButton>
      </Box>
    </Box>
  );
}