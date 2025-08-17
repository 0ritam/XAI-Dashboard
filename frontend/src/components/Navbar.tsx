import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Avatar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Analytics,
  Psychology,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <DashboardIcon />,
    },
    {
      label: 'What-If Analysis',
      path: '/what-if',
      icon: <Analytics />,
    },
  ];

  return (
    <AppBar position="static" elevation={0} sx={{ backgroundColor: 'white', borderBottom: '1px solid #e0e0e0' }}>
      <Container maxWidth="xl">
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          {/* Logo Section */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <Psychology />
            </Avatar>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 'bold',
                color: 'text.primary',
                letterSpacing: '-0.5px',
              }}
            >
              XAI Dashboard
            </Typography>
          </Box>

          {/* Navigation Items */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                sx={{
                  color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
                  backgroundColor: location.pathname === item.path ? 'primary.light' : 'transparent',
                  '&:hover': {
                    backgroundColor: location.pathname === item.path ? 'primary.light' : 'action.hover',
                  },
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  fontWeight: location.pathname === item.path ? 600 : 400,
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Right Section */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              Student Performance AI
            </Typography>
            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
              AI
            </Avatar>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
