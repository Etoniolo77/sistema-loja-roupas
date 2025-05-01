import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
  Chip
} from '@mui/material';
import { format, parse, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import InsightsIcon from '@mui/icons-material/Insights';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ChartComponent from '../components/ChartComponent';
import { transformSalesData, transformProductData, transformClientData, transformInventoryData, transformSellerSalesData } from '../utils/chartDataUtils';
import api from '../utils/api';

const Relatorios = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [tipoRelatorio, setTipoRelatorio] = useState('vendas');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [relatorioData, setRelatorioData] = useState(null);
  const [chartData, setChartData] = useState({
    barData: [],
    pieData: [],
    lineData: []
  });

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const handleTipoRelatorioChange = (event) => {
    const novoTipo = event.target.value;
    setTipoRelatorio(novoTipo);
    setRelatorioData(null);
    
    if (novoTipo === 'clientes_por_produto') {
      // Carregar lista de produtos
      api.get('/produtos')
        .then(response => {
          setProdutos(response.data);
        })
        .catch(error => {
          console.error('Erro ao carregar produtos:', error);
          toast.error('Erro ao carregar lista de produtos');
        });
    }
  };

  // Efeito para processar os dados do relatório e preparar os gráficos
  useEffect(() => {
    if (!relatorioData) return;
    
    let chartDataProcessed = {};
    
    switch (tipoRelatorio) {
      case 'vendas':
        chartDataProcessed = transformSalesData(relatorioData);
        break;
      case 'vendas_vendedor':
        chartDataProcessed = transformSellerSalesData(relatorioData);
        break;
      case 'produtos':
        chartDataProcessed = transformProductData(relatorioData);
        break;
      case 'clientes':
        chartDataProcessed = transformClientData(relatorioData);
        break;
      case 'estoque':
        chartDataProcessed = transformInventoryData(relatorioData);
        break;
      default:
        chartDataProcessed = { barData: [], pieData: [], lineData: [] };
    }
    
    setChartData(chartDataProcessed);
  }, [relatorioData, tipoRelatorio]);

  const gerarRelatorio = async () => {
    if (!dataInicio || !dataFim) {
      toast.error('Por favor, selecione o período do relatório');
      return;
    }

    setLoading(true);
    try {
      console.log(`Gerando relatório de ${tipoRelatorio} de ${dataInicio} até ${dataFim}`);
      
      let response;
      
      switch (tipoRelatorio) {
        case 'vendas':
          response = await api.get(`/relatorios/vendas/periodo`, {
            params: { data_inicio: dataInicio, data_fim: dataFim }
          });
          break;
        case 'vendas_vendedor':
          response = await api.get(`/relatorios/vendas/vendedor`, {
            params: { data_inicio: dataInicio, data_fim: dataFim }
          });
          break;
        case 'produtos':
          response = await api.get(`/relatorios/produtos/mais-vendidos`, {
            params: { data_inicio: dataInicio, data_fim: dataFim }
          });
          break;
        case 'clientes':
          response = await api.get(`/relatorios/clientes/mais-ativos`, {
            params: { data_inicio: dataInicio, data_fim: dataFim }
          });
          break;
        case 'clientes_por_produto':
          if (!produtoSelecionado) {
            toast.error('Por favor, selecione um produto');
            return;
          }
          response = await api.get(`/relatorios/clientes/por-produto`, {
            params: { 
              produto_id: produtoSelecionado,
              data_inicio: dataInicio, 
              data_fim: dataFim 
            }
          });
          break;
        case 'estoque':
          response = await api.get(`/relatorios/estoque`);
          break;
        case 'encomendas':
          response = await api.get(`/relatorios/encomendas/periodo`, {
            params: { data_inicio: dataInicio, data_fim: dataFim }
          });
          break;
        case 'creditos_debitos':
          response = await api.get(`/relatorios/clientes/creditos-debitos`);
          break;
        case 'debitos_diarios':
          response = await api.get(`/relatorios/clientes/debitos-diarios`, {
            params: { data_inicio: dataInicio, data_fim: dataFim }
          });
          break;
        default:
          throw new Error('Tipo de relatório não suportado');
      }
      
      setRelatorioData(response.data);
      toast.success('Relatório gerado com sucesso');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error(`Erro ao gerar relatório: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportarPDF = () => {
    toast.info('Exportação para PDF em desenvolvimento');
  };

  const handleImprimir = () => {
    window.print();
  };

  const renderRelatorioContent = () => {
    if (!relatorioData) return null;

    switch (tipoRelatorio) {
      case 'clientes_por_produto':
        return (
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>WhatsApp</TableCell>
                  <TableCell>Instagram</TableCell>
                  <TableCell>Data da Compra</TableCell>
                  <TableCell>Quantidade</TableCell>
                  <TableCell>Preço Unitário</TableCell>
                  <TableCell>Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {relatorioData.clientes.map((cliente, index) => (
                  <TableRow key={index}>
                    <TableCell>{cliente.nome}</TableCell>
                    <TableCell>{cliente.whatsapp}</TableCell>
                    <TableCell>{cliente.instagram}</TableCell>
                    <TableCell>{format(parseISO(cliente.data_compra), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{cliente.quantidade}</TableCell>
                    <TableCell>R$ {cliente.preco_unitario.toFixed(2)}</TableCell>
                    <TableCell>R$ {cliente.subtotal.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper' }}>
              <Typography variant="h6" gutterBottom>Resumo</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Typography variant="subtitle2">Total de Clientes</Typography>
                  <Typography>{relatorioData.resumo.total_clientes}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="subtitle2">Quantidade Total</Typography>
                  <Typography>{relatorioData.resumo.total_quantidade}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="subtitle2">Preço Médio</Typography>
                  <Typography>R$ {relatorioData.resumo.preco_medio.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="subtitle2">Valor Total</Typography>
                  <Typography>R$ {relatorioData.resumo.valor_total.toFixed(2)}</Typography>
                </Grid>
              </Grid>
            </Box>
          </TableContainer>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Relatórios
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filtros
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel id="tipo-relatorio-label">Tipo de Relatório</InputLabel>
              <Select
                labelId="tipo-relatorio-label"
                value={tipoRelatorio}
                label="Tipo de Relatório"
                onChange={handleTipoRelatorioChange}
              >
                <MenuItem value="vendas">Vendas</MenuItem>
                <MenuItem value="vendas_vendedor">Vendas por Vendedor</MenuItem>
                <MenuItem value="produtos">Produtos</MenuItem>
                <MenuItem value="clientes">Clientes</MenuItem>
                <MenuItem value="clientes_por_produto">Clientes por Produto</MenuItem>
                <MenuItem value="estoque">Estoque</MenuItem>
                <MenuItem value="encomendas">Encomendas por Período</MenuItem>
                <MenuItem value="creditos_debitos">Créditos e Débitos de Clientes</MenuItem>
                <MenuItem value="debitos_diarios">Débitos Diários por Cliente</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {tipoRelatorio === 'clientes_por_produto' && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel id="produto-label">Produto</InputLabel>
                <Select
                  labelId="produto-label"
                  value={produtoSelecionado}
                  label="Produto"
                  onChange={(e) => setProdutoSelecionado(e.target.value)}
                >
                  {produtos.map((produto) => (
                    <MenuItem key={produto.id} value={produto.id}>
                      {produto.nome} - {produto.tamanho}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12} md={3}>
            <TextField
              label="Data Início"
              type="date"
              fullWidth
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              label="Data Fim"
              type="date"
              fullWidth
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Button 
              variant="contained" 
              fullWidth 
              onClick={gerarRelatorio}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Gerar Relatório'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {!loading && relatorioData && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">
              Relatório de {tipoRelatorio === 'vendas' ? 'Vendas' : 
                          tipoRelatorio === 'produtos' ? 'Produtos' : 
                          tipoRelatorio === 'clientes' ? 'Clientes' : 'Estoque'}
            </Typography>
            
            <Box>
              <Button 
                startIcon={<DownloadIcon />} 
                onClick={handleExportarPDF}
                sx={{ mr: 1 }}
              >
                Exportar PDF
              </Button>
              <Button 
                startIcon={<PrintIcon />} 
                onClick={handleImprimir}
              >
                Imprimir
              </Button>
            </Box>
          </Box>
          
          <Tabs value={tabIndex} onChange={handleTabChange} sx={{ mb: 3 }}>
            <Tab icon={<InsightsIcon />} label="Resumo" />
            <Tab icon={<BarChartIcon />} label="Gráficos" />
            <Tab icon={<TableCell />} label="Tabela" />
          </Tabs>
          
          {tabIndex === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Resumo do Relatório
              </Typography>
              
              {tipoRelatorio === 'vendas' && relatorioData.resumo && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Total de Vendas</Typography>
                        <Typography variant="h4">{relatorioData.resumo.total_vendas || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Vendas Concluídas</Typography>
                        <Typography variant="h4">{relatorioData.resumo.vendas_concluidas || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Valor Total</Typography>
                        <Typography variant="h4">R$ {(relatorioData.resumo.valor_total || 0).toFixed(2)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Total de Clientes</Typography>
                        <Typography variant="h4">{relatorioData.resumo.total_clientes || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
              
              {tipoRelatorio === 'produtos' && relatorioData.resumo && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Total de Itens Vendidos</Typography>
                        <Typography variant="h4">{relatorioData.resumo.total_itens_vendidos || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Valor Total</Typography>
                        <Typography variant="h4">R$ {(relatorioData.resumo.valor_total || 0).toFixed(2)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Total de Vendas</Typography>
                        <Typography variant="h4">{relatorioData.resumo.total_vendas || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Total de Produtos</Typography>
                        <Typography variant="h4">{relatorioData.resumo.total_produtos || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
              
              {tipoRelatorio === 'clientes' && relatorioData.resumo && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Total de Clientes</Typography>
                        <Typography variant="h4">{relatorioData.resumo.total_clientes || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Valor Total</Typography>
                        <Typography variant="h4">R$ {(relatorioData.resumo.valor_total || 0).toFixed(2)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Total de Vendas</Typography>
                        <Typography variant="h4">{relatorioData.resumo.total_vendas || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Ticket Médio</Typography>
                        <Typography variant="h4">R$ {(relatorioData.resumo.ticket_medio_geral || 0).toFixed(2)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
              
              {tipoRelatorio === 'vendas_vendedor' && relatorioData.resumo && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Total de Vendedores</Typography>
                        <Typography variant="h4">{relatorioData.resumo.total_vendedores || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Total de Vendas</Typography>
                        <Typography variant="h4">{relatorioData.resumo.total_vendas || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Valor Total</Typography>
                        <Typography variant="h4">R$ {(relatorioData.resumo.valor_total || 0).toFixed(2)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Ticket Médio</Typography>
                        <Typography variant="h4">R$ {(relatorioData.resumo.ticket_medio_geral || 0).toFixed(2)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
              
              {tipoRelatorio === 'estoque' && relatorioData.resumo && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Total de Produtos</Typography>
                        <Typography variant="h4">{relatorioData.resumo.total_produtos || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Valor Total em Estoque</Typography>
                        <Typography variant="h4">R$ {(relatorioData.resumo.valor_total_estoque || 0).toFixed(2)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card sx={{ cursor: 'pointer' }} onClick={() => setTipoRelatorio('estoque_baixo')}>
                      <CardContent>
                        <Typography variant="h6" color="error">Estoque Baixo</Typography>
                        <Typography variant="h4">{relatorioData.resumo.estoque_baixo || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary">Estoque Adequado</Typography>
                        <Typography variant="h4">{relatorioData.resumo.estoque_adequado || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Box>
          )}
          
          {tabIndex === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Gráficos
              </Typography>
              
              {chartData.barData && chartData.barData.length > 0 && (
                <ChartComponent 
                  type="bar"
                  data={chartData.barData}
                  title={`Gráfico de Barras - ${tipoRelatorio === 'vendas' ? 'Vendas por Status' : 
                                              tipoRelatorio === 'produtos' ? 'Produtos Mais Vendidos' : 
                                              tipoRelatorio === 'clientes' ? 'Clientes por Valor' : 
                                              'Produtos por Quantidade'}`}
                  config={{
                    bars: [
                      { dataKey: 'quantidade', name: 'Quantidade' },
                      { dataKey: 'valor', name: 'Valor (R$)' }
                    ]
                  }}
                />
              )}
              
              {chartData.pieData && chartData.pieData.length > 0 && (
                <ChartComponent 
                  type="pie"
                  data={chartData.pieData}
                  title={`Gráfico de Pizza - ${tipoRelatorio === 'vendas' ? 'Vendas por Forma de Pagamento' : 
                                              tipoRelatorio === 'produtos' ? 'Produtos por Tamanho' : 
                                              tipoRelatorio === 'clientes' ? 'Clientes por Região' : 
                                              'Produtos por Categoria'}`}
                  dataKey="value"
                />
              )}
              
              {chartData.lineData && chartData.lineData.length > 0 && (
                <ChartComponent 
                  type="line"
                  data={chartData.lineData}
                  title={`Gráfico de Linha - ${tipoRelatorio === 'vendas' ? 'Vendas por Período' : 
                                               tipoRelatorio === 'produtos' ? 'Evolução de Vendas' : 
                                               tipoRelatorio === 'clientes' ? 'Evolução de Clientes' : 
                                               'Evolução de Estoque'}`}
                  nameKey="date"
                  config={{
                    lines: [
                      { dataKey: 'total', name: 'Valor Total (R$)' },
                      { dataKey: 'count', name: 'Quantidade' }
                    ]
                  }}
                />
              )}
            </Box>
          )}
          
          {tabIndex === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Tabela de Dados
              </Typography>
              
              {tipoRelatorio === 'vendas' && relatorioData.vendas && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Data</TableCell>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Itens</TableCell>
                        <TableCell>Valor</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {relatorioData.vendas.map((venda) => (
                        <TableRow key={venda.id}>
                          <TableCell>{venda.id}</TableCell>
                          <TableCell>{new Date(venda.data).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>{venda.cliente || 'N/A'}</TableCell>
                          <TableCell>{venda.total_itens}</TableCell>
                          <TableCell>R$ {venda.valor_total.toFixed(2)}</TableCell>
                          <TableCell>{venda.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {tipoRelatorio === 'produtos' && relatorioData.produtos && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Produto</TableCell>
                        <TableCell>Tamanho</TableCell>
                        <TableCell>Quantidade</TableCell>
                        <TableCell>Preço Médio</TableCell>
                        <TableCell>Valor Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {relatorioData.produtos.map((produto) => (
                        <TableRow key={produto.id}>
                          <TableCell>{produto.nome}</TableCell>
                          <TableCell>{produto.tamanho}</TableCell>
                          <TableCell>{produto.quantidade_vendida}</TableCell>
                          <TableCell>R$ {produto.preco_medio.toFixed(2)}</TableCell>
                          <TableCell>R$ {produto.valor_total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {tipoRelatorio === 'clientes' && relatorioData.clientes && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Compras</TableCell>
                        <TableCell>Valor Total</TableCell>
                        <TableCell>Ticket Médio</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {relatorioData.clientes.map((cliente) => (
                        <TableRow key={cliente.id}>
                          <TableCell>{cliente.nome}</TableCell>
                          <TableCell>{cliente.total_compras}</TableCell>
                          <TableCell>R$ {cliente.valor_total.toFixed(2)}</TableCell>
                          <TableCell>R$ {cliente.ticket_medio.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {tipoRelatorio === 'vendas_vendedor' && relatorioData.vendedores && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Vendedor</TableCell>
                        <TableCell>Total Vendas</TableCell>
                        <TableCell>Concluídas</TableCell>
                        <TableCell>Pendentes</TableCell>
                        <TableCell>Valor Total</TableCell>
                        <TableCell>Ticket Médio</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {relatorioData.vendedores.map((vendedor) => (
                        <TableRow key={vendedor.id}>
                          <TableCell>{vendedor.vendedor}</TableCell>
                          <TableCell>{vendedor.total_vendas}</TableCell>
                          <TableCell>{vendedor.vendas_concluidas}</TableCell>
                          <TableCell>{vendedor.vendas_pendentes}</TableCell>
                          <TableCell>R$ {vendedor.valor_total.toFixed(2)}</TableCell>
                          <TableCell>R$ {vendedor.ticket_medio.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {tipoRelatorio === 'estoque' && relatorioData.produtos && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Produto</TableCell>
                        <TableCell>Tamanho</TableCell>
                        <TableCell>Quantidade</TableCell>
                        <TableCell>Preço</TableCell>
                        <TableCell>Valor em Estoque</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {relatorioData.produtos.map((produto) => (
                        <TableRow key={produto.id}>
                          <TableCell>{produto.nome}</TableCell>
                          <TableCell>{produto.tamanho}</TableCell>
                          <TableCell>{produto.quantidade}</TableCell>
                          <TableCell>R$ {produto.preco.toFixed(2)}</TableCell>
                          <TableCell>R$ {(produto.quantidade * produto.preco).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </Paper>
      )}

      {relatorioData && (
        <Box>
          {tipoRelatorio === 'encomendas' && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Produto</TableCell>
                    <TableCell>Quantidade</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Previsão Entrega</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {relatorioData.encomendas.map((encomenda) => (
                    <TableRow key={encomenda.id}>
                      <TableCell>{format(parseISO(encomenda.data_pedido), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>{encomenda.cliente_nome}</TableCell>
                      <TableCell>{encomenda.produto_nome}</TableCell>
                      <TableCell>{encomenda.quantidade}</TableCell>
                      <TableCell>
                        <Chip
                          label={encomenda.status}
                          color={encomenda.status === 'pendente' ? 'warning' : 'success'}
                        />
                      </TableCell>
                      <TableCell>{format(parseISO(encomenda.previsao_entrega), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tipoRelatorio === 'creditos_debitos' && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Créditos</TableCell>
                    <TableCell>Débitos</TableCell>
                    <TableCell>Saldo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {relatorioData.clientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>{cliente.nome}</TableCell>
                      <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.creditos)}</TableCell>
                      <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.debitos)}</TableCell>
                      <TableCell>
                        <Typography color={cliente.saldo >= 0 ? 'success.main' : 'error.main'}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.saldo)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tipoRelatorio === 'debitos_diarios' && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Descrição</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {relatorioData.debitos.map((debito) => (
                    <TableRow key={debito.id}>
                      <TableCell>{format(parseISO(debito.data), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>{debito.cliente_nome}</TableCell>
                      <TableCell>{debito.descricao}</TableCell>
                      <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(debito.valor)}</TableCell>
                      <TableCell>
                        <Chip
                          label={debito.status}
                          color={debito.status === 'pendente' ? 'warning' : 'success'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Relatorios;