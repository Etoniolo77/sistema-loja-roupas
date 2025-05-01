import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, TextField, Grid, IconButton, 
         Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
         Dialog, DialogActions, DialogContent, DialogTitle,
         InputAdornment, Tooltip, CircularProgress, FormControl, InputLabel, Select } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import { toast } from 'react-toastify';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../utils/api';

const Produtos = () => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tamanhoFilter, setTamanhoFilter] = useState('');
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  
  // Estado para o formulário do produto
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [produtoForm, setProdutoForm] = useState({
    id: null,
    nome: '',
    tamanho: '',
    quantidade: 0,
    preco: '',
    fornecedor_id: null
  });
  
  const [fornecedores, setFornecedores] = useState([]);
  const [produtoErrors, setProdutoErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Estado para o diálogo de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(['admin', 'estoquista']);

  useEffect(() => {
    fetchProdutos();
    fetchFornecedores();
  }, []);
  
  const fetchFornecedores = async () => {
    try {
      const response = await api.get('/fornecedores');
      setFornecedores(response.data);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      toast.error('Erro ao buscar fornecedores');
    }
  };

  const fetchProdutos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/produtos');
      setProdutos(response.data);
      setFilteredProdutos(response.data);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao buscar produtos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Filtra os produtos com base na busca e filtro de tamanho
    const filtered = produtos.filter(
      (produto) => {
        const matchesSearch = produto.nome.toLowerCase().includes(search.toLowerCase());
        const matchesTamanho = tamanhoFilter === '' || produto.tamanho === tamanhoFilter;
        return matchesSearch && matchesTamanho;
      }
    );
    
    setFilteredProdutos(filtered);
  }, [search, tamanhoFilter, produtos]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleTamanhoFilterChange = (e) => {
    setTamanhoFilter(e.target.value);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  // Funções para o CRUD de produtos
  const handleOpenProdutoDialog = (produto = null) => {
    if (produto) {
      setDialogTitle('Editar Produto');
      setProdutoForm({
        id: produto.id,
        nome: produto.nome,
        tamanho: produto.tamanho,
        quantidade: produto.quantidade,
        preco: (produto.preco || 0).toString(),
        fornecedor_id: produto.fornecedor_id || ''
      });
    } else {
      setDialogTitle('Novo Produto');
      setProdutoForm({
        id: null,
        nome: '',
        tamanho: '',
        quantidade: 0,
        preco: '',
        fornecedor_id: ''
      });
    }
    
    setProdutoErrors({});
    setDialogOpen(true);
  };

  const handleCloseProdutoDialog = () => {
    setDialogOpen(false);
  };

  const handleProdutoFormChange = (e) => {
    const { name, value } = e.target;
    
    // Para campos numéricos, permite apenas números e ponto
    if (name === 'preco') {
      if ((/^\d*\.?\d*$/).test(value) || value === '') {
        setProdutoForm({
          ...produtoForm,
          [name]: value
        });
      }
    } else if (name === 'quantidade') {
      if ((/^\d*$/).test(value) || value === '') {
        setProdutoForm({
          ...produtoForm,
          [name]: value === '' ? '' : parseInt(value) || 0
        });
      }
    } else {
      setProdutoForm({
        ...produtoForm,
        [name]: value
      });
    }
    
    // Limpa o erro do campo quando o usuário começa a digitar
    if (produtoErrors[name]) {
      setProdutoErrors({
        ...produtoErrors,
        [name]: ''
      });
    }
  };

  const validateProdutoForm = () => {
    const errors = {};
    
    if (!produtoForm.nome.trim()) {
      errors.nome = 'Nome é obrigatório';
    }
    
    if (!produtoForm.tamanho) {
      errors.tamanho = 'Tamanho é obrigatório';
    }
    
    if (produtoForm.quantidade < 0) {
      errors.quantidade = 'Quantidade não pode ser negativa';
    }
    
    if (!produtoForm.preco) {
      errors.preco = 'Preço é obrigatório';
    } else if (parseFloat(produtoForm.preco) <= 0) {
      errors.preco = 'Preço deve ser maior que zero';
    }
    
    setProdutoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitProdutoForm = async () => {
    if (!validateProdutoForm()) return;
    
    setFormSubmitting(true);
    
    try {
      const produtoData = {
        ...produtoForm,
        preco: parseFloat(produtoForm.preco)
      };
      
      if (produtoForm.id) {
        // Editar produto existente
        await api.put(`/produtos/${produtoForm.id}`, produtoData);
        toast.success('Produto atualizado com sucesso!');
      } else {
        // Criar novo produto
        await api.post('/produtos', produtoData);
        toast.success('Produto cadastrado com sucesso!');
      }
      
      // Atualiza a lista de produtos
      fetchProdutos();
      handleCloseProdutoDialog();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      if (error.response?.data?.suggestion) {
        toast.error(`${error.response.data.message} ${error.response.data.suggestion}`);
      } else {
        toast.error(error.response?.data?.message || 'Erro ao salvar produto');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Funções para excluir produto
  const handleOpenDeleteDialog = (produto) => {
    setProdutoToDelete(produto);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setProdutoToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!produtoToDelete) return;
    
    setDeleteLoading(true);
    
    try {
      await api.delete(`/produtos/${produtoToDelete.id}`);
      toast.success('Produto excluído com sucesso!');
      fetchProdutos();
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      if (error.response?.data?.solution) {
        toast.error(`${error.response.data.message} ${error.response.data.solution}`);
      } else {
        toast.error(error.response?.data?.message || 'Erro ao excluir produto');
      }
    } finally {
      setDeleteLoading(false);
    }
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1">Produtos</Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenProdutoDialog()}
          >
            Novo Produto
          </Button>
        )}
      </Box>

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
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="tamanho-filter-label">Filtrar por tamanho</InputLabel>
              <Select
                labelId="tamanho-filter-label"
                value={tamanhoFilter}
                label="Filtrar por tamanho"
                onChange={handleTamanhoFilterChange}
                displayEmpty
                size="small"
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PP">PP</MenuItem>
                <MenuItem value="P">P</MenuItem>
                <MenuItem value="M">M</MenuItem>
                <MenuItem value="G">G</MenuItem>
                <MenuItem value="GG">GG</MenuItem>
                <MenuItem value="XG">XG</MenuItem>
                <MenuItem value="XXG">XXG</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Tamanho</TableCell>
              <TableCell>Quantidade</TableCell>
              <TableCell>Custo Unitário</TableCell>
              <TableCell>Valor em Estoque</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : filteredProdutos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredProdutos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell>{produto.id}</TableCell>
                  <TableCell>{produto.nome}</TableCell>
                  <TableCell>{produto.tamanho}</TableCell>
                  <TableCell>{produto.quantidade}</TableCell>
                  <TableCell>{formatCurrency(produto.preco)}</TableCell>
                  <TableCell>{formatCurrency(produto.quantidade * produto.preco)}</TableCell>
                  <TableCell align="right">
                    {canEdit ? (
                      <>
                        <Tooltip title="Editar">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenProdutoDialog(produto)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton
                            color="error"
                            onClick={() => handleOpenDeleteDialog(produto)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <Tooltip title="Visualizar">
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenProdutoDialog(produto)}
                          size="small"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo para criar/editar produto */}
      <Dialog open={dialogOpen} onClose={handleCloseProdutoDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome *"
                name="nome"
                value={produtoForm.nome}
                onChange={handleProdutoFormChange}
                error={!!produtoErrors.nome}
                helperText={produtoErrors.nome}
                disabled={formSubmitting}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!produtoErrors.tamanho}>
                <InputLabel id="tamanho-label">Tamanho *</InputLabel>
                <Select
                  labelId="tamanho-label"
                  name="tamanho"
                  value={produtoForm.tamanho}
                  label="Tamanho *"
                  onChange={handleProdutoFormChange}
                  fullWidth
                  required
                >
                  <MenuItem value="PP">PP</MenuItem>
                  <MenuItem value="P">P</MenuItem>
                  <MenuItem value="M">M</MenuItem>
                  <MenuItem value="G">G</MenuItem>
                  <MenuItem value="GG">GG</MenuItem>
                  <MenuItem value="XG">XG</MenuItem>
                  <MenuItem value="XXG">XXG</MenuItem>
                </Select>
                {produtoErrors.tamanho && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {produtoErrors.tamanho}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Preço de Custo *"
                name="preco"
                value={produtoForm.preco}
                onChange={handleProdutoFormChange}
                error={!!produtoErrors.preco}
                helperText={produtoErrors.preco || 'Informe o preço de custo (valor de compra). O preço de venda será calculado aplicando o markup.'}
                disabled={formSubmitting}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Fornecedor</InputLabel>
                <Select
                  name="fornecedor_id"
                  value={produtoForm.fornecedor_id || ''}
                  onChange={handleProdutoFormChange}
                  label="Fornecedor"
                >
                  <MenuItem value="">Nenhum</MenuItem>
                  {fornecedores.map((fornecedor) => (
                    <MenuItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {produtoForm.id ? (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Quantidade em estoque"
                  value={produtoForm.quantidade}
                  disabled={true}
                  helperText="A quantidade em estoque deve ser alterada através da tela de Estoque"
                />
              </Grid>
            ) : (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Quantidade inicial *"
                  name="quantidade"
                  type="number"
                  value={produtoForm.quantidade}
                  onChange={handleProdutoFormChange}
                  error={!!produtoErrors.quantidade}
                  helperText={produtoErrors.quantidade || 'Quantidade inicial em estoque'}
                  disabled={formSubmitting}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProdutoDialog} disabled={formSubmitting}>
            Cancelar
          </Button>
          {canEdit && (
            <Button
              onClick={handleSubmitProdutoForm}
              variant="contained"
              disabled={formSubmitting}
            >
              {formSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o produto "{produtoToDelete?.nome} ({produtoToDelete?.tamanho})"? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleteLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Produtos;