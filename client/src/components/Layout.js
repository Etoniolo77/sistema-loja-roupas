import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CssBaseline, Toolbar, Typography, Divider, IconButton, List, 
         Drawer, AppBar, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import SettingsIcon from '@mui/icons-material/Settings';
import CategoryIcon from '@mui/icons-material/Category';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';

import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import MenuItem from './MenuItem';
import { ThemeContext } from '../contexts/ThemeContext';

const drawerWidth = 240;

const Layout = () => {
  const [open, setOpen] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { mode, toggleTheme } = React.useContext(ThemeContext);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Lista de itens de menu simplificada
  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      requiredRoles: [],
    },
    {
      text: 'Vendas',
      icon: <ShoppingCartIcon />,
      path: '/vendas',
      requiredRoles: ['admin', 'vendedor'],
    },
    {
      text: 'Clientes',
      icon: <PeopleIcon />,
      path: '/clientes',
      requiredRoles: ['admin', 'vendedor'],
    },
    {
      text: 'Produtos',
      icon: <CategoryIcon />,
      path: '/produtos',
      requiredRoles: [],
    },
    {
      text: 'Fornecedores',
      icon: <LocalShippingIcon />,
      path: '/fornecedores',
      requiredRoles: ['admin', 'estoquista'],
    },
    {
      text: 'Estoque',
      icon: <InventoryIcon />,
      path: '/estoque',
      requiredRoles: ['admin', 'estoquista'],
    },
    {
      text: 'Inventário',
      icon: <QrCodeScannerIcon />,
      path: '/inventario',
      requiredRoles: ['admin', 'estoquista'],
    },
    {
      text: 'Encomendas',
      icon: <BookmarkIcon />,
      path: '/encomendas',
      requiredRoles: ['admin', 'vendedor'],
    },
    {
      text: 'Devoluções',
      icon: <AssignmentReturnIcon />,
      path: '/devolucoes',
      requiredRoles: ['admin', 'vendedor'],
    },
    {
      text: 'Importação',
      icon: <CloudUploadIcon />,
      path: '/importacao',
      requiredRoles: ['admin'],
    },
    {
      text: 'Relatórios',
      icon: <AssessmentIcon />,
      path: '/relatorios',
      requiredRoles: ['admin'],
    },
    {
      text: 'Usuários',
      icon: <SupervisorAccountIcon />,
      path: '/usuarios',
      requiredRoles: ['admin'],
    },
    {
      text: 'Configurações',
      icon: <SettingsIcon />,
      path: '/configuracoes',
      requiredRoles: ['admin'],
    },
  ];

  // Filtrando apenas os itens que o usuário tem permissão
  const filteredMenuItems = menuItems.filter(item => hasPermission(item.requiredRoles));

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerOpen}
            sx={{ mr: 2, ...(open && !isMobile && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Sistema de Gerenciamento - Dalô Modas
          </Typography>
          <IconButton color="inherit" onClick={toggleTheme}>
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <Typography variant="body1" sx={{ mr: 2 }}>
            Olá, {user?.nome || 'Usuário'}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={isMobile ? open : true}
        onClose={handleDrawerClose}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', pt: 1 }}>
          {isMobile && (
            <IconButton onClick={handleDrawerClose}>
              <ChevronLeftIcon />
            </IconButton>
          )}
          <Divider />
          <List>
            {filteredMenuItems.map((item) => (
              <MenuItem
                key={item.text}
                text={item.text}
                icon={item.icon}
                path={item.path}
                onClick={isMobile ? handleDrawerClose : undefined}
              />
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
