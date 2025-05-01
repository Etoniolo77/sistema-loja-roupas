import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress } from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';

const RelatorioClientesPendentes = () => {
  const [clientesPendentes, setClientesPendentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientesPendentes();
  }, []);

  const fetchClientesPendentes = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/clientes/pendentes');
      setClientesPendentes(response.data);
    } catch (error) {
      console.error('Erro ao buscar clientes pendentes:', error);
      toast.error('Erro ao buscar clientes pendentes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Relatório de Clientes com Pagamentos Pendentes
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome do Cliente</TableCell>
              <TableCell>Valor Pendente</TableCell>
              <TableCell>Data de Vencimento</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : clientesPendentes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  Nenhum cliente com pagamentos pendentes.
                </TableCell>
              </TableRow>
            ) : (
              clientesPendentes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell>{cliente.nome}</TableCell>
                  <TableCell>{cliente.valorPendente}</TableCell>
                  <TableCell>{cliente.dataVencimento}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default RelatorioClientesPendentes; 