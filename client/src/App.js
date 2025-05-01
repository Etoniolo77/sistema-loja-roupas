import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Contextos
import { AuthProvider } from './contexts/AuthContext';
import { ThemeContext } from './contexts/ThemeContext';

// Componentes
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vendas from './pages/Vendas';
import NovaVenda from './pages/NovaVenda';
import VendaDetalhes from './pages/VendaDetalhes';
import PagamentosPendentes from './pages/PagamentosPendentes';
import Produtos from './pages/Produtos';
import Clientes from './pages/Clientes';
import Estoque from './pages/Estoque';
import Relatorios from './pages/Relatorios';
import Usuarios from './pages/Usuarios';
import Configuracoes from './pages/Configuracoes';
import NotFound from './pages/NotFound';
import Devolucoes from './pages/Devolucoes';
import DetalhesDevolucao from './pages/DetalhesDevolucao';
import ImportacaoDados from './pages/ImportacaoDados';
import Inventario from './pages/Inventario';
import Fornecedores from './pages/Fornecedores';
import Encomendas from './pages/Encomendas';

function App() {
  const [mode, setMode] = useState(localStorage.getItem('themeMode') || 'light');

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#2c78b8',
          },
          secondary: {
            main: '#ff8a00',
          },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontSize: '2.2rem',
            fontWeight: 500,
          },
          h2: {
            fontSize: '1.8rem',
            fontWeight: 500,
          },
          h3: {
            fontSize: '1.5rem',
            fontWeight: 500,
          },
          h4: {
            fontSize: '1.3rem',
            fontWeight: 500,
          },
          h5: {
            fontSize: '1.1rem',
            fontWeight: 500,
          },
          h6: {
            fontSize: '1rem',
            fontWeight: 500,
          },
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                boxShadow: mode === 'light' 
                  ? '0 2px 8px rgba(0, 0, 0, 0.1)'
                  : '0 2px 8px rgba(0, 0, 0, 0.4)',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 6,
                textTransform: 'none',
                fontWeight: 500,
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              head: {
                fontWeight: 600,
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                
                <Route path="vendas">
                  <Route index element={<Vendas />} />
                  <Route path="nova" element={<NovaVenda />} />
                  <Route path=":id" element={<VendaDetalhes />} />
                  <Route path="pendentes" element={<PagamentosPendentes />} />
                </Route>
                
                <Route path="devolucoes">
                  <Route index element={<Devolucoes />} />
                  <Route path="nova" element={<Devolucoes />} />
                  <Route path=":id" element={<DetalhesDevolucao />} />
                </Route>
                
                <Route path="produtos" element={<Produtos />} />
                <Route path="clientes">
                  <Route index element={<Clientes />} />
                  <Route path="novo" element={<Clientes />} />
                </Route>
                <Route path="estoque" element={<Estoque />} />
                <Route path="relatorios" element={<Relatorios />} />
                <Route path="usuarios" element={<Usuarios />} />
                <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="configuracoes/acesso" element={<Configuracoes />} />
                <Route path="importacao" element={<ImportacaoDados />} />
                <Route path="inventario" element={<Inventario />} />
                <Route path="fornecedores" element={<Fornecedores />} />
                <Route path="encomendas" element={<Encomendas />} />
              </Route>
              
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App;