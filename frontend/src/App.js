import React, { useState } from 'react';
import { Container, Typography, Box, Tabs, Tab } from '@mui/material';
import { PhotoFilter, AutoAwesome } from '@mui/icons-material';

// Import both of our tools
import BackgroundTool from './features/backgroundRemover/BackgroundTool';
import EnhancerTool from './features/imageEnhancer/EnhancerTool'; // NEW

// Helper component for Tab Panels
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
        <Box sx={{ pt: 3 }}>
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
        
        {/* --- Navigation Tabs --- */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange} 
            aria-label="AIdit Tools"
            centered
          >
            <Tab label="Background Editor" icon={<PhotoFilter />} index={0} />
            <Tab label="Image Enhancer" icon={<AutoAwesome />} index={1} />
          </Tabs>
        </Box>

        {/* --- Tab Panels --- */}
        <TabPanel value={currentTab} index={0}>
          <BackgroundTool />
        </TabPanel>
        
        <TabPanel value={currentTab} index={1}>
          <EnhancerTool />
        </TabPanel>
        
      </Box>
    </Container>
  );
}

export default App;