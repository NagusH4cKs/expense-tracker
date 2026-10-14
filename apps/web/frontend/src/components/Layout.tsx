import React, { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Sidebar, DRAWER_WIDTH, NavigationPage } from './Sidebar';
import { Navbar } from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
  activePage: NavigationPage;
  onPageChange: (page: NavigationPage) => void;
  onAddTransaction: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activePage,
  onPageChange,
  onAddTransaction,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top Fixed Navbar */}
      <Navbar
        onDrawerToggle={handleDrawerToggle}
        activePage={activePage}
        onAddTransaction={onAddTransaction}
      />

      {/* Navigation Sidebar Drawer */}
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={handleDrawerClose}
        activePage={activePage}
        onPageChange={onPageChange}
        onAddTransaction={onAddTransaction}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* Spacer to push content down below the fixed AppBar */}
        <Toolbar sx={{ minHeight: { xs: 64, sm: 70 } }} />

        {/* Page Content */}
        <Box sx={{ flexGrow: 1, maxWidth: 1400, width: '100%', mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};
