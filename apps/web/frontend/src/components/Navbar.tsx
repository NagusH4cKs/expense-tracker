import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Button,
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { DRAWER_WIDTH, NavigationPage } from './Sidebar';

interface NavbarProps {
  onDrawerToggle: () => void;
  activePage?: NavigationPage;
  onAddTransaction: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onDrawerToggle,
  activePage,
  onAddTransaction,
}) => {
  const location = useLocation();

  const currentNavPage: NavigationPage = activePage || (() => {
    if (location.pathname.startsWith('/transactions')) return 'transactions';
    if (location.pathname.startsWith('/categories')) return 'categories';
    if (location.pathname.startsWith('/import')) return 'import';
    return 'dashboard';
  })();

  const titles: Record<NavigationPage, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Financial Dashboard',
      subtitle: 'Overview, cash flow, and quick insights',
    },
    transactions: {
      title: 'Transactions Ledger',
      subtitle: 'Review, search, filter, and import bank records',
    },
    categories: {
      title: 'Category & Group Master',
      subtitle: 'Manage parent categories and their grouped sub-items',
    },
    import: {
      title: 'Import Bank Statement',
      subtitle: 'Upload CSV or Excel, auto-map columns, classify categories & prevent duplicates',
    },
  };

  const { title: pageTitle, subtitle: pageSubtitle } = titles[currentNavPage] || titles.dashboard;

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { md: `${DRAWER_WIDTH}px` },
        bgcolor: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e2e8f0',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          minHeight: { xs: 64, sm: 70 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Left: Mobile Menu Toggle & Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <IconButton
            color="inherit"
            aria-label="open navigation drawer"
            edge="start"
            onClick={onDrawerToggle}
            sx={{
              display: { md: 'none' },
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              p: 1,
            }}
          >
            <MenuRoundedIcon fontSize="small" />
          </IconButton>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              component="h1"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.05rem', sm: '1.25rem' },
                lineHeight: 1.2,
                color: 'text.primary',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {pageTitle}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: { xs: 'none', sm: 'block' },
                fontSize: '0.78rem',
              }}
            >
              {pageSubtitle}
            </Typography>
          </Box>
        </Box>

        {/* Right Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>


          <Button
            variant="contained"
            color="primary"
            startIcon={<AddRoundedIcon />}
            onClick={onAddTransaction}
            sx={{
              whiteSpace: 'nowrap',
              display: { xs: 'inline-flex' },
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              py: { xs: 0.7, sm: 1 },
              px: { xs: 1.5, sm: 2 },
            }}
          >
            Add
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
