import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// Criação do contexto
export const AuthContext = createContext();

// Hook para usar o contexto de autenticação
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar se o usuário já está logado (ao carregar a aplicação)
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
        // Configura o token para todas as requisições
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Verifica se o token é válido
        const response = await axios.get('/api/auth/me');
        
        if (response.data.usuario) {
          setUser(response.data.usuario);
        } else {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };
    
    checkLoggedIn();
  }, []);

  // Função de login
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/auth/login', credentials);
      
      // Salva o token no localStorage
      localStorage.setItem('token', response.data.token);
      
      // Configura o token para todas as requisições
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      // Atualiza o estado com as informações do usuário
      setUser(response.data.usuario);
      
      return response.data.usuario;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      setError(error.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.');
      toast.error(error.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Função de logout
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Verificar permissões
  const hasPermission = (requiredRoles) => {
    if (!user) return false;
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    
    if (user.nivel_acesso === 'admin') {
      return true;
    }
    
    return requiredRoles.includes(user.nivel_acesso);
  };

  // Dados e funções que serão disponibilizados pelo contexto
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
