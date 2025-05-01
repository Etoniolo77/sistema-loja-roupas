import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const Usuarios = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    tipo: 'vendedor'
  });

  // Verificar se o usuário atual é administrador
  const isAdmin = user?.tipo === 'admin';

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      // Simulação de dados para desenvolvimento enquanto a API não está pronta
      const usuariosSimulados = [
        { id: 1, nome: 'Administrador', email: 'admin@exemplo.com', tipo: 'admin' },
        { id: 2, nome: 'Vendedor', email: 'vendedor@exemplo.com', tipo: 'vendedor' }
      ];
      
      setUsuarios(usuariosSimulados);
      toast.info('Dados de usuários simulados carregados. Implemente a API para dados reais.');
      
      /* Comentado até que a API esteja pronta
      const response = await axios.get('/api/usuarios');
      setUsuarios(response.data);
      */
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários. A API pode não estar implementada.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '',
      tipo: 'vendedor'
    });
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({
      nome: '',
      email: '',
      senha: '',
      tipo: 'vendedor'
    });
    setShowPassword(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditClick = (usuario) => {
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      tipo: usuario.tipo
    });
    setEditingId(usuario.id);
    setDialogOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        // Simulação de exclusão para desenvolvimento
        setUsuarios(prev => prev.filter(usuario => usuario.id !== id));
        toast.success('Usuário excluído com sucesso! (Simulação)');
        
        /* Comentado até que a API esteja pronta
        await axios.delete(`/api/usuarios/${id}`);
        toast.success('Usuário excluído com sucesso!');
        fetchUsuarios();
        */
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        toast.error(`Erro ao excluir usuário: A API pode não estar implementada.`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validação básica
      if (!formData.nome.trim() || !formData.email.trim()) {
        toast.error('Nome e email são obrigatórios');
        setSubmitting(false);
        return;
      }

      if (!editingId && !formData.senha.trim()) {
        toast.error('Senha é obrigatória para novos usuários');
        setSubmitting(false);
        return;
      }

      const userData = {
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        tipo: formData.tipo
      };

      // Incluir senha apenas se estiver preenchida
      if (formData.senha.trim()) {
        userData.senha = formData.senha.trim();
      }

      // Simulação de criação/edição para desenvolvimento
      if (editingId) {
        // Atualizar usuário existente (simulação)
        setUsuarios(prev => prev.map(usuario => 
          usuario.id === editingId ? { ...usuario, ...userData } : usuario
        ));
        toast.success('Usuário atualizado com sucesso! (Simulação)');
      } else {
        // Criar novo usuário (simulação)
        const novoUsuario = {
          id: Math.max(0, ...usuarios.map(u => u.id)) + 1,
          ...userData
        };
        setUsuarios(prev => [...prev, novoUsuario]);
        toast.success('Usuário cadastrado com sucesso! (Simulação)');
      }

      /* Comentado até que a API esteja pronta
      if (editingId) {
        // Atualizar usuário existente
        await axios.put(`/api/usuarios/${editingId}`, userData);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Criar novo usuário
        await axios.post('/api/usuarios', userData);
        toast.success('Usuário cadastrado com sucesso!');
      }
      fetchUsuarios();
      */

      // Fechar o diálogo
      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast.error(`Erro ao salvar usuário: A API pode não estar implementada.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrar usuários com base no termo de busca
  const filteredUsuarios = usuarios.filter(usuario => 
    usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1">Usuários</Typography>
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={fetchUsuarios}
            sx={{ mr: 2 }}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            Novo Usuário
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Esta é uma simulação do CRUD de usuários. Implemente a API no backend para funcionalidade completa.
      </Alert>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          label="Buscar Usuários"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress />
                    <Typography variant="body1" sx={{ ml: 2 }}>
                      Carregando usuários...
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : filteredUsuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body1">
                    Nenhum usuário encontrado
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell>{usuario.nome}</TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>
                    {usuario.tipo === 'admin' ? 'Administrador' : 'Vendedor'}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Tooltip title="Editar">
                        <IconButton
                          color="primary"
                          onClick={() => handleEditClick(usuario)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <span>
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteClick(usuario.id)}
                            disabled={usuario.id === user?.id} // Impedir exclusão do próprio usuário
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                margin="dense"
                name="nome"
                label="Nome"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.nome}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="email"
                label="Email"
                type="email"
                fullWidth
                variant="outlined"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="senha"
                label={editingId ? "Nova Senha (deixe em branco para manter a atual)" : "Senha"}
                type={showPassword ? "text" : "password"}
                fullWidth
                variant="outlined"
                value={formData.senha}
                onChange={handleInputChange}
                required={!editingId}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense">
                <InputLabel id="tipo-label">Tipo de Usuário</InputLabel>
                <Select
                  labelId="tipo-label"
                  name="tipo"
                  value={formData.tipo}
                  label="Tipo de Usuário"
                  onChange={handleInputChange}
                >
                  <MenuItem value="vendedor">Vendedor</MenuItem>
                  <MenuItem value="admin">Administrador</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            color="primary"
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Usuarios;