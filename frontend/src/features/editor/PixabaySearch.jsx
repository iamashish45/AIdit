import React, { useState } from 'react';
import axios from 'axios';
import { 
  Box, 
  TextField, 
  Button, 
  Grid, 
  CircularProgress, 
  Typography, 
  Paper 
} from '@mui/material';

// Your API Key from the .env file
const API_KEY = process.env.REACT_APP_PIXABAY_API_KEY;
const PIXABAY_API_URL = 'https://pixabay.com/api/';

// NEW: Define our backend proxy URL
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
      // This call is fine, it goes from our browser to Pixabay's API
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
      // --- THIS IS THE ROBUST FIX ---
      
      // 1. Get the original image URL from Pixabay
      const originalUrl = image.webformatURL; // Use webformatURL for speed
      
      // 2. We need to URL-encode it so it can be passed as a query parameter
      const encodedUrl = encodeURIComponent(originalUrl);

      // 3. Build our *backend* proxy URL
      const urlToLoadInCanvas = `${PROXY_URL}?url=${encodedUrl}`;

      // 4. Tell fabric.js to load the image from OUR backend
      // Your EditorTool.jsx's addElement(type, { url }) will handle this
      onImageSelect('image', { url: urlToLoadInCanvas });
      
      // --- END OF FIX ---
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
        <Grid container spacing={1}>
          {results.map((image) => (
            <Grid item xs={4} key={image.id}>
              <Box
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
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}

export default PixabaySearch;