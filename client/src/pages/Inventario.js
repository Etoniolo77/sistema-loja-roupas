import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, TextField, Grid, IconButton, 
         Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
         Dialog, DialogActions, DialogContent, DialogTitle,
         InputAdornment, Tooltip, CircularProgress, FormControl, InputLabel, Select,
         MenuItem, Chip, Alert, Divider, Snackbar } from '@mui/material';
import { toast } from 'react-toastify';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Inventario = () => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  const [inventarioData, setInventarioData] = useState({});
  const [inventarioEmAndamento, setInventarioEmAndamento] = useState(false);
  const [salvandoInventario, setSalvandoInventario] = useState(false);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [historicoInventarios, setHistoricoInventarios] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [inventarioAtual, setInventarioAtual] = useState(null);
  const [scannerDialogOpen, setScannerDialogOpen] = useState(false);
  const [codigoEscaneado, setCodigoEscaneado] = useState('');
  const [alertaAberto, setAlertaAberto] = useState(false);
  const [mensagemAlerta, setMensagemAlerta] = useState('');
  
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(['admin', 'estoquista']);

  useEffect(() => {
    fetchProdutos();
    verificarInventarioEmAndamento();
  }, []);

  const fetchProdutos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/estoque');
      setProdutos(response.data);
      setFilteredProdutos(response.data);
      
      // Inicializa o objeto de dados do inventário
      const dadosIniciais = {};
      response.data.forEach(produto => {
        dadosIniciais[produto.id] = {
          quantidade_sistema: produto.quantidade,
          quantidade_fisica: '',
          observacao: ''
        };
      });
      setInventarioData(dadosIniciais);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao buscar dados dos produtos');
    } finally {
      setLoading(false);
    }
  };

  const verificarInventarioEmAndamento = async () => {
    try {
      const response = await api.get('/inventario/em-andamento');
      if (response.data && response.data.em_andamento) {
        setInventarioEmAndamento(true);
        setInventarioAtual(response.data.inventario);
        
        // Carrega os dados do inventário em andamento
        if (response.data.dados) {
          setInventarioData(response.data.dados);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar inventário em andamento:', error);
      // Se a rota não existir ainda, não exibimos erro
      if (error.response && error.response.status !== 404) {
        toast.error('Erro ao verificar inventário em andamento');
      }
    }
  };

  const fetchHistoricoInventarios = async () => {
    setLoadingHistorico(true);
    try {
      const response = await api.get('/inventario/historico');
      setHistoricoInventarios(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico de inventários:', error);
      // Se a rota não existir ainda, não exibimos erro
      if (error.response && error.response.status !== 404) {
        toast.error('Erro ao buscar histórico de inventários');
      }
      setHistoricoInventarios([]);
    } finally {
      setLoadingHistorico(false);
    }
  };

  useEffect(() => {
    // Filtra os produtos com base na busca
    const filtered = produtos.filter(
      (produto) =>
        produto.nome.toLowerCase().includes(search.toLowerCase()) ||
        produto.id.toString().includes(search) ||
        produto.tamanho.toLowerCase().includes(search.toLowerCase())
    );
    
    setFilteredProdutos(filtered);
  }, [search, produtos]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleQuantidadeFisicaChange = (produtoId, valor) => {
    // Permite apenas números inteiros não negativos
    if ((/^\d*$/).test(valor) || valor === '') {
      setInventarioData(prev => ({
        ...prev,
        [produtoId]: {
          ...prev[produtoId],
          quantidade_fisica: valor
        }
      }));
    }
  };

  const handleObservacaoChange = (produtoId, valor) => {
    setInventarioData(prev => ({
      ...prev,
      [produtoId]: {
        ...prev[produtoId],
        observacao: valor
      }
    }));
  };

  const calcularVariacao = (quantidadeSistema, quantidadeFisica) => {
    if (quantidadeFisica === '' || quantidadeFisica === null) return null;
    
    const fisica = parseInt(quantidadeFisica);
    const sistema = parseInt(quantidadeSistema);
    
    return fisica - sistema;
  };

  const getVariacaoColor = (variacao) => {
    if (variacao === null) return 'text.primary';
    if (variacao < 0) return 'error.main';
    if (variacao > 0) return 'warning.main';
    return 'success.main';
  };

  const getVariacaoText = (variacao) => {
    if (variacao === null) return '-';
    if (variacao === 0) return 'OK';
    return variacao > 0 ? `+${variacao}` : variacao;
  };

  const iniciarNovoInventario = async () => {
    try {
      await api.post('/inventario/iniciar');
      
      // Reinicia os dados do inventário
      const dadosIniciais = {};
      produtos.forEach(produto => {
        dadosIniciais[produto.id] = {
          quantidade_sistema: produto.quantidade,
          quantidade_fisica: '',
          observacao: ''
        };
      });
      setInventarioData(dadosIniciais);
      setInventarioEmAndamento(true);
      setInventarioAtual({
        data_inicio: new Date().toISOString(),
        status: 'em_andamento'
      });
      
      toast.success('Novo inventário iniciado');
    } catch (error) {
      console.error('Erro ao iniciar inventário:', error);
      toast.error('Erro ao iniciar inventário');
    }
  };

  const salvarInventario = async () => {
    // Verifica se há pelo menos um produto com contagem física
    const temContagem = Object.values(inventarioData).some(
      item => item.quantidade_fisica !== ''
    );
    
    if (!temContagem) {
      toast.error('É necessário informar a contagem física de pelo menos um produto');
      return;
    }
    
    setSalvandoInventario(true);
    try {
      // Prepara os dados para envio
      const itens = Object.entries(inventarioData)
        .filter(([_, dados]) => dados.quantidade_fisica !== '')
        .map(([produtoId, dados]) => ({
          produto_id: parseInt(produtoId),
          quantidade_sistema: dados.quantidade_sistema,
          quantidade_fisica: parseInt(dados.quantidade_fisica),
          observacao: dados.observacao
        }));
      
      await api.post('/inventario/salvar', { itens });
      
      toast.success('Inventário salvo com sucesso');
    } catch (error) {
      console.error('Erro ao salvar inventário:', error);
      toast.error('Erro ao salvar inventário');
    } finally {
      setSalvandoInventario(false);
    }
  };

  const ajustarEstoque = async () => {
    setSalvandoInventario(true);
    try {
      // Prepara os dados para ajuste
      const ajustes = Object.entries(inventarioData)
        .filter(([_, dados]) => {
          const fisica = dados.quantidade_fisica === '' ? null : parseInt(dados.quantidade_fisica);
          return fisica !== null && fisica !== dados.quantidade_sistema;
        })
        .map(([produtoId, dados]) => ({
          produto_id: parseInt(produtoId),
          quantidade_atual: dados.quantidade_sistema,
          quantidade_nova: parseInt(dados.quantidade_fisica),
          variacao: parseInt(dados.quantidade_fisica) - dados.quantidade_sistema,
          observacao: dados.observacao || 'Ajuste por inventário'
        }));
      
      if (ajustes.length === 0) {
        setMensagemAlerta('Não há divergências para ajustar no estoque');
        setAlertaAberto(true);
        setSalvandoInventario(false);
        return;
      }
      
      await api.post('/inventario/ajustar-estoque', { ajustes });
      
      toast.success('Estoque ajustado com sucesso');
      setInventarioEmAndamento(false);
      setInventarioAtual(null);
      
      // Recarrega os produtos para atualizar as quantidades
      fetchProdutos();
    } catch (error) {
      console.error('Erro ao ajustar estoque:', error);
      toast.error('Erro ao ajustar estoque');
    } finally {
      setSalvandoInventario(false);
    }
  };

  const cancelarInventario = async () => {
    if (window.confirm('Tem certeza que deseja cancelar o inventário atual? Todos os dados informados serão perdidos.')) {
      try {
        // Cancela o inventário no backend
        await api.post('/inventario/finalizar', { status: 'cancelado' });
        
        setInventarioEmAndamento(false);
        setInventarioAtual(null);
        fetchProdutos(); // Recarrega os dados originais
        toast.info('Inventário cancelado');
      } catch (error) {
        console.error('Erro ao cancelar inventário:', error);
        toast.error('Erro ao cancelar inventário');
      }
    }
  };

  const handleOpenHistoricoDialog = () => {
    setHistoricoDialogOpen(true);
    fetchHistoricoInventarios();
  };

  const handleCloseHistoricoDialog = () => {
    setHistoricoDialogOpen(false);
  };

  const handleOpenScannerDialog = () => {
    setScannerDialogOpen(true);
    setCodigoEscaneado('');
  };

  const handleCloseScannerDialog = () => {
    setScannerDialogOpen(false);
  };

  const handleCodigoEscaneadoChange = (e) => {
    setCodigoEscaneado(e.target.value);
  };

  const processarCodigoEscaneado = () => {
    if (!codigoEscaneado) return;
    
    // Aqui você implementaria a lógica para processar o código de barras
    // Por exemplo, buscar o produto pelo código e focar no campo de quantidade
    
    // Simulação: assumindo que o código escaneado é o ID do produto
    const produtoId = parseInt(codigoEscaneado);
    const produto = produtos.find(p => p.id === produtoId);
    
    if (produto) {
      // Foca no campo de quantidade do produto
      const element = document.getElementById(`quantidade-fisica-${produtoId}`);
      if (element) {
        element.focus();
        setSearch(produto.nome); // Filtra a lista para mostrar apenas este produto
      }
      handleCloseScannerDialog();
    } else {
      toast.error('Produto não encontrado');
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  const handleAlertaClose = () => {
    setAlertaAberto(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1">Inventário de Estoque</Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<HistoryIcon />} 
            onClick={handleOpenHistoricoDialog}
            sx={{ mr: 1 }}
          >
            Histórico
          </Button>
          
          {canEdit && !inventarioEmAndamento && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={iniciarNovoInventario}
            >
              Iniciar Inventário
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Barra de busca e informações do inventário */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              label="Buscar produto"
              value={search}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: canEdit && inventarioEmAndamento ? (
                  <InputAdornment position="end">
                    <IconButton onClick={handleOpenScannerDialog} color="primary">
                      <QrCodeScannerIcon />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
            />
          </Grid>
          
          {inventarioEmAndamento && (
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={cancelarInventario}
                  disabled={salvandoInventario}
                >
                  Cancelar
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={salvarInventario}
                  disabled={salvandoInventario}
                >
                  Salvar
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={ajustarEstoque}
                  disabled={salvandoInventario}
                >
                  Finalizar e Ajustar
                </Button>
              </Box>
            </Grid>
          )}
          
          {inventarioAtual && (
            <Grid item xs={12}>
              <Alert severity="info">
                Inventário iniciado em {formatDate(inventarioAtual.data_inicio)}
              </Alert>
            </Grid>
          )}
        </Grid>
      </Paper>
      
      {/* Tabela de produtos */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Produto</TableCell>
                <TableCell>Tamanho</TableCell>
                <TableCell align="right">Qtd. Sistema</TableCell>
                {inventarioEmAndamento && (
                  <>
                    <TableCell align="right">Qtd. Física</TableCell>
                    <TableCell align="right">Variação</TableCell>
                    <TableCell>Observação</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProdutos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={inventarioEmAndamento ? 7 : 4} align="center">
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredProdutos.map((produto) => {
                  const produtoInventario = inventarioData[produto.id] || {
                    quantidade_sistema: produto.quantidade,
                    quantidade_fisica: '',
                    observacao: ''
                  };
                  
                  const variacao = calcularVariacao(
                    produtoInventario.quantidade_sistema,
                    produtoInventario.quantidade_fisica
                  );
                  
                  return (
                    <TableRow key={produto.id}>
                      <TableCell>{produto.id}</TableCell>
                      <TableCell>{produto.nome}</TableCell>
                      <TableCell>{produto.tamanho}</TableCell>
                      <TableCell align="right">{produtoInventario.quantidade_sistema}</TableCell>
                      
                      {inventarioEmAndamento && (
                        <>
                          <TableCell align="right">
                            <TextField
                              id={`quantidade-fisica-${produto.id}`}
                              variant="outlined"
                              size="small"
                              value={produtoInventario.quantidade_fisica}
                              onChange={(e) => handleQuantidadeFisicaChange(produto.id, e.target.value)}
                              disabled={!canEdit}
                              sx={{ width: '80px' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography color={getVariacaoColor(variacao)}>
                              {getVariacaoText(variacao)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TextField
                              variant="outlined"
                              size="small"
                              fullWidth
                              placeholder="Observação"
                              value={produtoInventario.observacao || ''}
                              onChange={(e) => handleObservacaoChange(produto.id, e.target.value)}
                              disabled={!canEdit}
                            />
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Dialogs */}
      <Dialog open={historicoDialogOpen} onClose={handleCloseHistoricoDialog} maxWidth="md" fullWidth>
        <DialogTitle>Histórico de Inventários</DialogTitle>
        <DialogContent>
          {loadingHistorico ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data de Início</TableCell>
                    <TableCell>Data de Finalização</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Itens</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historicoInventarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">Nenhum inventário encontrado</TableCell>
                    </TableRow>
                  ) : (
                    historicoInventarios.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{formatDate(inv.data_inicio)}</TableCell>
                        <TableCell>{inv.data_fim ? formatDate(inv.data_fim) : '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={inv.status === 'concluido' ? 'Concluído' : 
                                  inv.status === 'cancelado' ? 'Cancelado' : 'Em andamento'}
                            color={inv.status === 'concluido' ? 'success' : 
                                  inv.status === 'cancelado' ? 'error' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{inv.total_itens || '-'}</TableCell>
                        <TableCell>
                          <Button size="small" startIcon={<PrintIcon />}>
                            Imprimir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistoricoDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>
      
      <Dialog open={scannerDialogOpen} onClose={handleCloseScannerDialog}>
        <DialogTitle>Escanear Código de Barras</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Código do Produto"
            fullWidth
            variant="outlined"
            value={codigoEscaneado}
            onChange={handleCodigoEscaneadoChange}
            onKeyPress={(e) => e.key === 'Enter' && processarCodigoEscaneado()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseScannerDialog}>Cancelar</Button>
          <Button onClick={processarCodigoEscaneado} color="primary">
            Processar
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={alertaAberto} autoHideDuration={6000} onClose={handleAlertaClose}>
        <Alert onClose={handleAlertaClose} severity="info" sx={{ width: '100%' }}>
          {mensagemAlerta}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Inventario;