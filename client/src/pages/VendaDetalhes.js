import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Grid, Table, TableBody, TableCell,
         TableContainer, TableHead, TableRow, Chip, Dialog, DialogActions,
         DialogContent, DialogTitle, TextField, MenuItem, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PaymentIcon from '@mui/icons-material/Payment';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const VendaDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  const [venda, setVenda] = useState(null);
  const [pagamentos, setPagamentos] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  const [novoPagamento, setNovoPagamento] = useState({
    valor: '',
    forma_pagamento: 'especie',
    observacoes: ''
  });
  const [pagamentoLoading, setPagamentoLoading] = useState(false);
  const [totalPago, setTotalPago] = useState(0);
  const [saldoRestante, setSaldoRestante] = useState(0);
  const [parcelasLoading, setParcelasLoading] = useState(false);

  useEffect(() => {
    fetchVendaDetalhes();
    fetchPagamentos();
    fetchParcelas();
  }, [id]);
  
  const fetchParcelas = async () => {
    if (venda?.forma_pagamento !== 'crediario') return;
    
    setParcelasLoading(true);
    try {
      const response = await api.get(`/vendas/${id}/parcelas`);
      setParcelas(response.data.parcelas || []);
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
      toast.error('Erro ao buscar parcelas');
    } finally {
      setParcelasLoading(false);
    }
  };

  const fetchVendaDetalhes = async () => {
    try {
      const response = await api.get(`/vendas/${id}`);
      setVenda(response.data);
    } catch (error) {
      console.error('Erro ao buscar detalhes da venda:', error);
      toast.error('Erro ao buscar detalhes da venda');
    }
  };

  const fetchPagamentos = async () => {
    try {
      const response = await api.get(`/vendas/${id}/pagamentos`);
      setPagamentos(response.data.pagamentos);
      setTotalPago(response.data.totalPago);
      setSaldoRestante(response.data.saldoRestante);
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      toast.error('Erro ao buscar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const handlePagamentoDialogOpen = () => {
    setPagamentoDialogOpen(true);
  };

  const handlePagamentoDialogClose = () => {
    setPagamentoDialogOpen(false);
    setNovoPagamento({
      valor: '',
      forma_pagamento: 'especie',
      observacoes: ''
    });
  };

  const handlePagamentoSubmit = async () => {
    if (!novoPagamento.valor || parseFloat(novoPagamento.valor) <= 0) {
      toast.error('O valor do pagamento deve ser maior que zero');
      return;
    }

    setPagamentoLoading(true);
    try {
      const response = await api.post(`/vendas/${id}/pagamentos`, novoPagamento);
      toast.success('Pagamento registrado com sucesso');
      handlePagamentoDialogClose();
      
      // Atualizar os valores com a resposta da API
      if (response.data && response.data.saldo_restante !== undefined) {
        const novoSaldoRestante = response.data.saldo_restante;
        setSaldoRestante(novoSaldoRestante);
        setTotalPago(venda.valor_total - novoSaldoRestante);
        
        // Atualizar o status da venda se necessário
        if (novoSaldoRestante === 0) {
          setVenda(prev => ({ ...prev, status: 'concluida' }));
        }
      }
      
      // Buscar a lista atualizada de pagamentos
      fetchPagamentos();
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast.error(error.response?.data?.message || 'Erro ao registrar pagamento');
    } finally {
      setPagamentoLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'concluida':
        return 'success';
      case 'cancelada':
        return 'error';
      case 'pendente':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'concluida':
        return 'Concluída';
      case 'cancelada':
        return 'Cancelada';
      case 'pendente':
        return 'Pendente';
      default:
        return status;
    }
  };

  const getFormaPagamentoLabel = (forma) => {
    const formas = {
      credito: 'Cartão de Crédito',
      debito: 'Cartão de Débito',
      pix: 'PIX',
      cheque: 'Cheque',
      especie: 'Dinheiro',
      crediario: 'Crediário'
    };
    return formas[forma] || forma;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!venda) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" color="error">
          Venda não encontrada
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/vendas')}
        >
          Voltar
        </Button>
        <Typography variant="h4" component="h1">
          Venda #{venda.id}
        </Typography>
        {hasPermission(['admin', 'vendedor']) && venda.status === 'pendente' && (
          <Button
            variant="contained"
            startIcon={<PaymentIcon />}
            onClick={handlePagamentoDialogOpen}
          >
            Registrar Pagamento
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Informações da Venda</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Data</Typography>
                <Typography>{formatDate(venda.data)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Status</Typography>
                <Chip
                  label={getStatusLabel(venda.status)}
                  color={getStatusColor(venda.status)}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Cliente</Typography>
                <Typography>{venda.cliente_nome || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Vendedor</Typography>
                <Typography>{venda.usuario_nome}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Forma de Pagamento</Typography>
                <Typography>{getFormaPagamentoLabel(venda.forma_pagamento)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Valor Total</Typography>
                <Typography>{formatCurrency(venda.valor_total)}</Typography>
              </Grid>
              {venda.status === 'pendente' && (
                <>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Total Pago</Typography>
                    <Typography>{formatCurrency(totalPago)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Saldo Restante</Typography>
                    <Typography color="error">{formatCurrency(saldoRestante)}</Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Itens da Venda</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produto</TableCell>
                    <TableCell>Tamanho</TableCell>
                    <TableCell align="right">Qtd</TableCell>
                    <TableCell align="right">Preço Unit.</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {venda.itens?.map((item) => {
                    // Calcular o preço unitário com desconto proporcional
                    let precoUnitarioComDesconto = item.preco_unitario;
                    if (venda.desconto_percentual > 0) {
                      // Aplicar o mesmo percentual de desconto ao preço unitário
                      precoUnitarioComDesconto = item.preco_unitario * (1 - venda.desconto_percentual / 100);
                    }
                    
                    // Calcular o subtotal correto baseado no preço com desconto
                    const subtotalCorreto = precoUnitarioComDesconto * item.quantidade;
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.produto_nome}</TableCell>
                        <TableCell>{item.produto_tamanho}</TableCell>
                        <TableCell align="right">{item.quantidade}</TableCell>
                        <TableCell align="right">{formatCurrency(precoUnitarioComDesconto)}</TableCell>
                        <TableCell align="right">{formatCurrency(subtotalCorreto)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              * O preço unitário exibido corresponde ao valor aplicado na venda, já considerando qualquer desconto proporcional. O subtotal de cada item também reflete este valor com desconto, e o valor total de devoluções corresponderá ao valor do item vendido com o desconto aplicado.
            </Typography>
          </Paper>
        </Grid>

        {venda.forma_pagamento === 'crediario' && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Parcelas do Crediário</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Parcela</TableCell>
                      <TableCell>Valor</TableCell>
                      <TableCell>Vencimento</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Data Pagamento</TableCell>
                      <TableCell>Usuário</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parcelasLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : parcelas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          Nenhuma parcela encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      parcelas.map((parcela) => (
                        <TableRow key={parcela.id}>
                          <TableCell>{parcela.numero_parcela}</TableCell>
                          <TableCell>{formatCurrency(parcela.valor)}</TableCell>
                          <TableCell>{formatDate(parcela.data_vencimento).split(' ')[0]}</TableCell>
                          <TableCell>
                            <Chip
                              label={parcela.status === 'paga' ? 'Paga' : parcela.status === 'pendente' ? 'Pendente' : 'Cancelada'}
                              color={parcela.status === 'paga' ? 'success' : parcela.status === 'pendente' ? 'warning' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{parcela.data_pagamento ? formatDate(parcela.data_pagamento).split(' ')[0] : '-'}</TableCell>
                          <TableCell>{parcela.usuario || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}
        
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Histórico de Pagamentos</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Forma de Pagamento</TableCell>
                    <TableCell>Usuário</TableCell>
                    <TableCell>Observações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        Nenhum pagamento registrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagamentos.map((pagamento) => (
                      <TableRow key={pagamento.id}>
                        <TableCell>{formatDate(pagamento.data)}</TableCell>
                        <TableCell>{formatCurrency(pagamento.valor)}</TableCell>
                        <TableCell>{getFormaPagamentoLabel(pagamento.forma_pagamento)}</TableCell>
                        <TableCell>{pagamento.usuario}</TableCell>
                        <TableCell>{pagamento.observacoes || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={pagamentoDialogOpen} onClose={handlePagamentoDialogClose}>
        <DialogTitle>Registrar Pagamento</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Valor"
                type="number"
                fullWidth
                value={novoPagamento.valor}
                onChange={(e) => setNovoPagamento({ ...novoPagamento, valor: e.target.value })}
                InputProps={{
                  inputProps: { min: 0, step: 0.01 },
                  startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Forma de Pagamento"
                fullWidth
                value={novoPagamento.forma_pagamento}
                onChange={(e) => setNovoPagamento({ ...novoPagamento, forma_pagamento: e.target.value })}
              >
                <MenuItem value="especie">Dinheiro</MenuItem>
                <MenuItem value="credito">Cartão de Crédito</MenuItem>
                <MenuItem value="debito">Cartão de Débito</MenuItem>
                <MenuItem value="pix">PIX</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Observações"
                fullWidth
                multiline
                rows={3}
                value={novoPagamento.observacoes}
                onChange={(e) => setNovoPagamento({ ...novoPagamento, observacoes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePagamentoDialogClose} disabled={pagamentoLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handlePagamentoSubmit}
            variant="contained"
            disabled={pagamentoLoading}
          >
            {pagamentoLoading ? <CircularProgress size={24} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VendaDetalhes;