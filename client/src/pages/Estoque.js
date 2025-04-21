import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, TextField, Grid, IconButton, 
         Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
         Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
         InputAdornment, Tooltip, CircularProgress, FormControl, InputLabel, Select,
         Tabs, Tab, Chip } from '@mui/material';
import MuiMenuItem from '@mui/material/MenuItem';
import { toast } from 'react-toastify';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import HistoryIcon from '@mui/icons-material/History';
import WarningIcon from '@mui/icons-material/Warning';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Estoque = () => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);
  
  // Estado para o diálogo de movimentação de estoque
  const [movimentacaoDialogOpen, setMovimentacaoDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [movimentacaoForm, setMovimentacaoForm] = useState({
    produto_id: null,
    produto_nome: '',
    quantidade: 1,
    tipo: 'entrada', // 'entrada' ou 'saida'
    motivo: ''
  });
  const [estoqueDisponivel, setEstoqueDisponivel] = useState(0);
  const [movimentacaoErrors, setMovimentacaoErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Estado para o diálogo de histórico de movimentações
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [produtoHistorico, setProdutoHistorico] = useState(null);
  const [historicoMovimentacoes, setHistoricoMovimentacoes] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(['admin', 'estoquista']);

  useEffect(() => {
    fetchEstoque();
    if (tabValue === 1) {
      fetchMovimentacoes();
    }
  }, [tabValue]);

  const fetchEstoque = async () => {
    setLoading(true);
    try {
      const response = await api.get('/estoque');
      setProdutos(response.data);
      setFilteredProdutos(response.data);
    } catch (error) {
      console.error('Erro ao buscar estoque:', error);
      toast.error('Erro ao buscar dados do estoque');
    } finally {
      setLoading(false);
    }
  };

  const fetchMovimentacoes = async () => {
    setLoadingMovimentacoes(true);
    try {
      const response = await api.get('/estoque/movimentacoes');
      setMovimentacoes(response.data.data);
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      toast.error('Erro ao buscar movimentações de estoque');
    } finally {
      setLoadingMovimentacoes(false);
    }
  };

  const fetchHistoricoMovimentacoes = async (produtoId) => {
    setLoadingHistorico(true);
    try {
      const response = await api.get(`/produtos/${produtoId}/movimentacoes`);
      setHistoricoMovimentacoes(response.data);
    } catch (error) {
      console.error('Erro ao buscar histórico de movimentações:', error);
      toast.error('Erro ao buscar histórico de movimentações');
    } finally {
      setLoadingHistorico(false);
    }
  };

  useEffect(() => {
    // Filtra os produtos com base na busca
    const filtered = produtos.filter(
      (produto) =>
        produto.nome.toLowerCase().includes(search.toLowerCase()) ||
        produto.id.toString().includes(search)
    );
    
    setFilteredProdutos(filtered);
  }, [search, produtos]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  // Funções para movimentação de estoque
  const handleOpenMovimentacaoDialog = (produto, tipo) => {
    setDialogTitle(tipo === 'entrada' ? 'Adicionar ao Estoque' : 'Remover do Estoque');
    setMovimentacaoForm({
      produto_id: produto.id,
      produto_nome: `${produto.nome} (${produto.tamanho})`,
      quantidade: 1,
      tipo: tipo,
      motivo: ''
    });
    setEstoqueDisponivel(produto.quantidade);
    setMovimentacaoErrors({});
    setMovimentacaoDialogOpen(true);
  };

  const handleCloseMovimentacaoDialog = () => {
    setMovimentacaoDialogOpen(false);
  };

  const handleMovimentacaoFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'quantidade') {
      // Permite apenas números inteiros positivos
      if ((/^\d*$/).test(value) && (parseInt(value) > 0 || value === '')) {
        setMovimentacaoForm({
          ...movimentacaoForm,
          [name]: value === '' ? '' : parseInt(value) || 1
        });
      }
    } else {
      setMovimentacaoForm({
        ...movimentacaoForm,
        [name]: value
      });
    }
    
    // Limpa o erro do campo quando o usuário começa a digitar
    if (movimentacaoErrors[name]) {
      setMovimentacaoErrors({
        ...movimentacaoErrors,
        [name]: ''
      });
    }
  };

  const validateMovimentacaoForm = () => {
    const errors = {};
    
    if (!movimentacaoForm.quantidade || movimentacaoForm.quantidade <= 0) {
      errors.quantidade = 'Quantidade deve ser maior que zero';
    }
    
    if (movimentacaoForm.tipo === 'saida' && movimentacaoForm.quantidade > estoqueDisponivel) {
      errors.quantidade = `Quantidade excede o estoque disponível (${estoqueDisponivel})`;
    }
    
    if (!movimentacaoForm.motivo.trim()) {
      errors.motivo = 'Motivo é obrigatório';
    }
    
    setMovimentacaoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitMovimentacaoForm = async () => {
    if (!validateMovimentacaoForm()) return;
    
    setFormSubmitting(true);
    
    try {
      const endpoint = movimentacaoForm.tipo === 'entrada' 
        ? '/api/estoque/adicionar' 
        : '/api/estoque/remover';
      
      const data = {
        produto_id: movimentacaoForm.produto_id,
        quantidade: movimentacaoForm.quantidade,
        motivo: movimentacaoForm.motivo
      };
      
      await axios.post(endpoint, data);
      
      toast.success(
        movimentacaoForm.tipo === 'entrada' 
          ? 'Estoque adicionado com sucesso!' 
          : 'Estoque removido com sucesso!'
      );
      
      // Atualiza a lista de produtos
      fetchEstoque();
      handleCloseMovimentacaoDialog();
    } catch (error) {
      console.error('Erro ao movimentar estoque:', error);
      if (error.response?.data?.available) {
        toast.error(`${error.response.data.message} (Disponível: ${error.response.data.available})`);
      } else {
        toast.error(error.response?.data?.message || 'Erro ao movimentar estoque');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Funções para visualizar histórico de movimentações
  const handleOpenHistoricoDialog = (produto) => {
    setProdutoHistorico(produto);
    setHistoricoMovimentacoes([]);
    setHistoricoDialogOpen(true);
    fetchHistoricoMovimentacoes(produto.id);
  };

  const handleCloseHistoricoDialog = () => {
    setHistoricoDialogOpen(false);
    setProdutoHistorico(null);
  };

  // Função para determinar a cor do indicador de estoque
  const getEstoqueStatusColor = (quantidade) => {
    if (quantidade <= 0) {
      return 'error.main';
    } else if (quantidade <= 5) {
      return 'warning.dark';
    } else if (quantidade <= 10) {
      return 'warning.main';
    } else {
      return 'success.main';
    }
  };

  const getEstoqueStatusText = (quantidade) => {
    if (quantidade <= 0) {
      return 'Esgotado';
    } else if (quantidade <= 5) {
      return 'Crítico';
    } else if (quantidade <= 10) {
      return 'Baixo';
    } else {
      return 'Adequado';
    }
  };

  const getMovimentacaoColor = (tipo) => {
    return tipo === 'entrada' ? 'success' : 'error';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1">Controle de Estoque</Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="Produtos em Estoque" />
          <Tab label="Movimentações" />
        </Tabs>
      </Paper>

      {tabValue === 0 ? (
        <>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Buscar produto"
                  variant="outlined"
                  size="small"
                  value={search}
                  onChange={handleSearch}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={8}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'error.main', mr: 1 }} />
                    <Typography variant="body2">Esgotado</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'warning.dark', mr: 1 }} />
                    <Typography variant="body2">Crítico (≤ 5)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'warning.main', mr: 1 }} />
                    <Typography variant="body2">Baixo (≤ 10)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'success.main', mr: 1 }} />
                    <Typography variant="body2">Adequado (&gt; 10)</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Produto</TableCell>
                  <TableCell>Tamanho</TableCell>
                  <TableCell>Quantidade</TableCell>
                  <TableCell>Custo</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress size={24} sx={{ my: 2 }} />
                    </TableCell>
                  </TableRow>
                ) : filteredProdutos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Nenhum produto encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProdutos.map((produto) => (
                    <TableRow key={produto.id}>
                      <TableCell>{produto.id}</TableCell>
                      <TableCell>{produto.nome}</TableCell>
                      <TableCell>{produto.tamanho}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%',
                              backgroundColor: getEstoqueStatusColor(produto.quantidade),
                              mr: 1
                            }} 
                          />
                          {produto.quantidade}
                        </Box>
                      </TableCell>
                      <TableCell>{formatCurrency(produto.preco)}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          {canEdit && (
                            <>
                              <Tooltip title="Adicionar ao estoque">
                                <IconButton
                                  color="success"
                                  onClick={() => handleOpenMovimentacaoDialog(produto, 'entrada')}
                                  size="small"
                                >
                                  <AddIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remover do estoque">
                                <span>
                                  <IconButton
                                    color="error"
                                    onClick={() => handleOpenMovimentacaoDialog(produto, 'saida')}
                                    size="small"
                                    disabled={produto.quantidade <= 0}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Remover do estoque">
                                <span>
                                  <IconButton
                                    color="error"
                                    onClick={() => handleOpenMovimentacaoDialog(produto, 'saida')}
                                    size="small"
                                    disabled={produto.quantidade <= 0}
                                  >
                                    <RemoveIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Histórico de movimentações">
                            <IconButton
                              color="primary"
                              onClick={() => handleOpenHistoricoDialog(produto)}
                              size="small"
                            >
                              <HistoryIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Produto</TableCell>
                <TableCell align="center">Quantidade</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell>Usuário</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingMovimentacoes ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={24} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : movimentacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nenhuma movimentação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                movimentacoes.map((movimentacao) => (
                  <TableRow key={movimentacao.id}>
                    <TableCell>{formatDate(movimentacao.data)}</TableCell>
                    <TableCell>{`${movimentacao.produto_nome} (${movimentacao.produto_tamanho})`}</TableCell>
                    <TableCell align="center">{movimentacao.quantidade}</TableCell>
                    <TableCell>
                      <Chip 
                        label={movimentacao.tipo === 'entrada' ? 'Entrada' : 'Saída'} 
                        color={getMovimentacaoColor(movimentacao.tipo)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{movimentacao.motivo}</TableCell>
                    <TableCell>{movimentacao.usuario}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Diálogo para movimentação de estoque */}
      <Dialog open={movimentacaoDialogOpen} onClose={handleCloseMovimentacaoDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Produto"
                value={movimentacaoForm.produto_nome}
                disabled
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Quantidade"
                name="quantidade"
                type="number"
                value={movimentacaoForm.quantidade}
                onChange={handleMovimentacaoFormChange}
                error={!!movimentacaoErrors.quantidade}
                helperText={movimentacaoErrors.quantidade}
                disabled={formSubmitting}
                InputProps={{ inputProps: { min: 1 } }}
              />
              {movimentacaoForm.tipo === 'saida' && (
                <Typography variant="caption" color="text.secondary">
                  Estoque disponível: {estoqueDisponivel} unidades
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Motivo"
                name="motivo"
                value={movimentacaoForm.motivo}
                onChange={handleMovimentacaoFormChange}
                error={!!movimentacaoErrors.motivo}
                helperText={movimentacaoErrors.motivo}
                disabled={formSubmitting}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMovimentacaoDialog} disabled={formSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmitMovimentacaoForm} 
            variant="contained" 
            disabled={formSubmitting}
          >
            {formSubmitting ? <CircularProgress size={24} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para histórico de movimentações */}
      <Dialog open={historicoDialogOpen} onClose={handleCloseHistoricoDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Histórico de Movimentações - {produtoHistorico ? `${produtoHistorico.nome} (${produtoHistorico.tamanho})` : ''}
        </DialogTitle>
        <DialogContent>
          {loadingHistorico ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell align="center">Quantidade</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Motivo</TableCell>
                    <TableCell>Usuário</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historicoMovimentacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        Nenhuma movimentação encontrada para este produto.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historicoMovimentacoes.map((movimentacao) => (
                      <TableRow key={movimentacao.id}>
                        <TableCell>{formatDate(movimentacao.data)}</TableCell>
                        <TableCell align="center">{movimentacao.quantidade}</TableCell>
                        <TableCell>
                          <Chip 
                            label={movimentacao.tipo === 'entrada' ? 'Entrada' : 'Saída'} 
                            color={getMovimentacaoColor(movimentacao.tipo)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{movimentacao.motivo}</TableCell>
                        <TableCell>{movimentacao.usuario}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistoricoDialog}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Estoque;