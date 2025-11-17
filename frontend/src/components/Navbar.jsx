import React from 'react';
import { AppBar, Toolbar, Box, Typography } from '@mui/material';

// --- THIS IS THE FIX ---
// We import the logo as a standard URL path
import logoUrl from '../assets/logo.svg'; 
// --- END FIX ---

function Navbar() {
  return (
    <AppBar position="static" sx={{ mb: 4, background: '#222' }}>
      <Toolbar>
        
        {/* --- THIS IS THE FIX --- */}
        {/* We use a standard 'img' component */}
        <Box
          component="img"
          src={logoUrl}
          alt="AIdit Logo"
          sx={{ 
            height: '40px', // Set a fixed height
            mr: 2 
          }}
        />
        {/* --- END FIX --- */}

        {/* The App Title */}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          AIdit
        </Typography>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;