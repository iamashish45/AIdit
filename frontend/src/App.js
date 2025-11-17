import React, { useState } from 'react';
import { Container, Box, Tabs, Tab } from '@mui/material';
import { PhotoFilter, AutoAwesome, Edit } from '@mui/icons-material';

import Navbar from './components/Navbar'; 
import BackgroundTool from './features/backgroundRemover/BackgroundTool';
import EnhancerTool from './features/imageEnhancer/EnhancerTool';
import EditorTool from './features/editor/EditorTool';

// Import the logo URL
import logoUrl from './assets/logo.svg';

// Helper component for Tab Panels (no changes)
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3, width: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box>
      {/* 1. This is your top Navbar (stays the same) */}
      <Navbar /> 

      <Container maxWidth="xl"> 
        <Box 
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          
          {/* --- 2. BIGGER Logo Header --- */}
          <Box
            component="img"
            src={logoUrl}
            alt="AIdit Logo Header"
            sx={{
              height: '180px', // Increased from 120px for a bigger impact
              width: 'auto',   // Ensures aspect ratio is maintained
              maxWidth: '90%', // Ensures it's responsive and doesn't overflow
              my: 4,           // Add margin top and bottom
            }}
          />
          {/* --- END FIX --- */}
          
          {/* 3. Navigation Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange} 
              aria-label="AIdit Tools"
              centered
            >
              <Tab label="Background Editor" icon={<PhotoFilter />} index={0} />
              <Tab label="Image Enhancer" icon={<AutoAwesome />} index={1} />
              <Tab label="Canvas Editor" icon={<Edit />} index={2} />
            </Tabs>
          </Box>

          {/* --- Tab Panels --- */}
          <TabPanel value={currentTab} index={0}>
            <BackgroundTool />
          </TabPanel>
          
          <TabPanel value={currentTab} index={1}>
            <EnhancerTool />
          </TabPanel>
          
          <TabPanel value={currentTab} index={2}>
            <EditorTool />
          </TabPanel>
          
        </Box>
      </Container>
    </Box>
  );
}

export default App;