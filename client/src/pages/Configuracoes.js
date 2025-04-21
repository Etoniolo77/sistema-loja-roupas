import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Divider,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Save as SaveIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Settings as SettingsIcon,
  Store as StoreIcon,
  ColorLens as ColorLensIcon,
  Security as SecurityIcon,
  Storage as DatabaseIcon
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

const Configuracoes = () => {
  const { user, hasPermission } = useAuth();
  const { mode, toggleTheme } = useContext(ThemeContext);
  // Import the api instance from AuthContext to ensure authentication headers are included
  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [backupFile, setBackupFile] = useState(null);
  const [configData, setConfigData] = useState({
    nome_loja: 'Dalô Modas',
    endereco: '',
    telefone: '',
    email: '',
    instagram: '',
    whatsapp: '',
    tema_cor_primaria: '#3f51b5',
    tema_cor_secundaria: '#f50057',
    mostrar_estoque_baixo: true,
    limite_estoque_baixo: 5,
    permitir_venda_sem_estoque: false,
    dias_vencimento_crediario: 30,
    markup: 0,
    logo: null,
    tema: 'padrão'
  });

  // Verificar se o usuário atual é administrador
  const isAdmin = hasPermission(['admin']);

  useEffect(() => {
    if (isAdmin) {
      fetchConfiguracoes();
    }
  }, [isAdmin]);

  const fetchConfiguracoes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/configuracoes');
      if (response.data) {
        setConfigData(response.data);
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfigData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setConfigData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setConfigData(prev => ({
      ...prev,
      [name]: parseInt(value, 10) || 0
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await api.post('/configuracoes/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setConfigData(prev => ({ ...prev, logo: response.data.logoUrl }));
      toast.success('Logo atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
      toast.error('Erro ao fazer upload do logo');
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      await api.post('/configuracoes', configData);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error(`Erro ao salvar configurações: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await api.get('/backup', {
        responseType: 'blob'
      });
      
      // Criar um link para download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `backup_dalo_modas_${date}.db`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Backup realizado com sucesso!');
    } catch (error) {
      console.error('Erro ao realizar backup:', error);
      toast.error('Erro ao realizar backup');
    } finally {
      setBackupLoading(false);
      setBackupDialogOpen(false);
    }
  };

  const handleRestore = async () => {
    if (!backupFile) {
      toast.error('Selecione um arquivo de backup');
      return;
    }

    setRestoreLoading(true);
    try {
      const formData = new FormData();
      formData.append('backup', backupFile);

      await api.post('/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Restauração realizada com sucesso! O sistema será reiniciado.');
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      toast.error('Erro ao restaurar backup');
    } finally {
      setRestoreLoading(false);
      setRestoreDialogOpen(false);
      setBackupFile(null);
    }
  };

  const handleMarkupChange = (e) => {
    const value = parseFloat(e.target.value.replace(',', '.'));
    if (!isNaN(value) && value >= 0) {
      setConfigData(prev => ({
        ...prev,
        markup: value / 100 // Armazenar como decimal
      }));
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Acesso restrito. Apenas administradores podem acessar as configurações do sistema.
        </Alert>
        <Typography variant="body1">
          Entre em contato com um administrador para obter acesso.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Configurações
      </Typography>

      <Tabs value={tabIndex} onChange={handleTabChange} aria-label="configurações tabs" sx={{ mb: 3 }}>
        <Tab icon={<StoreIcon />} label="Loja" />
        <Tab icon={<ColorLensIcon />} label="Aparência" />
        <Tab icon={<SettingsIcon />} label="Sistema" />
        <Tab icon={<DatabaseIcon />} label="Banco de Dados" />
      </Tabs>

      {tabIndex === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Informações da Loja</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome da Loja"
                name="nome_loja"
                value={configData.nome_loja}
                onChange={handleInputChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Endereço"
                name="endereco"
                value={configData.endereco}
                onChange={handleInputChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefone"
                name="telefone"
                value={configData.telefone}
                onChange={handleInputChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={configData.email}
                onChange={handleInputChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Instagram"
                name="instagram"
                value={configData.instagram}
                onChange={handleInputChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="WhatsApp"
                name="whatsapp"
                value={configData.whatsapp}
                onChange={handleInputChange}
                variant="outlined"
              />
            </Grid>
            {isAdmin && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Markup"
                  name="markup"
                  value={configData.markup * 100 || ''}
                  onChange={handleMarkupChange}
                  variant="outlined"
                  type="number"
                  InputProps={{
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ mb: 1 }}>Logo da Loja</Typography>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ width: '100%' }}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {tabIndex === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Aparência</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={mode === 'dark'}
                    onChange={toggleTheme}
                    name="darkMode"
                    color="primary"
                  />
                }
                label="Modo Escuro"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cor Primária"
                name="tema_cor_primaria"
                value={configData.tema_cor_primaria}
                onChange={handleInputChange}
                variant="outlined"
                type="color"
                InputProps={{
                  startAdornment: (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 1,
                        mr: 1,
                        backgroundColor: configData.tema_cor_primaria
                      }}
                    />
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cor Secundária"
                name="tema_cor_secundaria"
                value={configData.tema_cor_secundaria}
                onChange={handleInputChange}
                variant="outlined"
                type="color"
                InputProps={{
                  startAdornment: (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 1,
                        mr: 1,
                        backgroundColor: configData.tema_cor_secundaria
                      }}
                    />
                  )
                }}
              />
            </Grid>
            {isAdmin && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="tema-label">Tema</InputLabel>
                  <Select
                    labelId="tema-label"
                    name="tema"
                    value={configData.tema}
                    onChange={handleInputChange}
                    label="Tema"
                  >
                    <MenuItem value="padrão">Padrão</MenuItem>
                    <MenuItem value="escuro">Escuro</MenuItem>
                    <MenuItem value="claro">Claro</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            As alterações de tema serão aplicadas após reiniciar o sistema.
          </Typography>
        </Paper>
      )}

      {tabIndex === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Configurações do Sistema</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={configData.mostrar_estoque_baixo}
                    onChange={handleSwitchChange}
                    name="mostrar_estoque_baixo"
                    color="primary"
                  />
                }
                label="Mostrar alertas de estoque baixo"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Limite para estoque baixo"
                name="limite_estoque_baixo"
                value={configData.limite_estoque_baixo}
                onChange={handleNumberChange}
                variant="outlined"
                type="number"
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={configData.permitir_venda_sem_estoque}
                    onChange={handleSwitchChange}
                    name="permitir_venda_sem_estoque"
                    color="primary"
                  />
                }
                label="Permitir venda sem estoque"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Dias para vencimento do crediário"
                name="dias_vencimento_crediario"
                value={configData.dias_vencimento_crediario}
                onChange={handleNumberChange}
                variant="outlined"
                type="number"
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ajuste de Estoque"
                name="ajuste_estoque"
                value={configData.ajuste_estoque || 0}
                onChange={handleNumberChange}
                variant="outlined"
                type="number"
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {tabIndex === 3 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Banco de Dados</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="div">
                    Backup do Sistema
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Realize um backup completo do banco de dados. Recomendamos fazer backups regularmente.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<BackupIcon />}
                    onClick={() => setBackupDialogOpen(true)}
                  >
                    Realizar Backup
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="div">
                    Restaurar Backup
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Restaure o sistema a partir de um arquivo de backup. Atenção: esta ação substituirá todos os dados atuais.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<RestoreIcon />}
                    onClick={() => setRestoreDialogOpen(true)}
                  >
                    Restaurar Backup
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSaveConfig}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Salvar Configurações'}
        </Button>
      </Box>

      {/* Diálogo de Backup */}
      <Dialog
        open={backupDialogOpen}
        onClose={() => setBackupDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Realizar Backup</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Você está prestes a realizar um backup completo do banco de dados. Este processo pode levar alguns instantes.
          </Typography>
          <Alert severity="info">
            Recomendamos que você armazene o arquivo de backup em um local seguro.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleBackup}
            color="primary"
            variant="contained"
            disabled={backupLoading}
            startIcon={backupLoading ? <CircularProgress size={20} /> : <BackupIcon />}
          >
            {backupLoading ? 'Processando...' : 'Iniciar Backup'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Restauração */}
      <Dialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Restaurar Backup</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Você está prestes a restaurar o sistema a partir de um arquivo de backup. Esta ação substituirá todos os dados atuais.
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta ação não pode ser desfeita. Certifique-se de realizar um backup dos dados atuais antes de prosseguir.
          </Alert>
          <Box sx={{ mt: 2 }}>
            <input
              type="file"
              accept=".db,.sqlite,.backup"
              onChange={(e) => setBackupFile(e.target.files[0])}
              style={{ width: '100%' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleRestore}
            color="warning"
            variant="contained"
            disabled={restoreLoading || !backupFile}
            startIcon={restoreLoading ? <CircularProgress size={20} /> : <RestoreIcon />}
          >
            {restoreLoading ? 'Processando...' : 'Restaurar Sistema'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Configuracoes;