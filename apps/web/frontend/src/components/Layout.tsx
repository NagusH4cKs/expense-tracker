import React, { useState, useEffect } from 'react';
import { Box, LinearProgress, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Sidebar, DRAWER_WIDTH, NavigationPage } from './Sidebar';
import { Navbar } from './Navbar';
import { AddTransactionModal } from '../pages/AddTransactionModal';
import { categoryService } from '../services/category.service';
import { CategoryItem } from '../types/category';
import { API_ACTIVITY_EVENT } from '../api/axios';

interface LayoutProps {
  children?: React.ReactNode;
  activePage?: NavigationPage;
  onPageChange?: (page: NavigationPage) => void;
  onAddTransaction?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activePage,
  onPageChange,
  onAddTransaction,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [dbCategories, setDbCategories] = useState<CategoryItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [showRequestProgress, setShowRequestProgress] = useState(false);

  useEffect(() => {
    const handleActivity = (event: Event) => setPendingRequests((event as CustomEvent<number>).detail);
    window.addEventListener(API_ACTIVITY_EVENT, handleActivity);
    return () => window.removeEventListener(API_ACTIVITY_EVENT, handleActivity);
  }, []);

  useEffect(() => {
    if (pendingRequests === 0) {
      setShowRequestProgress(false);
      return;
    }
    const timer = window.setTimeout(() => setShowRequestProgress(true), 250);
    return () => window.clearTimeout(timer);
  }, [pendingRequests]);

  useEffect(() => {
    categoryService.getAll().then(setDbCategories).catch(() => {});
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };

  const handleOpenAddModal = () => {
    if (onAddTransaction) {
      onAddTransaction();
    } else {
      setIsAddModalOpen(true);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {showRequestProgress && (
        <LinearProgress aria-label="Loading" sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: (theme) => theme.zIndex.modal + 2 }} />
      )}
      {/* Top Fixed Navbar */}
      <Navbar
        onDrawerToggle={handleDrawerToggle}
        activePage={activePage}
        onAddTransaction={handleOpenAddModal}
      />

      {/* Navigation Sidebar Drawer */}
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={handleDrawerClose}
        activePage={activePage}
        onPageChange={onPageChange}
        onAddTransaction={handleOpenAddModal}
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
          {children || <Outlet />}
        </Box>
      </Box>

      {/* Add Transaction Dialog accessible from anywhere */}
      <AddTransactionModal
        open={isAddModalOpen}
        dbCategories={dbCategories}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          window.dispatchEvent(new CustomEvent('transaction-updated'));
        }}
      />
    </Box>
  );
};

export default Layout;
