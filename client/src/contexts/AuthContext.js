import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Configuração base do axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkLoggedIn = async () => {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await api.get('/auth/verify-token');
        // Normalize user data structure to ensure consistent property names
        const userData = response.data.user;
        setUser({
          id: userData.id,
          nome: userData.name || userData.nome,
          login: userData.username || userData.login,
          nivel_acesso: userData.role || userData.nivel_acesso
        });
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };
    
    checkLoggedIn();
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/auth/login', credentials);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        // Atualiza o estado do usuário com os dados corretos
        const userData = response.data.user;
        setUser(userData);
        
        return userData;
      } else {
        throw new Error('Token não recebido do servidor');
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      setError(error.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.');
      toast.error(error.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const hasPermission = (requiredRoles) => {
    if (!user) return false;
    
    if (!requiredRoles || requiredRoles.length === 0) return true;
    
    if (user.nivel_acesso === 'admin') return true;
    
    return requiredRoles.includes(user.nivel_acesso);
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};