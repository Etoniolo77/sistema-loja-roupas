import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Paper, Typography, Button, Card, CardContent, CircularProgress, 
         IconButton, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import axios from 'axios';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

// Registrar elementos do Chart.js
Chart.register(...registerables);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes');
  const [dashboard, setDashboard] = useState(null);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  useEffect(() => {
    loadDashboard();
  }, [periodo]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/dashboard?periodo=${periodo}`);
      setDashboard(response.data);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboard();
  };

  const handlePeriodoChange = (event) => {
    setPeriodo(event.target.value);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Preparação de dados para os gráficos
  const vendasPorDiaData = {
    labels: dashboard?.graficos.vendas_por_dia.map(item => {
      const date = new Date(item.dia);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }) || [],
    datasets: [
      {
        label: 'Valor Total (R$)',
        data: dashboard?.graficos.vendas_por_dia.map(item => item.valor_total) || [],
        fill: false,
        backgroundColor: 'rgba(44, 120, 184, 0.8)',
        borderColor: 'rgba(44, 120, 184, 1)',
        tension: 0.4,
      },
    ],
  };

  const produtosMaisVendidosData = {
    labels: dashboard?.graficos.produtos_mais_vendidos.map(item => `${item.nome} (${item.tamanho})`) || [],
    datasets: [
      {
        label: 'Quantidade Vendida',
        data: dashboard?.graficos.produtos_mais_vendidos.map(item => item.quantidade_vendida) || [],
        backgroundColor: [
          'rgba(44, 120, 184, 0.8)',
          'rgba(255, 138, 0, 0.8)',
          'rgba(46, 184, 92, 0.8)',
          'rgba(156, 39, 176, 0.8)',
          'rgba(233, 30, 99, 0.8)',
          'rgba(33, 150, 243, 0.8)',
          'rgba(121, 85, 72, 0.8)',
          'rgba(0, 150, 136, 0.8)',
          'rgba(76, 175, 80, 0.8)',
          'rgba(255, 193, 7, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const vendasPorTamanhoData = {
    labels: dashboard?.graficos.vendas_por_tamanho.map(item => item.tamanho) || [],
    datasets: [
      {
        label: 'Quantidade Vendida',
        data: dashboard?.graficos.vendas_por_tamanho.map(item => item.quantidade_vendida) || [],
        backgroundColor: [
          'rgba(44, 120, 184, 0.8)',
          'rgba(255, 138, 0, 0.8)',
          'rgba(46, 184, 92, 0.8)',
          'rgba(156, 39, 176, 0.8)',
          'rgba(233, 30, 99, 0.8)',
          'rgba(33, 150, 243, 0.8)',
          'rgba(121, 85, 72, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const periodoTexto = {
    semana: 'última semana',
    mes: 'último mês',
    trimestre: 'último trimestre',
    ano: 'último ano',
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
        <Typography variant="h4" component="h1">Dashboard</Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel id="periodo-label">Período</InputLabel>
            <Select
              labelId="periodo-label"
              id="periodo-select"
              value={periodo}
              label="Período"
              onChange={handlePeriodoChange}
              size="small"
            >
              <MenuItem value="semana">Última Semana</MenuItem>
              <MenuItem value="mes">Último Mês</MenuItem>
              <MenuItem value="trimestre">Último Trimestre</MenuItem>
              <MenuItem value="ano">Último Ano</MenuItem>
            </Select>
          </FormControl>
          
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
          
          {hasPermission(['admin', 'vendedor']) && (
            <Button 
              variant="contained" 
              startIcon={<ShoppingCartIcon />}
              onClick={() => navigate('/vendas/nova')}
            >
              Nova Venda
            </Button>
          )}
        </Box>
      </Box>

      {/* Cards de resumo */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="text.secondary">
                  Vendas ({periodoTexto[periodo]})
                </Typography>
                <ShoppingCartIcon color="primary" />
              </Box>
              
              <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                {dashboard?.resumo.vendas_periodo.total_vendas || 0}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Total: {formatCurrency(dashboard?.resumo.vendas_periodo.valor_total)}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                {Number(dashboard?.resumo.comparacao_anterior.vendas.variacao) >= 0 ? (
                  <ArrowUpwardIcon fontSize="small" color="success" />
                ) : (
                  <ArrowDownwardIcon fontSize="small" color="error" />
                )}
                <Typography 
                  variant="body2" 
                  color={Number(dashboard?.resumo.comparacao_anterior.vendas.variacao) >= 0 ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(Number(dashboard?.resumo.comparacao_anterior.vendas.variacao)).toFixed(1)}% em relação ao período anterior
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="text.secondary">
                  Faturamento ({periodoTexto[periodo]})
                </Typography>
                <Typography variant="h5" color="primary">R$</Typography>
              </Box>
              
              <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                {formatCurrency(dashboard?.resumo.vendas_periodo.valor_total).replace('R$', '')}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Ticket médio: {formatCurrency((dashboard?.resumo.vendas_periodo.valor_total || 0) / 
                               (dashboard?.resumo.vendas_periodo.total_vendas || 1))}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                {Number(dashboard?.resumo.comparacao_anterior.valor.variacao) >= 0 ? (
                  <ArrowUpwardIcon fontSize="small" color="success" />
                ) : (
                  <ArrowDownwardIcon fontSize="small" color="error" />
                )}
                <Typography 
                  variant="body2" 
                  color={Number(dashboard?.resumo.comparacao_anterior.valor.variacao) >= 0 ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(Number(dashboard?.resumo.comparacao_anterior.valor.variacao)).toFixed(1)}% em relação ao período anterior
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="text.secondary">
                  Estoque
                </Typography>
                <InventoryIcon color="primary" />
              </Box>
              
              <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                {dashboard?.resumo.estoque.total_produtos || 0}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Produtos cadastrados
              </Typography>
              
              <Typography variant="body2" color="error" sx={{ mb: 0.5 }}>
                {dashboard?.resumo.estoque.estoque_baixo || 0} produtos com estoque baixo
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Valor em estoque: {formatCurrency(dashboard?.resumo.estoque.valor_estoque)}
              </Typography>
              
              {hasPermission(['admin', 'estoquista']) && (
                <Button 
                  variant="outlined" 
                  size="small" 
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/estoque')}
                >
                  Gerenciar Estoque
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Vendas por Dia</Typography>
            <Box sx={{ height: 300, position: 'relative' }}>
              <Line 
                data={vendasPorDiaData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Vendas por Tamanho</Typography>
            <Box sx={{ height: 300, position: 'relative' }}>
              <Pie 
                data={vendasPorTamanhoData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                    },
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Produtos Mais Vendidos</Typography>
            <Box sx={{ height: 400, position: 'relative' }}>
              <Bar 
                data={produtosMaisVendidosData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
