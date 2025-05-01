import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, TextField, Grid, IconButton, 
         Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
         Dialog, DialogActions, DialogContent, DialogTitle,
         InputAdornment, Tooltip, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhoneIcon from '@mui/icons-material/Phone';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Fornecedores = () => {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredFornecedores, setFilteredFornecedores] = useState([]);
  
  // Estado para o formulário do fornecedor
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [fornecedorForm, setFornecedorForm] = useState({
    id: null,
    nome: '',
    telefone: '',
    referencia: '',
    anotacoes: ''
  });
  const [fornecedorErrors, setFornecedorErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Estado para o diálogo de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fornecedorToDelete, setFornecedorToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(['admin', 'estoquista']);

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    setLoading(true);
    try {
      const response = await api.get('/fornecedores');
      setFornecedores(response.data);
      setFilteredFornecedores(response.data);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      toast.error('Erro ao buscar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Filtra os fornecedores com base na busca
    const filtered = fornecedores.filter(
      (fornecedor) => {
        return fornecedor.nome.toLowerCase().includes(search.toLowerCase()) ||
               (fornecedor.telefone && fornecedor.telefone.toLowerCase().includes(search.toLowerCase())) ||
               (fornecedor.referencia && fornecedor.referencia.toLowerCase().includes(search.toLowerCase())) ||
               (fornecedor.anotacoes && fornecedor.anotacoes.toLowerCase().includes(search.toLowerCase()));
      }
    );
    
    setFilteredFornecedores(filtered);
  }, [search, fornecedores]);

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

  // Funções para o CRUD de fornecedores
  const handleOpenFornecedorDialog = (fornecedor = null) => {
    if (fornecedor) {
      setDialogTitle('Editar Fornecedor');
      setFornecedorForm({
        id: fornecedor.id,
        nome: fornecedor.nome,
        telefone: fornecedor.telefone || '',
        referencia: fornecedor.referencia || '',
        anotacoes: fornecedor.anotacoes || ''
      });
    } else {
      setDialogTitle('Novo Fornecedor');
      setFornecedorForm({
        id: null,
        nome: '',
        telefone: '',
        referencia: '',
        anotacoes: ''
      });
    }
    
    setFornecedorErrors({});
    setDialogOpen(true);
  };

  const handleCloseFornecedorDialog = () => {
    setDialogOpen(false);
  };

  const handleFornecedorFormChange = (e) => {
    const { name, value } = e.target;
    
    setFornecedorForm({
      ...fornecedorForm,
      [name]: value
    });
    
    // Limpa o erro do campo quando o usuário começa a digitar
    if (fornecedorErrors[name]) {
      setFornecedorErrors({
        ...fornecedorErrors,
        [name]: ''
      });
    }
  };

  const validateFornecedorForm = () => {
    const errors = {};
    
    if (!fornecedorForm.nome.trim()) {
      errors.nome = 'Nome é obrigatório';
    }
    
    setFornecedorErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitFornecedorForm = async () => {
    if (!validateFornecedorForm()) return;
    
    setFormSubmitting(true);
    
    try {
      if (fornecedorForm.id) {
        // Atualizar fornecedor existente
        await api.put(`/fornecedores/${fornecedorForm.id}`, fornecedorForm);
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        // Criar novo fornecedor
        await api.post('/fornecedores', fornecedorForm);
        toast.success('Fornecedor criado com sucesso!');
      }
      
      // Fecha o diálogo e atualiza a lista
      handleCloseFornecedorDialog();
      fetchFornecedores();
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Erro ao salvar fornecedor');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Funções para exclusão de fornecedor
  const handleOpenDeleteDialog = (fornecedor) => {
    setFornecedorToDelete(fornecedor);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setFornecedorToDelete(null);
  };

  const handleDeleteFornecedor = async () => {
    setDeleteLoading(true);
    
    try {
      await api.delete(`/fornecedores/${fornecedorToDelete.id}`);
      toast.success('Fornecedor excluído com sucesso!');
      
      // Fecha o diálogo e atualiza a lista
      handleCloseDeleteDialog();
      fetchFornecedores();
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
        
        // Se houver uma solução sugerida, mostra também
        if (error.response.data.solution) {
          toast.info(error.response.data.solution);
        }
      } else {
        toast.error('Erro ao excluir fornecedor');
      }
    } finally {
      setDeleteLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Fornecedores
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={8}>
            <TextField
              fullWidth
              placeholder="Buscar fornecedores..."
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
                onClick={() => handleOpenFornecedorDialog()}
              >
                Novo Fornecedor
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
                <TableCell>Nome</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell>Referência</TableCell>
                <TableCell>Anotações</TableCell>
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
                      Carregando fornecedores...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredFornecedores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {search ? 'Nenhum fornecedor encontrado para a busca.' : 'Nenhum fornecedor cadastrado.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredFornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell>{fornecedor.nome}</TableCell>
                    <TableCell>
                      {fornecedor.telefone && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          {fornecedor.telefone}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>{fornecedor.referencia}</TableCell>
                    <TableCell>{fornecedor.anotacoes}</TableCell>
                    <TableCell>{formatDate(fornecedor.created_at)}</TableCell>
                    <TableCell align="right">
                      {canEdit && (
                        <>
                          <Tooltip title="Editar">
                            <IconButton onClick={() => handleOpenFornecedorDialog(fornecedor)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton onClick={() => handleOpenDeleteDialog(fornecedor)}>
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
      
      {/* Diálogo para criar/editar fornecedor */}
      <Dialog open={dialogOpen} onClose={handleCloseFornecedorDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome"
                name="nome"
                value={fornecedorForm.nome}
                onChange={handleFornecedorFormChange}
                error={!!fornecedorErrors.nome}
                helperText={fornecedorErrors.nome}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Telefone"
                name="telefone"
                value={fornecedorForm.telefone}
                onChange={handleFornecedorFormChange}
                placeholder="(00) 00000-0000"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Referência"
                name="referencia"
                value={fornecedorForm.referencia}
                onChange={handleFornecedorFormChange}
                placeholder="Ex: Fornecedor de camisetas"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Anotações"
                name="anotacoes"
                value={fornecedorForm.anotacoes}
                onChange={handleFornecedorFormChange}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFornecedorDialog}>Cancelar</Button>
          <Button 
            onClick={handleSubmitFornecedorForm} 
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
            Tem certeza que deseja excluir o fornecedor <strong>{fornecedorToDelete?.nome}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Esta ação não poderá ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button 
            onClick={handleDeleteFornecedor} 
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

export default Fornecedores;