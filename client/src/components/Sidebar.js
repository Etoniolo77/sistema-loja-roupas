import React from 'react';
import { Box, List } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BarChartIcon from '@mui/icons-material/BarChart';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { useAuth } from '../contexts/AuthContext';
import MenuItem from './MenuItem';

const Sidebar = () => {
  const { user } = useAuth();
  const isAdmin = user?.nivel_acesso === 'admin';

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Produtos', icon: <InventoryIcon />, path: '/produtos' },
    { text: 'Fornecedores', icon: <LocalShippingIcon />, path: '/fornecedores' },
    { text: 'Clientes', icon: <PeopleIcon />, path: '/clientes' },
    { text: 'Vendas', icon: <ShoppingCartIcon />, path: '/vendas' },
    { text: 'Encomendas', icon: <BookmarkIcon />, path: '/encomendas' },
    { text: 'Devoluções', icon: <AssignmentReturnIcon />, path: '/devolucoes' },
    { text: 'Relatórios', icon: <BarChartIcon />, path: '/relatorios' },
    { text: 'Usuários', icon: <PersonIcon />, path: '/usuarios' },
    isAdmin && { text: 'Configurações', icon: <SettingsIcon />, path: '/configuracoes' },
    isAdmin && { text: 'Controle de Acesso', icon: <SettingsIcon />, path: '/configuracoes/acesso' },
  ].filter(Boolean);

  return (
    <Box sx={{ width: 250, bgcolor: 'background.paper', height: '100vh', p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <img src="/path/to/logo.png" alt="Logo" style={{ width: '100%', height: 'auto' }} />
      </Box>
      <List>
        {menuItems.map((item) => (
          <MenuItem
            key={item.text}
            text={item.text}
            icon={item.icon}
            path={item.path}
          />
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;