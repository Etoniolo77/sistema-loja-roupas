import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, Paper, Container, 
         CssBaseline, Avatar, CircularProgress, Alert } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import axios from 'axios';

// Importa a instância configurada do axios
import api from '../utils/api';

const Login = () => {
  const [formData, setFormData] = useState({
    login: '',
    senha: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const navigate = useNavigate();
  const { mode, toggleTheme } = React.useContext(ThemeContext);
  const auth = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setLoading(true);

    try {
      await auth.login(formData);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Erro detalhado:', error);
      
      if (!error.response) {
        setSubmitError('Não foi possível conectar ao servidor. Verifique se o servidor está rodando na porta 5000.');
      } else if (error.response.status === 401) {
        setSubmitError(error.response.data.message || 'Usuário ou senha inválidos.');
      } else {
        setSubmitError(error.response?.data?.message || 'Erro ao fazer login. Por favor, tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <Button
            color="primary"
            onClick={toggleTheme}
            startIcon={mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          >
            {mode === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </Button>
        </Box>
        
        <Paper 
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
            width: '100%',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Login - Dalô Modas
          </Typography>
          
          {submitError && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {submitError}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="login"
              label="Usuário"
              name="login"
              autoComplete="username"
              autoFocus
              value={formData.login}
              onChange={handleChange}
              error={!!errors.login}
              helperText={errors.login}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="senha"
              label="Senha"
              type="password"
              id="senha"
              autoComplete="current-password"
              value={formData.senha}
              onChange={handleChange}
              error={!!errors.senha}
              helperText={errors.senha}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Entrar'}
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Acesso padrão: usuário "admin", senha "admin123"
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;