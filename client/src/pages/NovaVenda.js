import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, TextField, Grid, Autocomplete, 
         Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
         IconButton, Card, CardContent, Divider, CircularProgress,
         Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
         FormControl, InputLabel, Select, MenuItem, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { toast } from 'react-toastify';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import SaveIcon from '@mui/icons-material/Save';
import api from '../utils/api';

const NovaVenda = () => {
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [itens, setItens] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvandoVenda, setSalvandoVenda] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const [descontoValor, setDescontoValor] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState('especie');
const [numeroParcelas, setNumeroParcelas] = useState(1);
const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState('');
  
  const navigate = useNavigate();

  // Estado para armazenar o markup da loja
  const [markup, setMarkup] = useState(2.55); // Valor padrão inicial de 2.55

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Busca clientes, produtos e configurações em paralelo
      const [clientesRes, produtosRes, configRes] = await Promise.all([
        api.get('/clientes'),
        api.get('/produtos'),
        api.get('/configuracoes')
      ]);
      
      setClientes(clientesRes.data);
      
      // Obtém o markup das configurações
      if (configRes.data && configRes.data.markup) {
        setMarkup(configRes.data.markup);
      }
      
      // Filtra apenas produtos com estoque disponível
      const produtosComEstoque = produtosRes.data.filter(produto => produto.quantidade > 0);
      setProdutos(produtosComEstoque);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados necessários para a venda');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!produtoSelecionado) {
      toast.error('Selecione um produto');
      return;
    }
    
    if (quantidade <= 0) {
      toast.error('A quantidade deve ser maior que zero');
      return;
    }
    
    if (quantidade > produtoSelecionado.quantidade) {
      toast.error(`Quantidade indisponível. Estoque atual: ${produtoSelecionado.quantidade}`);
      return;
    }
    
    // Verifica se o produto já está na lista
    const itemExistente = itens.find(item => item.produto_id === produtoSelecionado.id);
    
    if (itemExistente) {
      // Atualiza a quantidade se o produto já estiver na lista
      const novaQuantidade = itemExistente.quantidade + quantidade;
      
      if (novaQuantidade > produtoSelecionado.quantidade) {
        toast.error(`Quantidade total excede o estoque disponível (${produtoSelecionado.quantidade})`);
        return;
      }
      
      const novosItens = itens.map(item => 
        item.produto_id === produtoSelecionado.id 
          ? { 
              ...item, 
              quantidade: novaQuantidade,
              subtotal: novaQuantidade * item.preco_unitario 
            } 
          : item
      );
      
      setItens(novosItens);
    } else {
      // Adiciona um novo item à lista
      // Aplica o markup ao preço de custo para obter o preço de venda
      const precoVenda = produtoSelecionado.preco * markup;
      
      const novoItem = {
        produto_id: produtoSelecionado.id,
        produto_nome: produtoSelecionado.nome,
        produto_tamanho: produtoSelecionado.tamanho,
        quantidade: quantidade,
        preco_unitario: precoVenda,
        preco_custo: produtoSelecionado.preco, // Mantém o preço de custo para referência
        subtotal: quantidade * precoVenda
      };
      
      setItens([...itens, novoItem]);
    }
    
    // Reseta os campos de produto e quantidade
    setProdutoSelecionado(null);
    setQuantidade(1);
  };

  const handleRemoveItem = (index) => {
    const novosItens = [...itens];
    novosItens.splice(index, 1);
    setItens(novosItens);
  };

  const handleVoltar = () => {
    if (itens.length > 0 && !salvandoVenda) {
      setConfirmDialogOpen(true);
    } else {
      navigate('/vendas');
    }
  };

  const confirmarVoltar = () => {
    setConfirmDialogOpen(false);
    navigate('/vendas');
  };

  const cancelarVoltar = () => {
    setConfirmDialogOpen(false);
  };

  const calcularTotalVenda = () => {
    return itens.reduce((total, item) => total + item.subtotal, 0);
  };

  const calcularSubtotal = () => {
    return calcularTotalVenda();
  };

  const handleDescontoPercentualChange = (e) => {
    const novoDescontoPercentual = parseFloat(e.target.value) || 0;
    setDescontoPercentual(novoDescontoPercentual);
    
    // Calcular o valor do desconto
    const subtotal = calcularSubtotal();
    const novoDescontoValor = (subtotal * novoDescontoPercentual) / 100;
    setDescontoValor(novoDescontoValor);
  };

  const handleDescontoValorChange = (e) => {
    const novoDescontoValor = parseFloat(e.target.value) || 0;
    setDescontoValor(novoDescontoValor);
    
    // Calcular o percentual do desconto
    const subtotal = calcularSubtotal();
    if (subtotal > 0) {
      const novoDescontoPercentual = (novoDescontoValor * 100) / subtotal;
      setDescontoPercentual(novoDescontoPercentual);
    }
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    return subtotal - descontoValor;
  };

  const handleFormaPagamentoChange = (e) => {
    const novaFormaPagamento = e.target.value;
    setFormaPagamento(novaFormaPagamento);
    
    // Se for crediário, define a data da primeira parcela para o dia atual
    if (novaFormaPagamento === 'crediario') {
      const hoje = new Date();
      const dataFormatada = hoje.toISOString().split('T')[0];
      setDataPrimeiraParcela(dataFormatada);
    }
  };
  
  const handleNumeroParcelasChange = (e) => {
    setNumeroParcelas(parseInt(e.target.value, 10));
  };
  
  const handleDataPrimeiraParcelaChange = (e) => {
    setDataPrimeiraParcela(e.target.value);
  };

  const handleSalvarVenda = async () => {
    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item à venda');
      return;
    }
    
    setSalvandoVenda(true);
    
    try {
      const vendaData = {
        cliente_id: clienteSelecionado?.id || null,
        itens: itens.map(item => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario
        })),
        observacoes: observacoes || null,
        subtotal: calcularSubtotal(),
        desconto_percentual: descontoPercentual,
        desconto_valor: descontoValor,
        valor_total: calcularTotal(),
        forma_pagamento: formaPagamento
      };
      
      // Adiciona informações de parcelamento se for crediário
      if (formaPagamento === 'crediario') {
        if (!clienteSelecionado?.id) {
          toast.error('Para vendas no crediário é necessário selecionar um cliente');
          setSalvandoVenda(false);
          return;
        }
        
        if (!dataPrimeiraParcela) {
          toast.error('É necessário definir a data da primeira parcela');
          setSalvandoVenda(false);
          return;
        }
        
        vendaData.numero_parcelas = numeroParcelas;
        vendaData.data_primeira_parcela = dataPrimeiraParcela;
      }
      
      const response = await api.post('/vendas', vendaData);
      
      toast.success('Venda registrada com sucesso!');
      navigate(`/vendas/${response.data.id}`);
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar venda');
    } finally {
      setSalvandoVenda(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleVoltar}
          disabled={salvandoVenda}
        >
          Voltar
        </Button>
        <Typography variant="h4" component="h1">Nova Venda</Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSalvarVenda}
          disabled={itens.length === 0 || salvandoVenda}
        >
          {salvandoVenda ? <CircularProgress size={24} /> : 'Finalizar Venda'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Dados da Venda</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Autocomplete
                  options={clientes}
                  getOptionLabel={(cliente) => `${cliente.nome} (${cliente.whatsapp})`}
                  value={clienteSelecionado}
                  onChange={(event, newValue) => {
                    setClienteSelecionado(newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Cliente (opcional)"
                      fullWidth
                      variant="outlined"
                      size="small"
                    />
                  )}
                  disabled={salvandoVenda}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observações (opcional)"
                  variant="outlined"
                  size="small"
                  multiline
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  disabled={salvandoVenda}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Adicionar Produtos</Typography>
            
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={produtos}
                  getOptionLabel={(produto) => {
                    const precoVenda = produto.preco * markup;
                    return `${produto.nome} (${produto.tamanho}) - ${formatCurrency(precoVenda)}`;
                  }}
                  value={produtoSelecionado}
                  onChange={(event, newValue) => {
                    setProdutoSelecionado(newValue);
                  }}
                  filterOptions={(options, state) => {
                    const inputValue = state.inputValue.toLowerCase().trim();
                    return options.filter(
                      (produto) =>
                        produto.nome.toLowerCase().includes(inputValue) ||
                        produto.id.toString().includes(inputValue)
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Buscar produto (por nome ou ID)"
                      fullWidth
                      variant="outlined"
                      size="small"
                    />
                  )}
                  renderOption={(props, produto) => (
                    <li {...props}>
                      <div>
                        <Typography variant="body1">{produto.nome} ({produto.tamanho})</Typography>
                        <Typography variant="body2" color="text.secondary">
                          ID: {produto.id} | Preço: {formatCurrency(produto.preco * markup)}
                        </Typography>
                      </div>
                    </li>
                  )}
                  disabled={salvandoVenda}
                />
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  label="Quantidade"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={quantidade}
                  onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                  InputProps={{ inputProps: { min: 1 } }}
                  disabled={salvandoVenda || !produtoSelecionado}
                />
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddShoppingCartIcon />}
                  onClick={handleAddItem}
                  disabled={salvandoVenda || !produtoSelecionado}
                >
                  Adicionar
                </Button>
              </Grid>
            </Grid>
            
            {produtoSelecionado && (
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                Estoque disponível: {produtoSelecionado.quantidade} unidades
              </Typography>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Itens da Venda</Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Produto</TableCell>
                    <TableCell align="center">Tamanho</TableCell>
                    <TableCell align="center">Quantidade</TableCell>
                    <TableCell align="right">Preço Unit.</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        Nenhum item adicionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.produto_nome}</TableCell>
                        <TableCell align="center">{item.produto_tamanho}</TableCell>
                        <TableCell align="center">{item.quantidade}</TableCell>
                        <TableCell align="right">{formatCurrency(item.preco_unitario)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.subtotal)}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            color="error"
                            onClick={() => handleRemoveItem(index)}
                            size="small"
                            disabled={salvandoVenda}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumo da Venda
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Cliente:
                </Typography>
                <Typography variant="body1">
                  {clienteSelecionado ? clienteSelecionado.nome : 'Não informado'}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Quantidade de itens:
                </Typography>
                <Typography variant="body1">
                  {itens.length} produtos | {itens.reduce((total, item) => total + item.quantidade, 0)} unidades
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1">
                  {formatCurrency(calcularSubtotal())}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <TextField 
                  label="Desconto %" 
                  variant="outlined" 
                  size="small" 
                  type="number"
                  value={descontoPercentual}
                  onChange={handleDescontoPercentualChange}
                  InputProps={{ inputProps: { min: 0, max: 100, step: 1 } }}
                  sx={{ width: '48%' }}
                  disabled={salvandoVenda}
                />
                <TextField 
                  label="Desconto R$" 
                  variant="outlined" 
                  size="small" 
                  type="number"
                  value={descontoValor}
                  onChange={handleDescontoValorChange}
                  InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  sx={{ width: '48%' }}
                  disabled={salvandoVenda}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" color="primary.main">
                  {formatCurrency(calcularTotal())}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" gutterBottom>Forma de Pagamento:</Typography>
                <FormControl component="fieldset" fullWidth>
                  <RadioGroup
                    value={formaPagamento}
                    onChange={handleFormaPagamentoChange}
                    name="formaPagamento"
                  >
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <FormControlLabel value="credito" control={<Radio size="small" />} label="Crédito" />
                      </Grid>
                      <Grid item xs={6}>
                        <FormControlLabel value="debito" control={<Radio size="small" />} label="Débito" />
                      </Grid>
                      <Grid item xs={6}>
                        <FormControlLabel value="pix" control={<Radio size="small" />} label="Pix" />
                      </Grid>
                      <Grid item xs={6}>
                        <FormControlLabel value="crediario" control={<Radio size="small" />} label="Crediário" />
                      </Grid>
                      <Grid item xs={6}>
                        <FormControlLabel value="cheque" control={<Radio size="small" />} label="Cheque" />
                      </Grid>
                      <Grid item xs={6}>
                        <FormControlLabel value="especie" control={<Radio size="small" />} label="Espécie" />
                      </Grid>
                    </Grid>
                  </RadioGroup>
                </FormControl>
                
                {formaPagamento === 'crediario' && (
                  <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Opções de Parcelamento:</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth margin="dense">
                          <InputLabel id="numero-parcelas-label">Número de Parcelas</InputLabel>
                          <Select
                            labelId="numero-parcelas-label"
                            value={numeroParcelas}
                            onChange={handleNumeroParcelasChange}
                            label="Número de Parcelas"
                          >
                            {[1, 2, 3, 4, 5, 6].map(num => (
                              <MenuItem key={num} value={num}>{num} {num === 1 ? 'parcela' : 'parcelas'}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Data da 1ª Parcela"
                          type="date"
                          value={dataPrimeiraParcela}
                          onChange={handleDataPrimeiraParcelaChange}
                          InputLabelProps={{ shrink: true }}
                          margin="dense"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
              
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<SaveIcon />}
                onClick={handleSalvarVenda}
                disabled={itens.length === 0 || salvandoVenda}
              >
                {salvandoVenda ? <CircularProgress size={24} /> : 'Finalizar Venda'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Diálogo de confirmação ao sair */}
      <Dialog open={confirmDialogOpen} onClose={cancelarVoltar}>
        <DialogTitle>Cancelar venda?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Existem itens na venda atual. Se sair, todos os dados serão perdidos.
            Tem certeza que deseja cancelar esta venda?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelarVoltar} color="primary">
            Continuar Editando
          </Button>
          <Button onClick={confirmarVoltar} color="error">
            Sair Sem Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NovaVenda;
