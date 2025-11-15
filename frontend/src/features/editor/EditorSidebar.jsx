// src/features/editor/EditorSidebar.jsx
import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, Divider, Slider } from '@mui/material';
import { UploadFile } from '@mui/icons-material';

const FilterSlider = ({ label, value, onChange, disabled }) => {
  const [val, setVal] = useState(value ?? 50);

  useEffect(() => {
    setVal(value ?? 50);
  }, [value]);

  const handleChange = (e, newVal) => {
    setVal(newVal);
    if (typeof onChange === 'function') onChange(newVal); // live preview
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography gutterBottom>{label}</Typography>
      <Slider
        value={val}
        min={0}
        max={100}
        step={1}
        onChange={handleChange}
        valueLabelDisplay="auto"
        disabled={disabled}
      />
    </Box>
  );
};

// Helper: read a filter numeric property from the selected object's filters
function getFilterValueFromObject(selectedObject, filterName, propName) {
  if (!selectedObject?.filters?.length) return 50; // neutral slider
  const f = selectedObject.filters.find(fl => {
    if (!fl) return false;
    if (fl.type === filterName) return true;
    const ctor = fl.constructor?.name || '';
    return ctor.toLowerCase().includes(filterName.toLowerCase());
  });
  if (!f) return 50;
  const raw = f[propName];
  if (typeof raw !== 'number') return 50;
  // Map fabric value (-1..1) -> slider 0..100, where 50 is neutral
  return (raw * 50) + 50;
}

export default function EditorSidebar({
  onImageUpload,
  selectedObject,
  onBrightnessChange,
  onContrastChange,
}) {
  // slider initial values derived from selectedObject filters
  const currentBrightness = getFilterValueFromObject(selectedObject, 'Brightness', 'brightness');
  const currentContrast = getFilterValueFromObject(selectedObject, 'Contrast', 'contrast');

  const isImageSelected = !!(selectedObject && (selectedObject.type === 'image' || selectedObject.type === 'img'));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && typeof onImageUpload === 'function') onImageUpload(file);
    e.target.value = null;
  };

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

      <Box sx={{ mt: 2, opacity: isImageSelected ? 1 : 0.5 }}>
        <Typography variant="h6" gutterBottom>Basic Edits</Typography>
        <Box sx={{ p: 1, pointerEvents: isImageSelected ? 'auto' : 'none' }}>
          <FilterSlider
            label="Brightness"
            value={currentBrightness}
            onChange={onBrightnessChange}
            disabled={!isImageSelected}
          />
          <FilterSlider
            label="Contrast"
            value={currentContrast}
            onChange={onContrastChange}
            disabled={!isImageSelected}
          />
        </Box>
      </Box>
    </Paper>
  );
}
