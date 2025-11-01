import React from 'react';
import { Container, Typography, Box } from '@mui/material';

// Import our new tool
import BackgroundTool from './features/backgroundRemover/BackgroundTool';

function App() {
  return (
    <Container maxWidth="lg">
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
        
        {/* Render our Background Removal Tool */}
        <BackgroundTool />
        
      </Box>
    </Container>
  );
}

export default App;