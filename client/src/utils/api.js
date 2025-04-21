import axios from 'axios';

// Cria uma instância do Axios com configurações básicas
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para logar detalhes de cada requisição
api.interceptors.request.use(
  config => {
    console.log('Requisição API:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      headers: config.headers,
      params: config.params,
      data: config.data
    });
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    console.error('Erro na requisição:', error);
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros
api.interceptors.response.use(
  response => response,
  error => {
    const { response } = error;
    
    // Se o erro for de autenticação (401), limpa o token e redireciona para o login
    if (response && response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      
      // Se não estiver na página de login, redireciona
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;