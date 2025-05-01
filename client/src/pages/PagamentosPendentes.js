import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, 
         TableHead, TableRow, Paper, CircularProgress, Button, Dialog,
         DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
         IconButton, Chip } from '@mui/material';
import { toast } from 'react-toastify';
import PaymentIcon from '@mui/icons-material/Payment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PagamentosPendentes = () => {
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagamentoDialog, setPagamentoDialog] = useState(false);
  const [selectedVenda, setSelectedVenda] = useState(null);
  const [valorPagamento, setValorPagamento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('especie');
  const [observacoes, setObservacoes] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchVendasPendentes();
  }, []);

  const fetchVendasPendentes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendas?status=pendente');
      setVendas(response.data.data);
    } catch (error) {
      console.error('Erro ao buscar vendas pendentes:', error);
      toast.error('Erro ao buscar vendas pendentes');
    } finally {
      setLoading(false);
    }
  };

  const handlePagamentoClick = (venda) => {
    setSelectedVenda(venda);
    setValorPagamento('');
    setFormaPagamento('especie');
    setObservacoes('');
    setPagamentoDialog(true);
  };

  const handlePagamentoSubmit = async () => {
    if (!valorPagamento || parseFloat(valorPagamento) <= 0) {
      toast.error('Informe um valor válido para o pagamento');
      return;
    }

    try {
      const response = await api.post('/pagamentos', {
        venda_id: selectedVenda.id,
        valor: parseFloat(valorPagamento),
        forma_pagamento: formaPagamento,
        observacoes
      });

      // Atualiza a venda localmente com o novo pagamento
      const updatedVendas = vendas.map(venda => {
        if (venda.id === selectedVenda.id) {
          return {
            ...venda,
            pagamentos: [...(venda.pagamentos || []), response.data.pagamento],
            status: response.data.status
          };
        }
        return venda;
      });

      setVendas(updatedVendas);
      toast.success('Pagamento registrado com sucesso');
      setPagamentoDialog(false);
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast.error(error.response?.data?.message || 'Erro ao registrar pagamento');
    }
  };

  const calcularValorPendente = (venda) => {
    const totalPago = venda.pagamentos?.reduce((acc, pag) => acc + pag.valor, 0) || 0;
    return venda.valor_total - totalPago;
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Pagamentos Pendentes
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Venda ID</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Valor Total</TableCell>
              <TableCell>Valor Pago</TableCell>
              <TableCell>Valor Pendente</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : vendas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Nenhuma venda pendente encontrada.
                </TableCell>
              </TableRow>
            ) : (
              vendas.map((venda) => {
                const valorPendente = calcularValorPendente(venda);
                return (
                  <TableRow key={venda.id}>
                    <TableCell>{venda.id}</TableCell>
                    <TableCell>
                      {format(parseISO(venda.data), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{venda.cliente_nome}</TableCell>
                    <TableCell>R$ {venda.valor_total.toFixed(2)}</TableCell>
                    <TableCell>
                      R$ {(venda.valor_total - valorPendente).toFixed(2)}
                    </TableCell>
                    <TableCell>R$ {valorPendente.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={venda.status.toUpperCase()}
                        color={venda.status === 'pendente' ? 'warning' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handlePagamentoClick(venda)}
                        color="primary"
                        title="Registrar Pagamento"
                      >
                        <PaymentIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => navigate(`/vendas/${venda.id}`)}
                        color="info"
                        title="Ver Detalhes"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={pagamentoDialog} onClose={() => setPagamentoDialog(false)}>
        <DialogTitle>Registrar Pagamento</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Venda #{selectedVenda?.id} - {selectedVenda?.cliente_nome}
              <br />
              Valor Total: R$ {selectedVenda?.valor_total.toFixed(2)}
              <br />
              Valor Pendente: R$ {selectedVenda ? calcularValorPendente(selectedVenda).toFixed(2) : '0.00'}
            </Typography>

            <TextField
              label="Valor do Pagamento"
              type="number"
              fullWidth
              value={valorPagamento}
              onChange={(e) => setValorPagamento(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              select
              label="Forma de Pagamento"
              fullWidth
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="especie">Dinheiro</MenuItem>
              <MenuItem value="pix">PIX</MenuItem>
              <MenuItem value="debito">Cartão de Débito</MenuItem>
              <MenuItem value="credito">Cartão de Crédito</MenuItem>
              <MenuItem value="cheque">Cheque</MenuItem>
            </TextField>

            <TextField
              label="Observações"
              fullWidth
              multiline
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPagamentoDialog(false)}>Cancelar</Button>
          <Button onClick={handlePagamentoSubmit} variant="contained" color="primary">
            Confirmar Pagamento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PagamentosPendentes;