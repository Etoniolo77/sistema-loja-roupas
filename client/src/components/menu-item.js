import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';

const MenuItem = ({ text, icon, path, onClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleClick = () => {
    navigate(path);
    if (onClick) onClick();
  };

  return (
    <ListItem disablePadding>
      <ListItemButton
        selected={isActive}
        onClick={handleClick}
        sx={{
          '&.Mui-selected': {
            backgroundColor: 'rgba(44, 120, 184, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(44, 120, 184, 0.2)',
            },
          },
        }}
      >
        <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'inherit' }}>
          {icon}
        </ListItemIcon>
        <ListItemText 
          primary={text} 
          primaryTypographyProps={{
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'primary.main' : 'inherit',
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

export default MenuItem;
