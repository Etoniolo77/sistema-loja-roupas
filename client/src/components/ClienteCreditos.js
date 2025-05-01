import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Collapse,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import api from '../utils/api';

const ClienteCreditos = ({ clienteId }) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creditos, setCreditos] = useState([]);
  const [totalCreditos, setTotalCreditos] = useState(0);

  const fetchTotalCreditos = async () => {
    if (!clienteId) return;
    try {
      const response = await api.get(`/devolucoes/creditos/cliente/${clienteId}`);
      setTotalCreditos(response.data.total || 0);
    } catch (error) {
      console.error('Erro ao buscar total de créditos do cliente:', error);
    }
  };

  const fetchCreditos = async () => {
    if (!clienteId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/devolucoes/creditos/cliente/${clienteId}`);
      setCreditos(response.data.creditos || []);
      setTotalCreditos(response.data.total || 0);
    } catch (error) {
      console.error('Erro ao buscar créditos do cliente:', error);
      toast.error('Não foi possível carregar os créditos do cliente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clienteId) {
      fetchTotalCreditos();
    }
  }, [clienteId]);

  useEffect(() => {
    if (expanded && clienteId) {
      fetchCreditos();
    }
  }, [expanded, clienteId]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getOrigemLabel = (origem) => {
    switch (origem) {
      case 'devolucao':
        return 'Devolução';
      case 'manual':
        return 'Manual';
      default:
        return origem;
    }
  };

  const isExpirado = (dataExpiracao) => {
    if (!dataExpiracao) return false;
    try {
      return !isAfter(parseISO(dataExpiracao), new Date());
    } catch (error) {
      return false;
    }
  };

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Paper sx={{ 
        p: 1, 
        bgcolor: 'primary.light', 
        color: 'primary.contrastText',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer'
      }} onClick={() => setExpanded(!expanded)}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CreditCardIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1">
            Créditos Disponíveis: {formatCurrency(totalCreditos)}
          </Typography>
        </Box>
        <Box>
          {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </Box>
      </Paper>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Paper sx={{ p: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Histórico de Créditos</Typography>
            <Tooltip title="Atualizar créditos">
              <IconButton onClick={fetchCreditos} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ ml: 1 }}>
                Carregando créditos...
              </Typography>
            </Box>
          ) : creditos.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Valor</TableCell>
                    <TableCell>Origem</TableCell>
                    <TableCell>Data de Criação</TableCell>
                    <TableCell>Validade</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {creditos.map((credito) => (
                    <TableRow key={credito.id}>
                      <TableCell>{formatCurrency(credito.valor)}</TableCell>
                      <TableCell>{getOrigemLabel(credito.origem)}</TableCell>
                      <TableCell>{formatDate(credito.data_criacao)}</TableCell>
                      <TableCell>
                        {credito.data_expiracao ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {formatDate(credito.data_expiracao)}
                            {isExpirado(credito.data_expiracao) && (
                              <Chip 
                                label="Expirado" 
                                size="small" 
                                color="error" 
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                        ) : (
                          'Sem validade'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body1" sx={{ textAlign: 'center', py: 2 }}>
              Este cliente não possui créditos disponíveis.
            </Typography>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
};

export default ClienteCreditos;