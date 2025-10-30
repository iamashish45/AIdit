import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';

// Define the base URL for our backend API
const API_URL = 'http://127.0.0.1:8000';

function App() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // This function will run when the component mounts
    const fetchTestMessage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Make a GET request to our backend's '/api/test' endpoint
        const response = await axios.get(`${API_URL}/api/test`);
        
        // Set the message from the backend response
        setMessage(response.data.message);
      } catch (err) {
        console.error("Failed to connect to backend:", err);
        setError("Failed to connect to the backend. Is the Python server running?");
      } finally {
        setLoading(false);
      }
    };

    fetchTestMessage();
  }, []); // The empty array [] means this effect runs only once

  return (
    <Container maxWidth="md">
      <Box 
        sx={{
          my: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          AIdit
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Your AI-Powered Image Editor
        </Typography>
        
        <Box sx={{ mt: 4, width: '100%' }}>
          {loading && <CircularProgress />}
          
          {error && <Alert severity="error">{error}</Alert>}
          
          {message && (
            <Alert severity="success">
              <Typography variant="h6">{message}</Typography>
            </Alert>
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default App;