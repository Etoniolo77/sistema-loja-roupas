import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Paper, 
  Tabs, 
  Tab, 
  Alert, 
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  Snackbar
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon, 
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';

const ImportacaoDados = () => {
  const [loading, setLoading] = useState(false);
  const [tipoAtivo, setTipoAtivo] = useState('produtos');
  const [resultado, setResultado] = useState(null);
  const [erros, setErros] = useState([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('info');

  const handleChangeTipo = (event, novoTipo) => {
    setTipoAtivo(novoTipo);
    setResultado(null);
    setErros([]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Verificar extensão do arquivo
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xls', 'xlsx'].includes(fileExt)) {
      showAlert('Formato de arquivo não suportado. Use CSV, XLS ou XLSX.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipoAtivo);

    setLoading(true);
    setResultado(null);
    setErros([]);

    try {
      const response = await axios.post('/api/importacao/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setResultado(response.data.resultado);
      showAlert(`Importação concluída com sucesso!`, 'success');
      toast.success('Dados importados com sucesso!');
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      
      if (error.response && error.response.data) {
        if (error.response.data.erros) {
          setErros(error.response.data.erros);
          showAlert('Existem erros nos dados. Verifique os detalhes abaixo.', 'error');
        } else {
          showAlert(error.response.data.error || 'Erro ao importar dados', 'error');
        }
      } else {
        showAlert('Erro ao importar dados', 'error');
      }
      
      toast.error('Erro ao importar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadModelo = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/importacao/modelos/${tipoAtivo}`, {
        responseType: 'blob'
      });
      
      // Criar URL para download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `modelo_${tipoAtivo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showAlert('Modelo baixado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao baixar modelo:', error);
      showAlert('Erro ao baixar modelo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, severity) => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };

  const handleCloseAlert = () => {
    setAlertOpen(false);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Importação de Dados
      </Typography>
      
      <Snackbar 
        open={alertOpen} 
        autoHideDuration={6000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={alertSeverity} sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Selecione o tipo de dados para importar
        </Typography>
        
        <Tabs 
          value={tipoAtivo} 
          onChange={handleChangeTipo} 
          sx={{ mb: 3 }}
          variant="fullWidth"
        >
          <Tab label="Produtos" value="produtos" />
          <Tab label="Clientes" value="clientes" />
          <Tab label="Usuários" value="usuarios" />
        </Tabs>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  1. Baixe o modelo
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Baixe o modelo de planilha para preencher com seus dados.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tipoAtivo === 'produtos' && 'Campos: nome, tamanho, quantidade, preço'}
                  {tipoAtivo === 'clientes' && 'Campos: nome, instagram, whatsapp, observações'}
                  {tipoAtivo === 'usuarios' && 'Campos: nome, login, senha, nível_acesso'}
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadModelo}
                  disabled={loading}
                  variant="contained"
                  color="primary"
                  fullWidth
                >
                  Baixar Modelo
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  2. Importe seus dados
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Selecione o arquivo preenchido para importar.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Formatos aceitos: CSV, XLS ou XLSX
                </Typography>
              </CardContent>
              <CardActions>
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="file-upload"
                  disabled={loading}
                />
                <label htmlFor="file-upload" style={{ width: '100%' }}>
                  <Button
                    variant="contained"
                    component="span"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={24} /> : <CloudUploadIcon />}
                    fullWidth
                  >
                    {loading ? 'Processando...' : 'Selecionar Arquivo'}
                  </Button>
                </label>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {erros.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#fff4f4' }}>
          <Typography variant="h6" color="error" gutterBottom>
            <ErrorIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Erros encontrados
          </Typography>
          <Divider sx={{ my: 2 }} />
          <List dense>
            {erros.map((erro, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={`Linha ${erro.linha}`}
                  secondary={erro.mensagens.join(', ')}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {resultado && (
        <Paper sx={{ p: 3, bgcolor: '#f4fff4' }}>
          <Typography variant="h6" color="success" gutterBottom>
            <CheckCircleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Resultado da importação
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="body1">
                <strong>Registros importados:</strong> {resultado.sucesso}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body1">
                <strong>Falhas:</strong> {resultado.falhas}
              </Typography>
            </Grid>
            {resultado.mensagens && resultado.mensagens.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                  Mensagens:
                </Typography>
                <List dense>
                  {resultado.mensagens.map((msg, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={msg} />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default ImportacaoDados;