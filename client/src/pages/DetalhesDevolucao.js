import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const DetalhesDevolucao = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [devolucao, setDevolucao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openRejeitar, setOpenRejeitar] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    fetchDevolucao();
  }, [id]);

  const fetchDevolucao = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/devolucoes/${id}`);
      setDevolucao(response.data);
    } catch (error) {
      console.error('Erro ao buscar detalhes da devolução:', error);
      toast.error('Erro ao carregar detalhes da devolução');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data) => {
    try {
      return format(new Date(data), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (error) {
      return data;
    }
  };

  const formatarValor = (valor) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'pendente':
        return <Chip label="Pendente" color="warning" />;
      case 'aprovada':
        return <Chip label="Aprovada" color="success" />;
      case 'rejeitada':
        return <Chip label="Rejeitada" color="error" />;
      default:
        return <Chip label={status} />;
    }
  };

  const handleAprovar = async () => {
    if (!window.confirm('Tem certeza que deseja aprovar esta devolução? Esta ação irá atualizar o estoque e gerar crédito para o cliente.')) {
      return;
    }

    try {
      setProcessando(true);
      await api.put(`/devolucoes/${id}/aprovar`);
      toast.success('Devolução aprovada com sucesso!');
      fetchDevolucao();
    } catch (error) {
      console.error('Erro ao aprovar devolução:', error);
      toast.error('Erro ao aprovar devolução');
    } finally {
      setProcessando(false);
    }
  };

  const handleOpenRejeitar = () => {
    setOpenRejeitar(true);
  };

  const handleCloseRejeitar = () => {
    setOpenRejeitar(false);
    setMotivoRejeicao('');
  };

  const handleRejeitar = async () => {
    if (!motivoRejeicao.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }

    try {
      setProcessando(true);
      await api.put(`/devolucoes/${id}/rejeitar`, { motivo_rejeicao: motivoRejeicao });
      toast.success('Devolução rejeitada com sucesso!');
      handleCloseRejeitar();
      fetchDevolucao();
    } catch (error) {
      console.error('Erro ao rejeitar devolução:', error);
      toast.error('Erro ao rejeitar devolução');
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!devolucao) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error" gutterBottom>
          Devolução não encontrada
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/devolucoes')}
        >
          Voltar para Devoluções
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Detalhes da Devolução #{devolucao.id}</Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/devolucoes')}
        >
          Voltar
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Cliente</Typography>
            <Typography variant="body1" gutterBottom>{devolucao.cliente_nome}</Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Venda Original</Typography>
            <Typography variant="body1" gutterBottom>#{devolucao.venda_id}</Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Data da Devolução</Typography>
            <Typography variant="body1" gutterBottom>{formatarData(devolucao.data)}</Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Status</Typography>
            <Box sx={{ mb: 2 }}>{getStatusChip(devolucao.status)}</Box>

            <Typography variant="subtitle2" color="text.secondary">Valor Total</Typography>
            <Typography variant="h6" color="primary" gutterBottom>{formatarValor(devolucao.valor_total)}</Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Registrado por</Typography>
            <Typography variant="body1" gutterBottom>{devolucao.usuario_nome}</Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary">Motivo da Devolução</Typography>
            <Typography variant="body1" paragraph>{devolucao.motivo}</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h5" gutterBottom>Itens Devolvidos</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Produto</TableCell>
              <TableCell>Tamanho</TableCell>
              <TableCell align="right">Preço Unit.</TableCell>
              <TableCell align="right">Quantidade</TableCell>
              <TableCell align="right">Subtotal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {devolucao.itens && devolucao.itens.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.produto_nome}</TableCell>
                <TableCell>{item.tamanho}</TableCell>
                <TableCell align="right">{formatarValor(item.preco_unitario)}</TableCell>
                <TableCell align="right">{item.quantidade}</TableCell>
                <TableCell align="right">{formatarValor(item.subtotal)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={4} align="right" sx={{ fontWeight: 'bold' }}>Total:</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatarValor(devolucao.valor_total)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        * O preço unitário exibido corresponde ao valor aplicado na venda original, já considerando qualquer desconto proporcional. O subtotal e o valor total da devolução correspondem exatamente ao valor do item vendido com o desconto aplicado na venda original.
      </Typography>

      {devolucao.status === 'pendente' && user?.nivel_acesso === 'admin' && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={handleOpenRejeitar}
            disabled={processando}
          >
            Rejeitar
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={handleAprovar}
            disabled={processando}
          >
            Aprovar
          </Button>
        </Box>
      )}

      {/* Dialog para rejeição */}
      <Dialog open={openRejeitar} onClose={handleCloseRejeitar}>
        <DialogTitle>Rejeitar Devolução</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Por favor, informe o motivo da rejeição desta devolução:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Motivo da Rejeição"
            fullWidth
            multiline
            rows={3}
            value={motivoRejeicao}
            onChange={(e) => setMotivoRejeicao(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRejeitar}>Cancelar</Button>
          <Button onClick={handleRejeitar} color="error">
            Rejeitar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DetalhesDevolucao;