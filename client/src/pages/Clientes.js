import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, TextField, Grid, IconButton, 
         Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
         Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
         InputAdornment, Tooltip, CircularProgress, Collapse, Tabs, Tab, TableFooter, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { toast } from 'react-toastify';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import InstagramIcon from '@mui/icons-material/Instagram';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClienteCreditos from '../components/ClienteCreditos';
import InputMask from 'react-input-mask';

const Clientes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para o formulário do cliente
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [clienteForm, setClienteForm] = useState({
    id: null,
    nome: '',
    instagram: '',
    whatsapp: '',
    cpf: '',
    data_nascimento: '',
    endereco: '',
    observacoes: ''
  });
  const [clienteErrors, setClienteErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Estado para o diálogo de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Estado para controlar linhas expandidas e histórico de compras
  const [expandedRows, setExpandedRows] = useState({});
  const [comprasHistorico, setComprasHistorico] = useState({});
  const [loadingHistorico, setLoadingHistorico] = useState({});
  
  // Estado para o formulário de pagamento
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [pagamentoForm, setPagamentoForm] = useState({
    valor: '',
    forma_pagamento: 'especie',
    observacoes: '',
    recebido_por: ''
  });
  const [pagamentoErrors, setPagamentoErrors] = useState({});
  const [pagamentoSubmitting, setPagamentoSubmitting] = useState(false);
  
  const { hasPermission, user } = useAuth();
  const canEdit = hasPermission(['admin', 'vendedor']);

  // Adicionar estado para controlar quais vendas estão expandidas
  const [expandedVendas, setExpandedVendas] = useState({});

  // Adicionar estado para controlar o carregamento dos itens
  const [loadingItens, setLoadingItens] = useState({});

  // Adicionar estado para controlar o diálogo de pagamentos
  const [pagamentosDialogOpen, setPagamentosDialogOpen] = useState(false);
  const [pagamentosVendaSelecionada, setPagamentosVendaSelecionada] = useState(null);
  const [pagamentos, setPagamentos] = useState([]);
  const [loadingPagamentos, setLoadingPagamentos] = useState(false);

  useEffect(() => {
    fetchClientes();
    
    // Check if we're on the new client route and open dialog automatically
    if (window.location.pathname === '/clientes/novo') {
      handleOpenDialog();
      // Optionally, you can use history to replace the URL without reloading
      // This prevents the dialog from reopening if the user refreshes
      window.history.replaceState({}, '', '/clientes');
    }
  }, []);
  
  // Handle navigation from other components with returnTo state
  useEffect(() => {
    if (location.state?.returnTo) {
      handleOpenDialog();
    }
  }, [location]);

  // Adicionar este useEffect para expandir automaticamente as vendas pendentes
  useEffect(() => {
    // Expandir automaticamente as vendas pendentes para o cliente 1
    if (comprasHistorico[1]?.length > 0) {
      const vendasIds = comprasHistorico[1].map(v => v.id);
      const newExpandedVendas = { ...expandedVendas };
      vendasIds.forEach(id => {
        newExpandedVendas[id] = true;
      });
      setExpandedVendas(newExpandedVendas);
    }
  }, [comprasHistorico]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/clientes');
      setClientes(response.data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast.error('Erro ao buscar clientes');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar clientes com base no termo de busca
  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes;
    
    const term = searchTerm.toLowerCase().trim();
    return clientes.filter(cliente => 
      cliente.nome?.toLowerCase().includes(term) ||
      cliente.whatsapp?.toLowerCase().includes(term) ||
      cliente.instagram?.toLowerCase().includes(term) ||
      cliente.observacoes?.toLowerCase().includes(term)
    );
  }, [clientes, searchTerm]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const openWhatsapp = (numero) => {
    if (!numero) return;
    
    // Remove caracteres não numéricos
    const numeroCleaned = numero.replace(/\D/g, '');
    
    // Formata o número para o padrão do WhatsApp
    const numeroWhatsApp = numeroCleaned.startsWith('55') 
      ? numeroCleaned 
      : `55${numeroCleaned}`;
    
    window.open(`https://wa.me/${numeroWhatsApp}`, '_blank');
  };

  const openInstagram = (usuario) => {
    if (!usuario) return;
    
    // Remove o @ se existir
    const usuarioClean = usuario.startsWith('@') ? usuario.substring(1) : usuario;
    
    window.open(`https://instagram.com/${usuarioClean}`, '_blank');
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  // Função para lidar com a expansão de linhas
  const handleRowExpand = async (clienteId) => {
    // Toggle do estado expandido
    setExpandedRows(prev => ({
      ...prev,
      [clienteId]: !prev[clienteId]
    }));
    
    // Se estiver expandindo e ainda não tiver o histórico, buscar do servidor
    if (!expandedRows[clienteId] && !comprasHistorico[clienteId]) {
      await fetchHistoricoCompras(clienteId);
    }
  };
  
  // Função para buscar histórico de compras de um cliente
  const fetchHistoricoCompras = async (clienteId) => {
    setLoadingHistorico(prev => ({ ...prev, [clienteId]: true }));
    
    try {
      console.log(`Buscando histórico de compras para o cliente ${clienteId}`);
      const response = await api.get(`/clientes/${clienteId}/vendas`);
      console.log('Resposta da API de vendas:', response.data);
      
      // Verificar se a resposta contém dados
      if (!response.data || !Array.isArray(response.data)) {
        console.error('Resposta inválida da API de vendas:', response.data);
        throw new Error('Formato de resposta inválido');
      }
      
      // Definir as vendas sem os itens
      const vendas = response.data.map(venda => ({
        ...venda,
        itens: [] // Inicializar com array vazio
      }));
      
      setComprasHistorico(prev => ({
        ...prev,
        [clienteId]: vendas
      }));
    } catch (error) {
      console.error(`Erro ao buscar histórico de compras do cliente ${clienteId}:`, error);
      toast.error(`Erro ao buscar histórico de compras: ${error.message || 'Erro desconhecido'}`);
      // Garantir que o estado seja atualizado mesmo em caso de erro
      setComprasHistorico(prev => ({
        ...prev,
        [clienteId]: []
      }));
    } finally {
      setLoadingHistorico(prev => ({ ...prev, [clienteId]: false }));
    }
  };

  // Funções para o CRUD de clientes
  const handleOpenDialog = (cliente = null) => {
    if (cliente) {
      setDialogTitle('Editar Cliente');
      setClienteForm({
        id: cliente.id,
        nome: cliente.nome,
        instagram: cliente.instagram || '',
        whatsapp: cliente.whatsapp || '',
        cpf: cliente.cpf || '',
        data_nascimento: cliente.data_nascimento || '',
        endereco: cliente.endereco || '',
        observacoes: cliente.observacoes || ''
      });
    } else {
      setDialogTitle('Novo Cliente');
      setClienteForm({
        id: null,
        nome: '',
        instagram: '',
        whatsapp: '',
        cpf: '',
        data_nascimento: '',
        endereco: '',
        observacoes: ''
      });
    }
    
    setClienteErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleClienteFormChange = (e) => {
    const { name, value } = e.target;
    setClienteForm({
      ...clienteForm,
      [name]: value
    });
    
    // Limpa o erro do campo quando o usuário começa a digitar
    if (clienteErrors[name]) {
      setClienteErrors({
        ...clienteErrors,
        [name]: ''
      });
    }
  };

  const validateClienteForm = () => {
    const errors = {};
    
    if (!clienteForm.nome.trim()) {
      errors.nome = 'Nome é obrigatório';
    }
    
    if (!clienteForm.whatsapp.trim()) {
      errors.whatsapp = 'WhatsApp é obrigatório';
    } else if (clienteForm.whatsapp.includes('_')) {
      errors.whatsapp = 'Número de WhatsApp incompleto';
    }
    
    setClienteErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitClienteForm = async () => {
    if (!validateClienteForm()) return;
    
    setFormSubmitting(true);
    
    try {
      let response;
      if (clienteForm.id) {
        // Editar cliente existente
        response = await api.put(`/clientes/${clienteForm.id}`, clienteForm);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        // Criar novo cliente
        response = await api.post('/clientes', clienteForm);
        toast.success('Cliente cadastrado com sucesso!');
      }
      
      // Atualiza a lista de clientes
      fetchClientes();
      handleCloseDialog();
      
      // Navegar de volta para a página anterior se veio de outra página
      if (location.state?.returnTo) {
        navigate(location.state.returnTo);
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar cliente');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Funções para excluir cliente
  const handleOpenDeleteDialog = (cliente) => {
    setClienteToDelete(cliente);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setClienteToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!clienteToDelete) return;
    
    setDeleteLoading(true);
    
    try {
      await api.delete(`/clientes/${clienteToDelete.id}`);
      toast.success('Cliente excluído com sucesso!');
      fetchClientes();
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      if (error.response?.data?.solution) {
        toast.error(`${error.response.data.message} ${error.response.data.solution}`);
      } else {
        toast.error(error.response?.data?.message || 'Erro ao excluir cliente');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // Função para abrir o diálogo de pagamento
  const handleOpenPagamentoDialog = (venda) => {
    console.log('Abrindo diálogo de pagamento para venda:', venda);
    
    // Garantir que temos o cliente_id
    let vendaComCliente = { ...venda };
    if (!vendaComCliente.cliente_id) {
      // Se não tiver cliente_id, tentar pegar do contexto atual
      const clienteAtual = expandedRows ? Object.keys(expandedRows).find(id => expandedRows[id]) : null;
      if (clienteAtual) {
        vendaComCliente.cliente_id = parseInt(clienteAtual);
      }
    }
    
    setVendaSelecionada(vendaComCliente);
    
    // Inicializar o formulário de pagamento
    setPagamentoForm({
      valor: vendaComCliente.saldo_restante ? parseFloat(vendaComCliente.saldo_restante.toFixed(2)) : 0,
      forma_pagamento: 'especie',
      observacoes: '',
      recebido_por: user?.nome || 'Usuário'
    });
    
    setPagamentoDialogOpen(true);
  };

  // Função para fechar o diálogo de pagamento
  const handleClosePagamentoDialog = () => {
    setPagamentoDialogOpen(false);
    setVendaSelecionada(null);
  };

  // Função para lidar com mudanças no formulário de pagamento
  const handlePagamentoFormChange = (e) => {
    const { name, value } = e.target;
    setPagamentoForm({
      ...pagamentoForm,
      [name]: name === 'valor' ? value.replace(',', '.') : value
    });
    
    // Limpa o erro do campo quando o usuário começa a digitar
    if (pagamentoErrors[name]) {
      setPagamentoErrors({
        ...pagamentoErrors,
        [name]: ''
      });
    }
  };

  // Função para validar o formulário de pagamento
  const validatePagamentoForm = () => {
    const errors = {};
    
    if (!pagamentoForm.valor || isNaN(parseFloat(pagamentoForm.valor)) || parseFloat(pagamentoForm.valor) <= 0) {
      errors.valor = 'Valor deve ser maior que zero';
    } else if (parseFloat(pagamentoForm.valor) > vendaSelecionada.saldo_restante) {
      errors.valor = `Valor não pode ser maior que o saldo restante (${vendaSelecionada.saldo_restante.toFixed(2)})`;
    }
    
    setPagamentoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Função para enviar o formulário de pagamento
  const handleSubmitPagamentoForm = async () => {
    if (!validatePagamentoForm()) return;
    
    console.log('Enviando formulário de pagamento:', pagamentoForm, 'para venda:', vendaSelecionada);
    
    if (!vendaSelecionada?.id) {
      console.error('ID da venda não encontrado');
      toast.error('Erro: ID da venda não encontrado');
      return;
    }
    
    setPagamentoSubmitting(true);
    
    try {
      const payload = {
        valor: parseFloat(pagamentoForm.valor),
        forma_pagamento: pagamentoForm.forma_pagamento,
        observacoes: pagamentoForm.observacoes
      };
      
      console.log(`Enviando POST para /vendas/${vendaSelecionada.id}/pagamentos com payload:`, payload);
      
      const response = await api.post(`/vendas/${vendaSelecionada.id}/pagamentos`, payload);
      
      console.log('Resposta do servidor:', response.data);
      
      toast.success('Pagamento registrado com sucesso!');
      
      // Atualiza o histórico de compras
      if (vendaSelecionada.cliente_id) {
        await fetchHistoricoCompras(vendaSelecionada.cliente_id);
      } else {
        // Se não temos cliente_id, recarregar todos os históricos de compras abertos
        for (const clienteId of Object.keys(expandedRows)) {
          if (expandedRows[clienteId]) {
            await fetchHistoricoCompras(clienteId);
          }
        }
      }
      
      handleClosePagamentoDialog();
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      const mensagemErro = error.response?.data?.message || 'Erro ao registrar pagamento';
      console.error('Mensagem de erro:', mensagemErro);
      toast.error(mensagemErro);
    } finally {
      setPagamentoSubmitting(false);
    }
  };

  // Função para alternar a expansão de uma venda
  const toggleVendaExpansion = (vendaId, clienteId) => {
    const newExpanded = {
      ...expandedVendas,
      [vendaId]: !expandedVendas[vendaId]
    };
    
    setExpandedVendas(newExpanded);
    
    // Se a venda está sendo expandida e não tem itens, buscar os itens
    if (newExpanded[vendaId]) {
      const venda = comprasHistorico[clienteId]?.find(v => v.id === vendaId);
      if (venda && (!venda.itens || venda.itens.length === 0)) {
        fetchItensVenda(vendaId, clienteId);
      }
    }
  };

  // Função para buscar itens de uma venda específica
  const fetchItensVenda = async (vendaId, clienteId) => {
    setLoadingItens(prev => ({ ...prev, [vendaId]: true }));
    
    try {
      console.log(`Buscando itens para a venda ${vendaId}`);
      const itensResponse = await api.get(`/vendas/${vendaId}/itens`);
      console.log(`Itens da venda ${vendaId}:`, itensResponse.data);
      
      // Atualizar a venda com os itens
      setComprasHistorico(prev => {
        const clienteVendas = [...(prev[clienteId] || [])];
        const vendaIndex = clienteVendas.findIndex(v => v.id === vendaId);
        
        if (vendaIndex >= 0) {
          clienteVendas[vendaIndex] = {
            ...clienteVendas[vendaIndex],
            itens: Array.isArray(itensResponse.data) ? itensResponse.data : []
          };
        }
        
        return {
          ...prev,
          [clienteId]: clienteVendas
        };
      });
    } catch (error) {
      console.error(`Erro ao buscar itens da venda ${vendaId}:`, error);
      // Atualizar a venda com um array vazio de itens em caso de erro
      setComprasHistorico(prev => {
        const clienteVendas = [...(prev[clienteId] || [])];
        const vendaIndex = clienteVendas.findIndex(v => v.id === vendaId);
        
        if (vendaIndex >= 0) {
          clienteVendas[vendaIndex] = {
            ...clienteVendas[vendaIndex],
            itens: []
          };
        }
        
        return {
          ...prev,
          [clienteId]: clienteVendas
        };
      });
    } finally {
      setLoadingItens(prev => ({ ...prev, [vendaId]: false }));
    }
  };

  // Função para buscar pagamentos de uma venda
  const fetchPagamentosVenda = async (vendaId) => {
    setLoadingPagamentos(true);
    
    try {
      const response = await api.get(`/vendas/${vendaId}/pagamentos`);
      setPagamentos(response.data.pagamentos || []);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar pagamentos da venda ${vendaId}:`, error);
      toast.error('Erro ao buscar pagamentos da venda');
      setPagamentos([]);
      return null;
    } finally {
      setLoadingPagamentos(false);
    }
  };

  // Função para abrir o diálogo de pagamentos
  const handleOpenPagamentosDialog = async (venda) => {
    setPagamentosVendaSelecionada(venda);
    setPagamentosDialogOpen(true);
    await fetchPagamentosVenda(venda.id);
  };

  // Função para fechar o diálogo de pagamentos
  const handleClosePagamentosDialog = () => {
    setPagamentosDialogOpen(false);
    setPagamentosVendaSelecionada(null);
    setPagamentos([]);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1">Clientes</Typography>
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={fetchClientes}
            sx={{ mr: 2 }}
          >
            Recarregar Dados
          </Button>
        {canEdit && (
          <Button
            variant="contained"
              color="primary"
            startIcon={<AddIcon />}
              onClick={handleOpenDialog}
          >
            Novo Cliente
          </Button>
        )}
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Dados fictícios carregados para demonstração. Foram criados 3 clientes com anotações e 3 vendas pendentes para demonstrar a funcionalidade de pagamentos.
      </Alert>

      <Paper sx={{ p: 2, mb: 3 }}>
            <TextField
          label="Buscar Clientes"
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
              <TableCell padding="checkbox" />
              <TableCell>Nome</TableCell>
              <TableCell>WhatsApp</TableCell>
              <TableCell>Instagram</TableCell>
              <TableCell>Anotações</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress />
                    <Typography variant="body1" sx={{ ml: 2 }}>
                      Carregando clientes...
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredClientes.map((cliente) => (
                <React.Fragment key={cliente.id}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => handleRowExpand(cliente.id)}
                      >
                        {expandedRows[cliente.id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </TableCell>
                  <TableCell>{cliente.nome}</TableCell>
                  <TableCell>
                      {cliente.whatsapp && (
                        <Tooltip title={`WhatsApp: ${formatWhatsApp(cliente.whatsapp)}`}>
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => openWhatsapp(cliente.whatsapp)}
                          >
                            <WhatsAppIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                          {formatWhatsApp(cliente.whatsapp)}
                    </TableCell>
                    <TableCell>
                      {cliente.instagram && (
                        <Tooltip title={`Instagram: ${cliente.instagram}`}>
                            <IconButton 
                              size="small" 
                              color="secondary"
                            onClick={() => window.open(`https://instagram.com/${cliente.instagram.replace('@', '')}`, '_blank')}
                            >
                            <InstagramIcon />
                            </IconButton>
                          </Tooltip>
                      )}
                      {cliente.instagram}
                  </TableCell>
                    <TableCell>{cliente.observacoes || '-'}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {canEdit && (
                      <>
                        <Tooltip title="Editar">
                          <IconButton 
                            color="primary" 
                                onClick={() => handleOpenDialog(cliente)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton 
                            color="error" 
                            onClick={() => handleOpenDeleteDialog(cliente)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                      <Collapse in={expandedRows[cliente.id]} timeout="auto" unmountOnExit>
                        {/* Add ClienteCreditos component */}
                        <ClienteCreditos clienteId={cliente.id} />
                        
                        <TableContainer component={Paper} sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'rgba(144, 202, 249, 0.5)', color: 'text.primary' }}>
                            <Typography variant="h6">Histórico de Compras</Typography>
                            <Box>
                              <Button 
                                variant="outlined" 
                                size="small" 
                                sx={{ mr: 1, color: 'primary.dark', borderColor: 'primary.dark', bgcolor: 'background.paper', '&:hover': { borderColor: 'primary.dark', bgcolor: 'primary.light', color: 'primary.contrastText' } }}
                                onClick={() => {
                                  const vendaIds = comprasHistorico[cliente.id]?.map(v => v.id) || [];
                                  const allExpanded = vendaIds.every(id => expandedVendas[id]);
                                  
                                  if (allExpanded) {
                                    // Colapsar todas
                                    const newExpanded = { ...expandedVendas };
                                    vendaIds.forEach(id => { newExpanded[id] = false; });
                                    setExpandedVendas(newExpanded);
                                  } else {
                                    // Expandir todas
                                    const newExpanded = { ...expandedVendas };
                                    vendaIds.forEach(id => { 
                                      newExpanded[id] = true; 
                                      // Buscar itens para vendas que não têm itens
                                      const venda = comprasHistorico[cliente.id]?.find(v => v.id === id);
                                      if (venda && (!venda.itens || venda.itens.length === 0)) {
                                        fetchItensVenda(id, cliente.id);
                                      }
                                    });
                                    setExpandedVendas(newExpanded);
                                  }
                                }}
                                startIcon={
                                  comprasHistorico[cliente.id]?.length > 0 && 
                                  comprasHistorico[cliente.id].every(v => expandedVendas[v.id]) ? 
                                    <ExpandLessIcon /> : <ExpandMoreIcon />
                                }
                              >
                                {comprasHistorico[cliente.id]?.length > 0 && 
                                 comprasHistorico[cliente.id].every(v => expandedVendas[v.id]) ? 
                                  'Colapsar Todas' : 'Expandir Todas'}
                              </Button>
                              <Button 
                                variant="outlined" 
                                size="small" 
                                startIcon={<RefreshIcon />} 
                                onClick={() => fetchHistoricoCompras(cliente.id)}
                                disabled={loadingHistorico[cliente.id]}
                                sx={{ color: 'primary.dark', borderColor: 'primary.dark', bgcolor: 'background.paper', '&:hover': { borderColor: 'primary.dark', bgcolor: 'primary.light', color: 'primary.contrastText' } }}
                              >
                                {loadingHistorico[cliente.id] ? 'Carregando...' : 'Atualizar'}
                              </Button>
                            </Box>
                          </Box>
                          <Table>
                            <TableBody>
                              {loadingHistorico[cliente.id] ? (
                                <TableRow>
                                  <TableCell colSpan={5} align="center">
                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
                                      <CircularProgress size={24} />
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        Carregando histórico...
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ) : comprasHistorico[cliente.id]?.length > 0 ? (
                                <>
                                  {comprasHistorico[cliente.id].map((venda) => (
                                    <React.Fragment key={venda.id}>
                                      <TableRow 
                                        sx={{
                                          '& > *': { borderBottom: 'unset' },
                                          backgroundColor: 'rgba(144, 202, 249, 0.5)',
                                          '& .MuiTableCell-root': { color: 'text.primary' },
                                          cursor: 'pointer'
                                        }}
                                        onClick={() => toggleVendaExpansion(venda.id, cliente.id)}
                                      >
                                        <TableCell colSpan={5}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                              {expandedVendas[venda.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', ml: 1 }}>
                                                Venda #{venda.id} - {formatDate(venda.data)} - {venda.forma_pagamento ? `Pagamento: ${venda.forma_pagamento.toUpperCase()}` : ''}
                                              </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                              {expandedVendas[venda.id] && (
                                                <Tooltip title="Recarregar Itens">
                                                  <span>
                                                    <IconButton 
                                                      size="small" 
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        fetchItensVenda(venda.id, cliente.id);
                                                      }}
                                                      disabled={loadingItens[venda.id]}
                                                      sx={{ mr: 1, color: 'text.primary' }}
                                                    >
                                                      <RefreshIcon fontSize="small" />
                                                    </IconButton>
                                                  </span>
                                                </Tooltip>
                                              )}
                                              {venda.status === 'pendente' && (
                                                <Tooltip title="Adicionar Pagamento">
                                                  <IconButton 
                                                    size="small" 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleOpenPagamentoDialog({...venda, cliente_id: cliente.id});
                                                    }}
                                                    sx={{ mr: 1, color: 'text.primary' }}
                                                  >
                                                    <AddIcon fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                              )}
                                              <Tooltip title="Ver Pagamentos">
                                                <IconButton 
                                                  size="small" 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenPagamentosDialog({...venda, cliente_id: cliente.id});
                                                  }}
                                                  sx={{ mr: 1, color: 'text.primary' }}
                                                >
                                                  <ReceiptIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                                {new Intl.NumberFormat('pt-BR', {
                                                  style: 'currency',
                                                  currency: 'BRL'
                                                }).format(venda.valor_total || 0)}
                                                {' - '}
                                                {venda.status === 'concluida' ? (
                                                  <span style={{ color: '#4caf50' }}>Concluída</span>
                                                ) : venda.status === 'pendente' ? (
                                                  <span style={{ color: '#ff9800' }}>Pendente</span>
                                                ) : venda.status === 'cancelada' ? (
                                                  <span style={{ color: '#f44336' }}>Cancelada</span>
                                                ) : venda.status || 'Desconhecido'}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </TableCell>
                                      </TableRow>
                                      {expandedVendas[venda.id] && (
                                        <TableRow sx={{ backgroundColor: 'action.hover' }}>
                                          <TableCell colSpan={5} sx={{ padding: 0 }}>
                                            <Table size="small">
                                              <TableHead>
                                                <TableRow>
                                                  <TableCell>Produto</TableCell>
                                                  <TableCell align="right">Quantidade</TableCell>
                                                  <TableCell align="right">Preço Unit.</TableCell>
                                                  <TableCell align="right">Subtotal</TableCell>
                                                </TableRow>
                                              </TableHead>
                                              <TableBody>
                                                {loadingItens[venda.id] ? (
                                                  <TableRow>
                                                    <TableCell colSpan={4} align="center">
                                                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
                                                        <CircularProgress size={20} />
                                                        <Typography variant="body2" sx={{ ml: 1 }}>
                                                          Carregando itens...
                                                        </Typography>
                                                      </Box>
                                                    </TableCell>
                                                  </TableRow>
                                                ) : Array.isArray(venda.itens) && venda.itens.length > 0 ? (
                                                  venda.itens.map((item, index) => (
                                                    <TableRow key={`${venda.id}-item-${index}`}>
                                                      <TableCell>
                                                        {item.produto_nome || 'Produto sem nome'} 
                                                        {item.produto_tamanho ? ` (${item.produto_tamanho})` : ''}
                                                      </TableCell>
                                                      <TableCell align="right">
                                                        {item.quantidade || 0} un.
                                                      </TableCell>
                                                      <TableCell align="right">
                                                        {new Intl.NumberFormat('pt-BR', {
                                                          style: 'currency',
                                                          currency: 'BRL'
                                                        }).format(item.preco_unitario || 0)}
                                                      </TableCell>
                                                      <TableCell align="right">
                                                        <Typography sx={{ fontWeight: 'bold' }}>
                                                          {new Intl.NumberFormat('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL'
                                                          }).format(item.subtotal || (item.preco_unitario * item.quantidade) || 0)}
                                                        </Typography>
                  </TableCell>
                </TableRow>
                                                  ))
                                                ) : (
                                                  <TableRow>
                                                    <TableCell colSpan={4} align="center">
                                                      <Typography variant="body2" color="text.secondary">
                                                        Nenhum item encontrado para esta venda
                                                      </Typography>
                                                    </TableCell>
                                                  </TableRow>
                                                )}
                                              </TableBody>
                                            </Table>
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </React.Fragment>
                                  ))}
                                  <TableRow>
                                    <TableCell colSpan={5} sx={{ borderTop: '2px solid', borderColor: 'primary.main' }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                          Total de Compras: {comprasHistorico[cliente.id].length}
                                        </Typography>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                          Valor Total: {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                          }).format(
                                            comprasHistorico[cliente.id].reduce((acc, venda) => acc + (venda.valor_total || 0), 0)
                                          )}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                </>
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} align="center">
                                    <Box sx={{ py: 2 }}>
                                      <Typography variant="body1" color="text.secondary">
                                        Nenhuma compra encontrada
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo de Pagamento */}
      <Dialog
        open={pagamentoDialogOpen}
        onClose={handleClosePagamentoDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Adicionar Pagamento</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="valor"
                label="Valor do Pagamento"
                type="number"
                fullWidth
                variant="outlined"
                value={pagamentoForm.valor}
                onChange={handlePagamentoFormChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
                error={!!pagamentoErrors.valor}
                helperText={pagamentoErrors.valor}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense">
                <InputLabel id="tipo-pagamento-label">Tipo de Pagamento</InputLabel>
                <Select
                  labelId="tipo-pagamento-label"
                  name="forma_pagamento"
                  value={pagamentoForm.forma_pagamento}
                  onChange={handlePagamentoFormChange}
                  label="Tipo de Pagamento"
                >
                  <MenuItem value="especie">Espécie</MenuItem>
                  <MenuItem value="credito">Crédito</MenuItem>
                  <MenuItem value="debito">Débito</MenuItem>
                  <MenuItem value="pix">PIX</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="observacoes"
                label="Anotações"
                type="text"
                fullWidth
                variant="outlined"
                value={pagamentoForm.observacoes}
                onChange={handlePagamentoFormChange}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="recebido_por"
                label="Recebido por"
                type="text"
                fullWidth
                variant="outlined"
                value={pagamentoForm.recebido_por}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePagamentoDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitPagamentoForm}
            color="primary"
            variant="contained"
            disabled={pagamentoSubmitting}
          >
            {pagamentoSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Pagamentos */}
      <Dialog
        open={pagamentosDialogOpen}
        onClose={handleClosePagamentosDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {pagamentosVendaSelecionada ? (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Pagamentos da Venda #{pagamentosVendaSelecionada.id}
              </Typography>
              <IconButton
                edge="end"
                color="inherit"
                onClick={handleClosePagamentosDialog}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          ) : 'Pagamentos'}
        </DialogTitle>
        <DialogContent>
          {loadingPagamentos ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : pagamentos.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Forma de Pagamento</TableCell>
                    <TableCell>Usuário</TableCell>
                    <TableCell>Observações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagamentos.map((pagamento) => (
                    <TableRow key={pagamento.id}>
                      <TableCell>{formatDate(pagamento.data)}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(pagamento.valor || 0)}
                      </TableCell>
                      <TableCell>
                        {pagamento.forma_pagamento ? pagamento.forma_pagamento.toUpperCase() : '-'}
                      </TableCell>
                      <TableCell>{pagamento.usuario || '-'}</TableCell>
                      <TableCell>{pagamento.observacoes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Total de Pagamentos: {pagamentos.length}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Valor Total Pago: {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(
                            pagamentos.reduce((acc, pagamento) => acc + (pagamento.valor || 0), 0)
                          )}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum pagamento encontrado para esta venda
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePagamentosDialog} color="primary">
            Fechar
          </Button>
          {pagamentosVendaSelecionada && pagamentosVendaSelecionada.status === 'pendente' && (
          <Button 
              onClick={() => {
                handleClosePagamentosDialog();
                handleOpenPagamentoDialog(pagamentosVendaSelecionada);
              }} 
              color="primary" 
            variant="contained"
          >
              Adicionar Pagamento
          </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Diálogo de Cliente */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="nome"
                label="Nome"
                fullWidth
                variant="outlined"
                value={clienteForm.nome}
                onChange={handleClienteFormChange}
                error={!!clienteErrors.nome}
                helperText={clienteErrors.nome}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <InputMask
                mask="(99) 99999-9999"
                value={clienteForm.whatsapp}
                onChange={handleClienteFormChange}
                maskChar="_"
                alwaysShowMask
              >
                {(inputProps) => (
                  <TextField
                    {...inputProps}
                    name="whatsapp"
                    label="WhatsApp"
                    fullWidth
                    variant="outlined"
                    error={!!clienteErrors.whatsapp}
                    helperText={clienteErrors.whatsapp || "Formato: (00) 00000-0000"}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <WhatsAppIcon color="success" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              </InputMask>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="instagram"
                label="Instagram"
                fullWidth
                variant="outlined"
                value={clienteForm.instagram}
                onChange={handleClienteFormChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <InstagramIcon color="secondary" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="cpf"
                label="CPF"
                fullWidth
                variant="outlined"
                value={clienteForm.cpf}
                onChange={handleClienteFormChange}
                placeholder="000.000.000-00"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="data_nascimento"
                label="Data de Nascimento"
                type="date"
                fullWidth
                variant="outlined"
                value={clienteForm.data_nascimento}
                onChange={handleClienteFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="endereco"
                label="Endereço"
                fullWidth
                variant="outlined"
                value={clienteForm.endereco}
                onChange={handleClienteFormChange}
                placeholder="Rua, número, bairro, cidade, estado, CEP"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="observacoes"
                label="Anotações"
                fullWidth
                variant="outlined"
                value={clienteForm.observacoes}
                onChange={handleClienteFormChange}
                multiline
                rows={4}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitClienteForm}
            color="primary"
            variant="contained"
            disabled={formSubmitting}
          >
            {formSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir o cliente {clienteToDelete?.nome}?
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Clientes;

// Função para formatar o número de WhatsApp para exibição
const formatWhatsApp = (numero) => {
  if (!numero) return '';
  
  // Remove caracteres não numéricos
  const numeroCleaned = numero.replace(/\D/g, '');
  
  // Aplica a formatação (XX) XXXXX-XXXX
  if (numeroCleaned.length === 11) {
    return `(${numeroCleaned.substring(0, 2)}) ${numeroCleaned.substring(2, 7)}-${numeroCleaned.substring(7)}`;
  } else if (numeroCleaned.length === 10) {
    return `(${numeroCleaned.substring(0, 2)}) ${numeroCleaned.substring(2, 6)}-${numeroCleaned.substring(6)}`;
  }
  
  return numero; // Retorna o original se não conseguir formatar
};