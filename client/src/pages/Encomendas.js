import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, TextField, Grid, IconButton, 
         Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
         Dialog, DialogActions, DialogContent, DialogTitle,
         InputAdornment, Tooltip, CircularProgress, Checkbox, FormControlLabel,
         FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { toast } from 'react-toastify';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Encomendas = () => {
  const [encomendas, setEncomendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredEncomendas, setFilteredEncomendas] = useState([]);
  
  // Estado para o formulário da encomenda
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [encomendaForm, setEncomendaForm] = useState({
    id: null,
    cliente_id: '',
    tamanho: '',
    observacao: '',
    atendida: false
  });
  const [encomendaErrors, setEncomendaErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Estado para o diálogo de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [encomendaToDelete, setEncomendaToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(['admin', 'vendedor']);

  useEffect(() => {
    fetchEncomendas();
    fetchClientes();
  }, []);

  const fetchEncomendas = async () => {
    setLoading(true);
    try {
      const response = await api.get('/encomendas');
      setEncomendas(response.data);
      setFilteredEncomendas(response.data);
    } catch (error) {
      console.error('Erro ao buscar encomendas:', error);
      toast.error('Erro ao buscar encomendas');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const response = await api.get('/clientes');
      setClientes(response.data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast.error('Erro ao buscar clientes');
    }
  };

  useEffect(() => {
    // Filtra as encomendas com base na busca
    const filtered = encomendas.filter(
      (encomenda) => {
        return (encomenda.cliente_nome && encomenda.cliente_nome.toLowerCase().includes(search.toLowerCase())) ||
               (encomenda.tamanho && encomenda.tamanho.toLowerCase().includes(search.toLowerCase())) ||
               (encomenda.observacao && encomenda.observacao.toLowerCase().includes(search.toLowerCase()));
      }
    );
    
    setFilteredEncomendas(filtered);
  }, [search, encomendas]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  // Funções para o CRUD de encomendas
  const handleOpenEncomendaDialog = (encomenda = null) => {
    if (encomenda) {
      setDialogTitle('Editar Encomenda');
      setEncomendaForm({
        id: encomenda.id,
        cliente_id: encomenda.cliente_id,
        tamanho: encomenda.tamanho,
        observacao: encomenda.observacao || '',
        atendida: encomenda.atendida === 1
      });
    } else {
      setDialogTitle('Nova Encomenda');
      setEncomendaForm({
        id: null,
        cliente_id: '',
        tamanho: '',
        observacao: '',
        atendida: false
      });
    }
    
    setEncomendaErrors({});
    setDialogOpen(true);
  };

  const handleCloseEncomendaDialog = () => {
    setDialogOpen(false);
  };

  const handleEncomendaFormChange = (e) => {
    const { name, value, checked } = e.target;
    
    if (name === 'atendida') {
      setEncomendaForm({
        ...encomendaForm,
        [name]: checked
      });
    } else {
      setEncomendaForm({
        ...encomendaForm,
        [name]: value
      });
    }
    
    // Limpa o erro do campo quando o usuário começa a digitar
    if (encomendaErrors[name]) {
      setEncomendaErrors({
        ...encomendaErrors,
        [name]: ''
      });
    }
  };

  const validateEncomendaForm = () => {
    const errors = {};
    
    if (!encomendaForm.cliente_id) {
      errors.cliente_id = 'Cliente é obrigatório';
    }
    
    if (!encomendaForm.tamanho) {
      errors.tamanho = 'Tamanho é obrigatório';
    }
    
    setEncomendaErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitEncomendaForm = async () => {
    if (!validateEncomendaForm()) return;
    
    setFormSubmitting(true);
    
    try {
      if (encomendaForm.id) {
        // Atualizar encomenda existente
        await api.put(`/encomendas/${encomendaForm.id}`, encomendaForm);
        toast.success('Encomenda atualizada com sucesso!');
      } else {
        // Criar nova encomenda
        await api.post('/encomendas', encomendaForm);
        toast.success('Encomenda criada com sucesso!');
      }
      
      // Fecha o diálogo e atualiza a lista
      handleCloseEncomendaDialog();
      fetchEncomendas();
    } catch (error) {
      console.error('Erro ao salvar encomenda:', error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Erro ao salvar encomenda');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Funções para exclusão de encomenda
  const handleOpenDeleteDialog = (encomenda) => {
    setEncomendaToDelete(encomenda);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setEncomendaToDelete(null);
  };

  const handleDeleteEncomenda = async () => {
    setDeleteLoading(true);
    
    try {
      await api.delete(`/encomendas/${encomendaToDelete.id}`);
      toast.success('Encomenda excluída com sucesso!');
      
      // Fecha o diálogo e atualiza a lista
      handleCloseDeleteDialog();
      fetchEncomendas();
    } catch (error) {
      console.error('Erro ao excluir encomenda:', error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Erro ao excluir encomenda');
      }
    } finally {
      setDeleteLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Encomendas
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={8}>
            <TextField
              fullWidth
              placeholder="Buscar encomendas..."
              value={search}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            {canEdit && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpenEncomendaDialog()}
              >
                Nova Encomenda
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Tamanho</TableCell>
                <TableCell>Observação</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Data de Cadastro</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={30} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Carregando encomendas...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredEncomendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {search ? 'Nenhuma encomenda encontrada para a busca.' : 'Nenhuma encomenda cadastrada.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEncomendas.map((encomenda) => (
                  <TableRow key={encomenda.id}>
                    <TableCell>{encomenda.cliente_nome}</TableCell>
                    <TableCell>{encomenda.tamanho}</TableCell>
                    <TableCell>{encomenda.observacao}</TableCell>
                    <TableCell>
                      {encomenda.atendida === 1 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                          <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
                          Atendida
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'warning.main' }}>
                          <CancelIcon fontSize="small" sx={{ mr: 1 }} />
                          Pendente
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(encomenda.created_at)}</TableCell>
                    <TableCell align="right">
                      {canEdit && (
                        <>
                          <Tooltip title="Editar">
                            <IconButton onClick={() => handleOpenEncomendaDialog(encomenda)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton onClick={() => handleOpenDeleteDialog(encomenda)}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Diálogo para criar/editar encomenda */}
      <Dialog open={dialogOpen} onClose={handleCloseEncomendaDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!encomendaErrors.cliente_id}>
                <InputLabel>Cliente</InputLabel>
                <Select
                  name="cliente_id"
                  value={encomendaForm.cliente_id}
                  onChange={handleEncomendaFormChange}
                  label="Cliente"
                  required
                >
                  {clientes.map((cliente) => (
                    <MenuItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </MenuItem>
                  ))}
                </Select>
                {encomendaErrors.cliente_id && (
                  <Typography variant="caption" color="error">
                    {encomendaErrors.cliente_id}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!encomendaErrors.tamanho}>
                <InputLabel>Tamanho</InputLabel>
                <Select
                  name="tamanho"
                  value={encomendaForm.tamanho}
                  onChange={handleEncomendaFormChange}
                  label="Tamanho"
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
                {encomendaErrors.tamanho && (
                  <Typography variant="caption" color="error">
                    {encomendaErrors.tamanho}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observação"
                name="observacao"
                value={encomendaForm.observacao}
                onChange={handleEncomendaFormChange}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={encomendaForm.atendida}
                    onChange={handleEncomendaFormChange}
                    name="atendida"
                  />
                }
                label="Encomenda atendida"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEncomendaDialog}>Cancelar</Button>
          <Button 
            onClick={handleSubmitEncomendaForm} 
            variant="contained" 
            color="primary"
            disabled={formSubmitting}
          >
            {formSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir esta encomenda do cliente <strong>{encomendaToDelete?.cliente_nome}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Esta ação não poderá ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button 
            onClick={handleDeleteEncomenda} 
            variant="contained" 
            color="error"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Encomendas;