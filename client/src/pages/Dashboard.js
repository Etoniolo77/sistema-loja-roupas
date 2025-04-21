import React, { useState, useEffect, Suspense } from 'react';
import { 
  Container, Typography, Box, Paper, Grid,
  CircularProgress, FormControl, InputLabel, Select, MenuItem, Button,
  IconButton, Divider
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Tooltip, 
  Legend, CartesianGrid, XAxis, YAxis, ResponsiveContainer,
  Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

// Componente de fallback para erros
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o estado para que a próxima renderização mostre a UI alternativa
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Você também pode registrar o erro em um serviço de relatório de erros
    console.error("Erro capturado pelo ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Interface de fallback para erros
      return (
        <Box p={3} bgcolor="#fff8f8" borderRadius={1} mb={2}>
          <Typography variant="h6" color="error" gutterBottom>
            Algo deu errado ao renderizar este componente
          </Typography>
          <Typography variant="body2" mb={2}>
            {this.state.error && this.state.error.toString()}
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            Tentar Novamente
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Componente para fallback de carregamento
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" p={2}>
    <CircularProgress size={24} sx={{ mr: 1 }} />
    <Typography>Carregando...</Typography>
  </Box>
);

const DashboardContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [periodo, setPeriodo] = useState('mes');
  const [renderError, setRenderError] = useState(null);
  const [serverStatus, setServerStatus] = useState('unknown');

  // Log para verificar a configuração da API
  console.log('Configuração da API:', {
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    NODE_ENV: process.env.NODE_ENV
  });

  // Objeto periodoTexto
  const periodoTexto = {
    semana: 'Última Semana',
    mes: 'Último Mês',
    trimestre: 'Último Trimestre',
    ano: 'Último Ano'
  };

  // Função simplificada para carregar os dados do dashboard
  const loadDashboard = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      console.log("Iniciando carregamento do dashboard para o período:", periodo);
      console.log("URL base da API:", api.defaults.baseURL);

      // Verificar o status do servidor primeiro
      try {
        const statusResponse = await api.get('/status');
        console.log("Status do servidor:", statusResponse.data);
      } catch (statusError) {
        console.error("Erro ao verificar status do servidor:", statusError);
        setLoadError("Não foi possível conectar ao servidor. Verifique se o servidor está rodando.");
        setLoading(false);
        return;
      }

      // Se chegou aqui, o servidor está respondendo
      // Remover o /api do início da URL, pois já está incluído na baseURL
      const response = await api.get(`/dashboard?periodo=${periodo}`);
      
      console.log("Resposta do dashboard:", response.data);

      // Verificar se a resposta contém dados válidos
      if (!response.data || typeof response.data !== 'object') {
        console.error("Resposta inválida do servidor:", response.data);
        setRenderError("Os dados recebidos do servidor estão em formato inválido.");
        setDashboard(null);
      } else {
        setDashboard(response.data);
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      
      // Mensagem de erro mais detalhada
      if (error.response) {
        // O servidor respondeu com um status de erro
        console.error("Detalhes da resposta de erro:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
        setLoadError(`Erro ${error.response.status}: ${error.response.data?.message || 'Erro ao carregar os dados'}`);
      } else if (error.request) {
        // A requisição foi feita mas não houve resposta
        console.error("Sem resposta do servidor:", error.request);
        setLoadError("Servidor não respondeu à requisição. Verifique sua conexão de internet.");
      } else {
        // Erro ao configurar a requisição
        setLoadError(`Erro ao fazer a requisição: ${error.message}`);
      }
      
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  // UseEffect simplificado
  useEffect(() => {
    // Verifica o status do servidor antes de carregar o dashboard
    const checkServerStatus = async () => {
      try {
        // Tenta acessar a rota de status do servidor
        // Observe que baseURL já inclui http://localhost:5000/api, então não precisamos incluir /api
        const statusResponse = await api.get('/status', { timeout: 5000 });
        console.log('Status do servidor:', statusResponse.data);
        
        // Se o servidor estiver online, carrega o dashboard
        setServerStatus('online');
        loadDashboard();
      } catch (error) {
        console.error('Erro ao verificar status do servidor:', error);
        setServerStatus('offline');
        setLoadError('Servidor não está disponível. Verifique se o backend está rodando.');
        setLoading(false);
      }
    };
    
    checkServerStatus();
  }, []);

  // Funções handlers simplificadas
  const handleRefresh = () => {
    try {
      loadDashboard();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      setRenderError(`Erro ao atualizar: ${error.message}`);
    }
  };

  const handlePeriodoChange = (event) => {
    try {
      setPeriodo(event.target.value);
      loadDashboard();
    } catch (error) {
      console.error('Erro ao mudar período:', error);
      setRenderError(`Erro ao mudar período: ${error.message}`);
    }
  };

  // Função formatadora simplificada
  const formatCurrency = (value) => {
    try {
      if (value === undefined || value === null) {
        return 'R$ 0,00';
      }
      return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(value);
    } catch (error) {
      console.error('Erro ao formatar valor:', error);
      return 'R$ 0,00';
    }
  };

  // Função para verificar se um elemento é um objeto React válido
  const isValidElement = (element) => {
    return React.isValidElement(element) || 
           typeof element === 'string' || 
           typeof element === 'number' ||
           element === null ||
           element === undefined;
  };

  // Verificar componentes antes de renderização
  const safeRender = (component) => {
    try {
      if (!isValidElement(component)) {
        console.warn('Tentativa de renderizar um componente inválido:', component);
        return null;
      }
      return component;
    } catch (error) {
      console.error('Erro ao validar componente:', error);
      return null;
    }
  };

  // Função para verificar se os dados do gráfico são válidos
  const isValidChartData = (data) => {
    return Array.isArray(data) && data.length > 0;
  };

  // Renderização segura para botões e outros componentes MUI
  const renderSafeButton = (icon, label, onClick) => {
    try {
      // Verifica se o ícone é um elemento React válido
      const safeIcon = React.isValidElement(icon) ? icon : null;
      
      return (
        <Button
          variant="contained"
          startIcon={safeIcon}
          onClick={onClick}
        >
          {label}
        </Button>
      );
    } catch (error) {
      console.error('Erro ao renderizar botão:', error);
      return null;
    }
  };

  // Se houver erro de renderização, exiba-o
  if (renderError) {
    return (
      <Container>
        <Paper style={{ padding: 20, marginTop: 20 }}>
          <Typography variant="h5" color="error">Erro de Renderização</Typography>
          <Typography>{renderError}</Typography>
        </Paper>
      </Container>
    );
  }

  // Se estiver carregando, exiba um indicador de carregamento
  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress />
          <Typography variant="h6" style={{ marginLeft: 20 }}>Carregando dashboard...</Typography>
        </Box>
      </Container>
    );
  }

  // Se houver erro de carregamento, exiba-o
  if (loadError) {
    return (
      <Container>
        <Paper style={{ padding: 20, marginTop: 20 }}>
          <Typography variant="h5" color="error">Erro ao Carregar Dados</Typography>
          <Typography>{loadError}</Typography>
          {safeRender(
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleRefresh}
              startIcon={<RefreshIcon />}
            >
              Tentar Novamente
            </Button>
          )}
        </Paper>
      </Container>
    );
  }

  // Preparar dados para os gráficos
  const prepareVendasPorDiaData = () => {
    if (!dashboard || !dashboard.graficos.vendas_por_dia) return [];
    
    return dashboard.graficos.vendas_por_dia.map(item => ({
      dia: item.dia,
      valor: item.valor_total
    }));
  };

  const prepareProdutosMaisVendidosData = () => {
    if (!dashboard || !dashboard.graficos.produtos_mais_vendidos) return [];
    
    return dashboard.graficos.produtos_mais_vendidos.map(item => ({
      nome: `${item.nome} (${item.tamanho})`,
      quantidade: item.quantidade_vendida
    }));
  };

  const prepareVendasPorTamanhoData = () => {
    if (!dashboard || !dashboard.graficos.vendas_por_tamanho) return [];
    
    return dashboard.graficos.vendas_por_tamanho.map(item => ({
      tamanho: item.tamanho,
      quantidade: item.quantidade_vendida
    }));
  };

  // Cores para os gráficos
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
    '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'
  ];

  // Opções comuns para gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.raw;
            return `${label}: ${value}`;
          }
        }
      }
    }
  };

  // Modificar o return para usar as funções de renderização segura
  return (
    <Container>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : renderError ? (
          <Paper sx={{ p: 3, bgcolor: '#fff8f8' }}>
            <Typography color="error">
              {renderError}
            </Typography>
          </Paper>
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <FormControl variant="outlined" sx={{ minWidth: 150 }}>
                <InputLabel>Período</InputLabel>
                <Select
                  value={periodo}
                  onChange={handlePeriodoChange}
                  label="Período"
                >
                  <MenuItem value="hoje">Hoje</MenuItem>
                  <MenuItem value="7dias">Últimos 7 dias</MenuItem>
                  <MenuItem value="30dias">Últimos 30 dias</MenuItem>
                  <MenuItem value="ano">Este ano</MenuItem>
                </Select>
              </FormControl>
              
              {safeRender(
                <IconButton onClick={handleRefresh} color="primary" aria-label="atualizar">
                  <RefreshIcon />
                </IconButton>
              )}
            </Box>
            
            {dashboard && dashboard.resumo && (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
                    <Typography variant="h6" gutterBottom>
                      Vendas
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
                      {formatCurrency(dashboard.resumo.vendas_periodo.valor_total)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {dashboard.resumo.comparacao_anterior.valor.variacao > 0 ? (
                        <ArrowUpwardIcon color="success" />
                      ) : (
                        <ArrowDownwardIcon color="error" />
                      )}
                      <Typography variant="body2" color={dashboard.resumo.comparacao_anterior.valor.variacao > 0 ? 'success.main' : 'error.main'}>
                        {dashboard.resumo.comparacao_anterior.valor.variacao.toFixed(1)}% em relação ao período anterior
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
                    <Typography variant="h6" gutterBottom>
                      Total de Vendas
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
                      {dashboard.resumo.vendas_periodo.total_vendas}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {dashboard.resumo.comparacao_anterior.vendas.variacao > 0 ? (
                        <ArrowUpwardIcon color="success" />
                      ) : (
                        <ArrowDownwardIcon color="error" />
                      )}
                      <Typography variant="body2" color={dashboard.resumo.comparacao_anterior.vendas.variacao > 0 ? 'success.main' : 'error.main'}>
                        {dashboard.resumo.comparacao_anterior.vendas.variacao.toFixed(1)}% em relação ao período anterior
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
                    <Typography variant="h6" gutterBottom>
                      Valor em Estoque
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
                      {formatCurrency(dashboard.resumo.estoque.valor_estoque)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">
                        {dashboard.resumo.estoque.estoque_baixo} produtos com estoque baixo
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}
            
            {dashboard && dashboard.graficos && (
              <>
                <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                  Gráficos
                </Typography>
                
                <Paper sx={{ p: 3, mb: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Vendas por Dia
                  </Typography>
                  <Box sx={{ height: 300, width: '100%' }}>
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback />}>
                        {isValidChartData(dashboard.graficos.vendas_por_dia) ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={prepareVendasPorDiaData()}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="dia" />
                              <YAxis />
                              <Tooltip formatter={(value) => formatCurrency(value)} />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="valor" 
                                stroke="#8884d8" 
                                activeDot={{ r: 8 }}
                                name="Vendas do Dia"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <Typography>Não há dados suficientes para exibir este gráfico</Typography>
                        )}
                      </Suspense>
                    </ErrorBoundary>
                  </Box>
                </Paper>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, mb: 4 }}>
                      <Typography variant="h6" gutterBottom>
                        Produtos Mais Vendidos
                      </Typography>
                      <Box sx={{ height: 300, width: '100%' }}>
                        <ErrorBoundary>
                          <Suspense fallback={<LoadingFallback />}>
                            {isValidChartData(dashboard.graficos.produtos_mais_vendidos) ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={prepareProdutosMaisVendidosData()}
                                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                  layout="vertical"
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis type="number" />
                                  <YAxis dataKey="nome" type="category" width={150} />
                                  <Tooltip />
                                  <Legend />
                                  <Bar 
                                    dataKey="quantidade" 
                                    fill="#8884d8" 
                                    name="Quantidade Vendida"
                                  >
                                    {
                                      prepareProdutosMaisVendidosData().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))
                                    }
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            ) : (
                              <Typography>Não há dados suficientes para exibir este gráfico</Typography>
                            )}
                          </Suspense>
                        </ErrorBoundary>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, mb: 4 }}>
                      <Typography variant="h6" gutterBottom>
                        Vendas por Tamanho
                      </Typography>
                      <Box sx={{ height: 300, width: '100%' }}>
                        <ErrorBoundary>
                          <Suspense fallback={<LoadingFallback />}>
                            {isValidChartData(dashboard.graficos.vendas_por_tamanho) ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={prepareVendasPorTamanhoData()}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="quantidade"
                                    nameKey="tamanho"
                                  >
                                    {
                                      prepareVendasPorTamanhoData().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))
                                    }
                                  </Pie>
                                  <Tooltip formatter={(value) => value} />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            ) : (
                              <Typography>Não há dados suficientes para exibir este gráfico</Typography>
                            )}
                          </Suspense>
                        </ErrorBoundary>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </>
            )}
          </>
        )}
      </Box>
    </Container>
  );
};

// Componente Dashboard com ErrorBoundary
const Dashboard = () => {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
};

export default Dashboard;