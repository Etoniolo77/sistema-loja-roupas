import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <Paper sx={{ p: 5, textAlign: 'center', maxWidth: '500px' }}>
        <ErrorOutlineIcon sx={{ fontSize: 100, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Página não encontrada
        </Typography>
        <Typography variant="body1" paragraph>
          A página que você está tentando acessar não existe ou foi movida.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 2 }}
        >
          Voltar ao Dashboard
        </Button>
      </Paper>
    </Box>
  );
};

export default NotFound;