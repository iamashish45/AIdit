import React, { useState } from 'react';
import axios from 'axios';
import { 
  Box, 
  TextField, 
  Button, 
  // Removed Grid
  CircularProgress, 
  Typography, 
  Paper 
} from '@mui/material';

// Your API Key from the .env file
const API_KEY = process.env.REACT_APP_PIXABAY_API_KEY;
const PIXABAY_API_URL = 'https://pixabay.com/api/';
const PROXY_URL = 'http://127.0.0.1:8000/api/proxy/image';

function PixabaySearch({ onImageSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchTerm) return;
    if (!API_KEY) {
      setError("Pixabay API Key is missing. Please check your .env file.");
      return;
    }

    setIsLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await axios.get(PIXABAY_API_URL, {
        params: {
          key: API_KEY,
          q: searchTerm,
          image_type: 'photo',
          per_page: 21,
        }
      });

      if (response.data.hits.length === 0) {
        setError('No images found.');
      }
      setResults(response.data.hits);

    } catch (err) {
      console.error("Pixabay API error:", err);
      setError('Failed to fetch images. Please check API key and network.');
    }
    setIsLoading(false);
  };

  const handleImageClick = (image) => {
    if (onImageSelect) {
      const originalUrl = image.webformatURL;
      const encodedUrl = encodeURIComponent(originalUrl);
      const urlToLoadInCanvas = `${PROXY_URL}?url=${encodedUrl}`;
      onImageSelect('image', { url: urlToLoadInCanvas });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          placeholder="Search Pixabay..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="contained" onClick={handleSearch} disabled={isLoading}>
          Search
        </Button>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" align="center" sx={{ my: 2 }}>
          {error}
        </Typography>
      )}

      <Paper 
        variant="outlined" 
        sx={{ 
          height: 300, 
          overflowY: 'auto', 
          p: 1, 
          background: 'rgba(0,0,0,0.1)' 
        }}
      >
        {/* --- CSS GRID FIX --- */}
        {/* Replaced <Grid container> with <Box display="grid"> */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)', // 3 columns
          gap: 1
        }}>
          {results.map((image) => (
            <Box
              key={image.id}
              component="img"
              src={image.previewURL}
              alt={image.tags}
              sx={{
                width: '100%',
                height: 80,
                objectFit: 'cover',
                cursor: 'pointer',
                borderRadius: 1,
                '&:hover': {
                  opacity: 0.7,
                }
              }}
              onClick={() => handleImageClick(image)}
            />
          ))}
        </Box>
        {/* --- END FIX --- */}
      </Paper>
    </Box>
  );
}

export default PixabaySearch;