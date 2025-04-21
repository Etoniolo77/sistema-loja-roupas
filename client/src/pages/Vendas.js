import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, TextField, Grid, IconButton, 
         Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
         Pagination, TableSortLabel, Chip, Dialog, DialogActions, 
         DialogContent, DialogContentText, DialogTitle, CircularProgress, 
         InputAdornment, MenuItem } from '@mui/material';
import { toast } from 'react-toastify';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Vendas = () => {
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filteredVendas, setFilteredVendas] = useState([]);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('data');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vendaToCancel, setVendaToCancel] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  const [vendaParaPagamento, setVendaParaPagamento] = useState(null);
  const [valorPagamento, setValorPagamento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('especie');
  const [observacoesPagamento, setObservacoesPagamento] = useState('');
  const [pagamentoLoading, setPagamentoLoading] = useState(false);
  
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const rowsPerPage = 10;

  useEffect(() => {
    fetchVendas();
  }, []);

  const fetchVendas = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendas');
      setVendas(response.data.data);
      setFilteredVendas(response.data.data);
      setTotalPages(Math.ceil(response.data.data.length / rowsPerPage));
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      toast.error('Erro ao buscar vendas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Filtra as vendas com base na busca e no filtro de status
    const filtered = vendas.filter(
      (venda) => {
        const matchesSearch = venda.cliente_nome?.toLowerCase().includes(search.toLowerCase()) ||
          venda.id.toString().includes(search);
        
        // Aplica o filtro de status se estiver selecionado
        const matchesStatus = statusFilter ? venda.status === statusFilter : true;
        
        return matchesSearch && matchesStatus;
      }
    );
    
    // Aplica a ordenação
    const sorted = filtered.sort((a, b) => {
      if (orderBy === 'data') {
        return order === 'asc'
          ? new Date(a.data) - new Date(b.data)
          : new Date(b.data) - new Date(a.data);
      }
      if (orderBy === 'valor') {
        return order === 'asc'
          ? a.valor_total - b.valor_total
          : b.valor_total - a.valor_total;
      }
      // Outros campos...
      return 0;
    });
    
    setFilteredVendas(sorted);
    setTotalPages(Math.ceil(sorted.length / rowsPerPage));
  }, [search, vendas, orderBy, order, statusFilter]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, value) => {
    setPage(value);
  };

  const handleViewVenda = (id) => {
    navigate(`/vendas/${id}`);
  };

  const handleNovaVenda = () => {
    navigate('/vendas/nova');
  };

  const handleOpenCancelDialog = (venda) => {
    if (venda.status === 'cancelada') {
      toast.warning('Esta venda já está cancelada.');
      return;
    }
    setVendaToCancel(venda);
    setDialogOpen(true);
    setMotivo('');
  };

  const handleCloseCancelDialog = () => {
    setDialogOpen(false);
    setVendaToCancel(null);
  };

  const handleCancelarVenda = async () => {
    if (!motivo.trim()) {
      toast.error('É necessário informar o motivo do cancelamento.');
      return;
    }

    setCancelLoading(true);
    try {
      await api.put(`/vendas/${vendaToCancel.id}/cancelar`, { motivo });
      toast.success('Venda cancelada com sucesso.');
      fetchVendas();
      handleCloseCancelDialog();
    } catch (error) {
      console.error('Erro ao cancelar venda:', error);
      toast.error(error.response?.data?.message || 'Erro ao cancelar venda.');
    } finally {
      setCancelLoading(false);
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
      default:
        return status;
    }
  };

  // Paginação
  const displayedVendas = filteredVendas.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Supondo que o markup seja obtido das configurações
  const markup = 0.2; // Exemplo de markup de 20%

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
        <Typography variant="h4" component="h1">Vendas</Typography>
        {hasPermission(['admin', 'vendedor']) && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNovaVenda}
          >
            Nova Venda
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Buscar por cliente ou nº da venda"
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
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              fullWidth
              label="Filtrar por status"
              variant="outlined"
              size="small"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              displayEmpty
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="pendente">Pendente</MenuItem>
              <MenuItem value="concluida">Concluída</MenuItem>
              <MenuItem value="cancelada">Cancelada</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'data'}
                  direction={orderBy === 'data' ? order : 'asc'}
                  onClick={() => handleRequestSort('data')}
                >
                  Data
                </TableSortLabel>
              </TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Itens</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'valor'}
                  direction={orderBy === 'valor' ? order : 'asc'}
                  onClick={() => handleRequestSort('valor')}
                >
                  Valor
                </TableSortLabel>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Vendedor</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedVendas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Nenhuma venda encontrada.
                </TableCell>
              </TableRow>
            ) : (
              displayedVendas.map((venda) => (
                <TableRow key={venda.id}>
                  <TableCell>#{venda.id}</TableCell>
                  <TableCell>{formatDate(venda.data)}</TableCell>
                  <TableCell>{venda.cliente_nome || 'N/A'}</TableCell>
                  <TableCell>{venda.total_itens}</TableCell>
                  <TableCell>{formatCurrency(venda.valor_total)}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(venda.status)}
                      color={getStatusColor(venda.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{venda.usuario_nome}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleViewVenda(venda.id)}
                      size="small"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={handleChangePage}
          color="primary"
        />
      </Box>

      {/* Diálogo de cancelamento de venda */}
      <Dialog open={dialogOpen} onClose={handleCloseCancelDialog}>
        <DialogTitle>Cancelar Venda</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Tem certeza que deseja cancelar a venda #{vendaToCancel?.id}? Esta ação não pode ser desfeita.
            O estoque será restaurado automaticamente.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Motivo do cancelamento"
            fullWidth
            variant="outlined"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            required
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog} disabled={cancelLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCancelarVenda} 
            color="error" 
            variant="contained"
            disabled={cancelLoading}
          >
            {cancelLoading ? <CircularProgress size={24} /> : 'Confirmar Cancelamento'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Vendas;
