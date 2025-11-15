// src/features/editor/EditorSidebar.jsx
import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, Divider, Slider, TextField, IconButton, Stack } from '@mui/material';
import { UploadFile, FormatBold, FormatItalic, FormatAlignLeft, FormatAlignCenter, FormatAlignRight } from '@mui/icons-material';

const FilterSlider = ({ label, value, onChange, disabled }) => {
  const [val, setVal] = useState(value ?? 50);
  useEffect(() => { setVal(value ?? 50); }, [value]);
  const handleChange = (e, newVal) => {
    setVal(newVal);
    if (typeof onChange === 'function') onChange(newVal);
  };
  return (
    <Box sx={{ mb: 2 }}>
      <Typography gutterBottom>{label}</Typography>
      <Slider value={val} min={0} max={100} step={1} onChange={handleChange} valueLabelDisplay="auto" disabled={disabled} />
    </Box>
  );
};

export default function EditorSidebar({
  onImageUpload,
  selectedObject,
  onBrightnessChange,
  onContrastChange,

  // text tool props
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
}) {
  useEffect(() => {
    // nothing to do; props drive UI
  }, [selectedObject]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && typeof onImageUpload === 'function') onImageUpload(file);
    e.target.value = null;
  };

  const isTextSelected = !!(selectedObject && (selectedObject.type === 'textbox' || selectedObject.type === 'i-text' || selectedObject.type === 'text'));

  return (
    <Paper elevation={3} sx={{ width: '100%', height: '80vh', p: 2, overflowY: 'auto' }}>
      <Typography variant="h6" gutterBottom>Controls</Typography>

      <Box sx={{ mb: 2 }}>
        <Button variant="contained" component="label" startIcon={<UploadFile />} fullWidth>
          Upload Base Image
          <input type="file" hidden accept="image/png, image/jpeg" onChange={handleFileChange} />
        </Button>
      </Box>

      <Divider />

      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>Basic Edits</Typography>
        <Box sx={{ p: 1 }}>
          <FilterSlider label="Brightness" value={50} onChange={onBrightnessChange} />
          <FilterSlider label="Contrast" value={50} onChange={onContrastChange} />
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>Text</Typography>

        <TextField
          label={isTextSelected ? 'Edit selected text' : 'New text'}
          value={textInput ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            setTextInput(v);
            if (isTextSelected && typeof updateText === 'function') updateText(v);
          }}
          multiline
          minRows={1}
          maxRows={6}
          fullWidth
        />

        <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1 }} alignItems="center">
          <TextField
            label="Font size"
            type="number"
            value={fontSize ?? 40}
            onChange={(e) => { const v = Math.max(8, Number(e.target.value)); setFontSize(v); }}
            size="small"
            sx={{ width: 110 }}
          />
          <TextField
            label="Color"
            type="color"
            value={fontColor ?? '#000000'}
            onChange={(e) => setFontColor(e.target.value)}
            size="small"
            sx={{ width: 72, p: 0 }}
            inputProps={{ style: { padding: 2 } }}
          />
          <IconButton aria-label="bold" color={isBold ? 'primary' : 'default'} onClick={() => setIsBold(!isBold)}>
            <FormatBold />
          </IconButton>
          <IconButton aria-label="italic" color={isItalic ? 'primary' : 'default'} onClick={() => setIsItalic(!isItalic)}>
            <FormatItalic />
          </IconButton>
          <IconButton aria-label="left" color={textAlign === 'left' ? 'primary' : 'default'} onClick={() => setTextAlign('left')}>
            <FormatAlignLeft />
          </IconButton>
          <IconButton aria-label="center" color={textAlign === 'center' ? 'primary' : 'default'} onClick={() => setTextAlign('center')}>
            <FormatAlignCenter />
          </IconButton>
          <IconButton aria-label="right" color={textAlign === 'right' ? 'primary' : 'default'} onClick={() => setTextAlign('right')}>
            <FormatAlignRight />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button variant="contained" onClick={() => addText && addText()} fullWidth>
            Add Text
          </Button>
          <Button variant="outlined" onClick={() => toggleInlineEdit && toggleInlineEdit()} disabled={!isTextSelected} fullWidth>
            Edit Selected
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
