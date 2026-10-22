import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Fade,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  PersonRounded,
  LockRounded,
  KeyRounded,
  StorageRounded,
  ArrowForwardRounded,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setLoading(true);

    try {
      const result = await login({ username: username.trim(), password });
      if (result.success) {
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setErrorMessage(result.message || 'Invalid username or password');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #090d16 100%)',
        overflow: 'hidden',
        px: 2,
        py: 4,
      }}
    >
      {/* Dynamic Animated Ambient Orbs */}
      <Box
        sx={{
          position: 'absolute',
          top: '-10%',
          left: '15%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.28) 0%, rgba(99, 102, 241, 0) 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-15%',
          right: '15%',
          width: 550,
          height: 550,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.22) 0%, rgba(168, 85, 247, 0) 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '40%',
          right: '5%',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, rgba(14, 165, 233, 0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Glassmorphic Card Container */}
      <Card
        elevation={0}
        sx={{
          maxWidth: 440,
          width: '100%',
          position: 'relative',
          zIndex: 1,
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Top Gradient Accent Bar */}
        <Box
          sx={{
            height: 6,
            width: '100%',
            background: 'linear-gradient(90deg, #4f46e5, #8b5cf6, #06b6d4, #10b981)',
          }}
        />

        <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3.5 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                mx: 'auto',
                mb: 2,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
              }}
            >
              <KeyRounded sx={{ fontSize: 30 }} />
            </Box>

            <Typography
              variant="h5"
              component="h1"
              sx={{
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                mb: 0.5,
              }}
            >
              Sign In
            </Typography>

            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Enter your credentials to access your dashboard
            </Typography>
          </Box>

          {/* Error Alert */}
          {errorMessage && (
            <Fade in={!!errorMessage}>
              <Alert
                severity="error"
                onClose={() => setErrorMessage(null)}
                sx={{ mb: 3, borderRadius: 2, fontSize: '0.85rem' }}
              >
                {errorMessage}
              </Alert>
            </Fade>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              id="login-input-username"
              label="Username"
              fullWidth
              required
              autoFocus
              size="medium"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. name or email"
              sx={{ mb: 2.5 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonRounded sx={{ color: '#6366f1' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              id="login-input-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              size="medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockRounded sx={{ color: '#6366f1' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: '#94a3b8' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              id="login-submit-btn"
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              endIcon={!loading && <ArrowForwardRounded />}
              sx={{
                py: 1.4,
                fontSize: '0.98rem',
                fontWeight: 700,
                borderRadius: 2.5,
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                boxShadow: '0 8px 20px rgba(79, 70, 229, 0.35)',
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)',
                  boxShadow: '0 10px 24px rgba(79, 70, 229, 0.45)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#ffffff' }} />
              ) : (
                'Sign In to Dashboard'
              )}
            </Button>
          </Box>

          {/* Database Footer Indicator */}
          <Box
            sx={{
              mt: 3.5,
              pt: 2.5,
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <StorageRounded sx={{ fontSize: 16, color: '#10b981' }} />
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
              Connected to Neon PostgreSQL Database
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
