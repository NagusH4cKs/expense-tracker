import React from 'react';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Button,
  Chip,
  Avatar,
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';

import { useLocation, useNavigate } from 'react-router-dom';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';

export const DRAWER_WIDTH = 260;

export type NavigationPage = 'dashboard' | 'transactions' | 'categories' | 'import';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  activePage?: NavigationPage;
  onPageChange?: (page: NavigationPage) => void;
  onAddTransaction: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onClose,
  activePage,
  onPageChange,
  onAddTransaction,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      id: 'dashboard' as const,
      path: '/dashboard',
      label: 'Dashboard',
      icon: <DashboardRoundedIcon />,
    },
    {
      id: 'transactions' as const,
      path: '/transactions',
      label: 'Transactions',
      icon: <ReceiptLongRoundedIcon />,
    },
    {
      id: 'categories' as const,
      path: '/categories',
      label: 'Category & Group Master',
      icon: <CategoryRoundedIcon />,
    },
    {
      id: 'import' as const,
      path: '/import',
      label: 'Import Statement',
      icon: <UploadFileRoundedIcon />,
    },
  ];

  const handleNavClick = (item: (typeof navItems)[number]) => {
    navigate(item.path);
    if (onPageChange) onPageChange(item.id);
    onClose();
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#ffffff',
      }}
    >
      {/* Brand Header */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2.5,
            bgcolor: 'primary.main',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
          }}
        >
          <AccountBalanceWalletRoundedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Expense Tracker
          </Typography>
          <Chip
            label="Personal Web"
            size="small"
            color="primary"
            variant="outlined"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 600,
              mt: 0.4,
              borderColor: 'primary.light',
            }}
          />
        </Box>
      </Box>

      <Divider sx={{ mx: 2 }} />

      {/* Navigation List */}
      <Box sx={{ px: 2, py: 2, flexGrow: 1 }}>
        <Typography
          variant="caption"
          sx={{
            px: 1.5,
            color: 'text.secondary',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.7rem',
          }}
        >
          Menu
        </Typography>

        <List sx={{ mt: 1, p: 0 }}>
          {navItems.map((item) => {
            const isActive =
              item.id === 'dashboard'
                ? location.pathname === '/' || location.pathname.startsWith('/dashboard')
                : location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.8 }}>
                <ListItemButton
                  onClick={() => handleNavClick(item)}
                  selected={isActive}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    px: 1.5,
                    color: isActive ? 'primary.main' : 'text.primary',
                    bgcolor: isActive ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    '&:hover': {
                      bgcolor: isActive
                        ? 'rgba(79, 70, 229, 0.12)'
                        : 'rgba(0, 0, 0, 0.04)',
                    },
                    '&.Mui-selected': {
                      bgcolor: 'rgba(79, 70, 229, 0.08)',
                      '&:hover': {
                        bgcolor: 'rgba(79, 70, 229, 0.12)',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 38,
                      color: isActive ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: {
                        sx: {
                          fontSize: '0.88rem',
                          fontWeight: isActive ? 600 : 500,
                        },
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {/* Quick Accounts Info */}
        <Box
          sx={{
            mt: 3,
            p: 1.5,
            borderRadius: 2,
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CreditCardRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Connected Accounts
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
            <Chip
              label="ICICI"
              size="small"
              sx={{ height: 22, fontSize: '0.75rem', bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 600 }}
            />
            <Chip
              label="SBI"
              size="small"
              sx={{ height: 22, fontSize: '0.75rem', bgcolor: '#ecfdf5', color: '#065f46', fontWeight: 600 }}
            />
          </Box>
        </Box>
      </Box>

      {/* Bottom Action & Profile */}
      <Box sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<AddRoundedIcon />}
          onClick={() => {
            onAddTransaction();
            onClose();
          }}
          sx={{
            py: 1.2,
            mb: 2,
            fontWeight: 600,
          }}
        >
          Add Transaction
        </Button>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 0.5 }}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'primary.light',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            P
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              Personal User
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
              PostgreSQL Connected
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      aria-label="navigation mailbox folders"
    >
      {/* Temporary Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: '1px solid #e2e8f0',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Permanent Desktop Drawer */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: '1px solid #e2e8f0',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};
