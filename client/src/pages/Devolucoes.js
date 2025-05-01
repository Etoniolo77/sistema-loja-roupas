import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  Grid,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem as MuiMenuItem,
  Autocomplete
} from '@mui/material';
import { Add as AddIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const Devolucoes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  
  // Estados para a listagem de devoluções
  const [devolucoes, setDevolucoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filtros, setFiltros] = useState({
    cliente: '',
    status: '',
    data_inicio: '',
    data_fim: ''
  });
  
  // Estados para o formulário de nova devolução
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: '',
    venda_id: '',
    motivo: '',
    itens: []
  });
  
  // Estados para seleção de produtos, vendas e clientes
  const [produtos, setProdutos] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [vendas, setVendas] = useState([]);
  const [vendasComProduto, setVendasComProduto] = useState([]);
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [itensDaVenda, setItensDaVenda] = useState([]);
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [loadingVendas, setLoadingVendas] = useState(false);
  const [loadingItens, setLoadingItens] = useState(false);
  const [creditoCliente, setCreditoCliente] = useState(null);
  
  // Verificar se estamos na rota de nova devolução
  useEffect(() => {
    if (location.pathname === '/devolucoes/nova') {
      setShowForm(true);
    } else if (id) {
      // Lógica para carregar detalhes de uma devolução específica
      // Implementar depois
    } else {
      setShowForm(false);
    }
  }, [location, id]);

  // Função para buscar devoluções
  const fetchDevolucoes = async () => {
    try {
      setLoading(true);
      
      // Construir a URL com os parâmetros de filtro
      let url = `/api/devolucoes?page=${page + 1}&limit=${rowsPerPage}`;
      
      if (filtros.cliente) url += `&cliente=${encodeURIComponent(filtros.cliente)}`;
      if (filtros.status) url += `&status=${encodeURIComponent(filtros.status)}`;
      if (filtros.data_inicio) url += `&data_inicio=${encodeURIComponent(filtros.data_inicio)}`;
      if (filtros.data_fim) url += `&data_fim=${encodeURIComponent(filtros.data_fim)}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao buscar devoluções');
      }
      
      const data = await response.json();
      setDevolucoes(data.data);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Erro ao buscar devoluções:', error);
      toast.error('Erro ao buscar devoluções');
    } finally {
      setLoading(false);
    }
  };

  // Função de debounce para limitar chamadas de API
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Função para buscar produtos disponíveis
  const buscarProdutos = async () => {
    try {
      setLoadingVendas(true);
      const response = await api.get('/produtos');
      setProdutos(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao buscar produtos');
      setProdutos([]);
    } finally {
      setLoadingVendas(false);
    }
  };

  // Buscar vendas concluídas
  const buscarVendasConcluidas = async () => {
    try {
      setLoadingVendas(true);
      const response = await api.get('/vendas', {
        params: {
          status: 'concluida'
        }
      });
      setVendasComProduto(response.data.data || []);
    } catch (error) {
      console.error('Erro ao buscar vendas concluídas:', error);
      toast.error('Erro ao buscar vendas concluídas');
      setVendasComProduto([]);
    } finally {
      setLoadingVendas(false);
    }
  };

  // Buscar devoluções quando os filtros mudam
  useEffect(() => {
    fetchDevolucoes();
  }, [page, rowsPerPage, filtros]);

  // Buscar vendas concluídas e produtos quando showForm é true
  useEffect(() => {
    if (showForm) {
      buscarVendasConcluidas();
      buscarProdutos();
    }
  }, [showForm]);
  
  // Filtrar vendas que contêm o produto selecionado
  const filtrarVendasComProduto = async () => {
    if (!produtoSelecionado) return;
    
    try {
      setLoadingVendas(true);
      const response = await api.get(`/vendas`);
      
      if (response.data && response.data.data) {
        // Buscar detalhes de cada venda para verificar se contém o produto
        const vendasFiltradas = [];
        
        for (const venda of response.data.data) {
          if (venda.status === 'concluida') {
            const itensResponse = await api.get(`/vendas/${venda.id}/itens`);
            const itens = itensResponse.data;
            
            // Verificar se a venda contém o produto selecionado
            if (itens.some(item => item.produto_id === produtoSelecionado.id)) {
              vendasFiltradas.push(venda);
            }
          }
        }
        
        setVendasComProduto(vendasFiltradas);
      }
    } catch (error) {
      console.error('Erro ao filtrar vendas por produto:', error);
      toast.error('Erro ao filtrar vendas por produto');
    } finally {
      setLoadingVendas(false);
    }
  };
  
  // Efeito para atualizar vendas quando um produto é selecionado
  useEffect(() => {
    if (produtoSelecionado) {
      filtrarVendasComProduto();
    }
  }, [produtoSelecionado]);
  
  // Buscar clientes quando showForm é true
  useEffect(() => {
    if (showForm) {
      const fetchClientes = async () => {
        try {
          // Usando api em vez de fetch diretamente para manter consistência
          const response = await api.get('/clientes');
          
          if (!response.data) {
            throw new Error('Erro ao buscar clientes');
          }
          
          setClientes(response.data || []);
        } catch (error) {
          console.error('Erro ao buscar clientes:', error);
          toast.error('Erro ao buscar clientes');
          setClientes([]);
        }
      };
      
      fetchClientes();
    }
  }, [showForm]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(0);
  };

  const handleLimparFiltros = () => {
    setFiltros({
      cliente: '',
      status: '',
      data_inicio: '',
      data_fim: ''
    });
    setPage(0);
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'pendente':
        return <Chip label="Pendente" color="warning" size="small" />;
      case 'aprovada':
        return <Chip label="Aprovada" color="success" size="small" />;
      case 'rejeitada':
        return <Chip label="Rejeitada" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
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
  
  // Renderizar o formulário de nova devolução
  const renderForm = () => {
    
    // Quando seleciona uma venda
    const handleVendaChange = (event) => {
      const vendaId = event.target.value;
      setVendaSelecionada(vendaId);
      setFormData(prev => ({ ...prev, venda_id: vendaId, itens: [] }));
      setItensSelecionados([]);
      
      if (vendaId) {
        // Buscar os detalhes da venda para obter o cliente
        const vendaSelecionada = vendasComProduto.find(v => v.id === vendaId);
        if (vendaSelecionada && vendaSelecionada.cliente_id) {
          // Pré-selecionar o cliente da venda para receber o crédito
          setClienteSelecionado(vendaSelecionada.cliente_id);
          setCreditoCliente(vendaSelecionada.cliente_id);
          setFormData(prev => ({ ...prev, cliente_id: vendaSelecionada.cliente_id }));
        }
        
        fetchItensDaVenda(vendaId);
      } else {
        setItensDaVenda([]);
        // Limpar a seleção de cliente quando nenhuma venda é selecionada
        setClienteSelecionado(null);
        setCreditoCliente(null);
        setFormData(prev => ({ ...prev, cliente_id: '' }));
      }
    };
    
    // Buscar itens da venda selecionada
    const fetchItensDaVenda = async (vendaId) => {
      try {
        setLoadingItens(true);
        // Usando api em vez de fetch diretamente para manter consistência
        const response = await api.get(`/vendas/${vendaId}`);
        
        // Verificar se a resposta contém os dados necessários
        if (!response.data) {
          throw new Error('Dados da venda não encontrados');
        }
        
        // Buscar os itens da venda
        const itensResponse = await api.get(`/vendas/${vendaId}/itens`);
        setItensDaVenda(itensResponse.data || []);
        
        // Se a venda tem cliente, seleciona automaticamente
        if (response.data.cliente_id) {
          // Verificar se clientes está carregado
          if (clientes && clientes.length > 0) {
            const cliente = clientes.find(c => c.id === response.data.cliente_id);
            if (cliente) {
              setClienteSelecionado(response.data.cliente_id);
              setCreditoCliente(response.data.cliente_id);
              setFormData(prev => ({ ...prev, cliente_id: response.data.cliente_id }));
            }
          } else {
            // Se os clientes ainda não foram carregados, armazenar o ID do cliente para uso posterior
            setClienteSelecionado(response.data.cliente_id);
            setCreditoCliente(response.data.cliente_id);
            setFormData(prev => ({ ...prev, cliente_id: response.data.cliente_id }));
          }
        }
      } catch (error) {
        console.error('Erro ao buscar itens da venda:', error);
        toast.error('Erro ao buscar itens da venda');
        setItensDaVenda([]);
      } finally {
        setLoadingItens(false);
      }
    };
    
    // Quando seleciona um cliente
    const handleClienteChange = (event) => {
      const clienteId = event.target.value;
      setClienteSelecionado(clienteId);
      setFormData(prev => ({ ...prev, cliente_id: clienteId }));
    };
    
    // Quando muda a quantidade de um item
    const handleQuantidadeChange = (itemId, quantidade) => {
      const item = itensDaVenda.find(i => i.id === itemId);
      
      if (!item) return;
      
      // Validar quantidade
      const qtd = parseInt(quantidade);
      if (isNaN(qtd) || qtd <= 0 || qtd > item.quantidade) return;
      
      // Atualizar itens selecionados
      const itemIndex = itensSelecionados.findIndex(i => i.venda_item_id === itemId);
      
      let newItens = [...itensSelecionados];
      if (itemIndex >= 0) {
        // Atualizar item existente
        newItens[itemIndex].quantidade = qtd;
      } else {
        // Adicionar novo item
        newItens = [...itensSelecionados, {
          venda_item_id: itemId,
          produto_id: item.produto_id,
          quantidade: qtd
        }];
      }
      
      setItensSelecionados(newItens);
      
      // Atualizar formData com os itens atualizados
      setFormData(prev => ({
        ...prev,
        itens: newItens.filter(i => i.quantidade > 0).map(i => ({
          venda_item_id: i.venda_item_id,
          produto_id: item.produto_id,
          quantidade: i.quantidade
        }))
      }));
    };
    
    // Quando muda o motivo
    const handleMotivoChange = (event) => {
      setMotivo(event.target.value);
      setFormData(prev => ({ ...prev, motivo: event.target.value }));
    };
    
    // Enviar formulário
    const handleSubmit = async () => {
      // Validar dados
      if (!formData.venda_id) {
        toast.error('Selecione uma venda');
        return;
      }
      
      if (!formData.cliente_id) {
        toast.error('Selecione um cliente');
        return;
      }
      
      if (!formData.motivo) {
        toast.error('Informe o motivo da devolução');
        return;
      }
      
      if (!formData.itens || formData.itens.length === 0) {
        toast.error('Selecione pelo menos um item para devolução');
        return;
      }
      
      try {
        const response = await fetch('/api/devolucoes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao criar devolução');
        }
        
        const data = await response.json();
        toast.success('Devolução registrada com sucesso!');
        navigate(`/devolucoes/${data.devolucao_id}`);
      } catch (error) {
        console.error('Erro ao criar devolução:', error);
        toast.error(error.message || 'Erro ao criar devolução');
      }
    };
    
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 3 }}>Nova Devolução</Typography>
        
        <Grid container spacing={3}>
          {/* Seleção de Produto */}
          <Grid item xs={12}>
            <Autocomplete
              options={produtos}
              getOptionLabel={(produto) => `${produto.nome} (${produto.tamanho})`}
              value={produtoSelecionado}
              onChange={(event, newValue) => {
                setProdutoSelecionado(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Selecionar Produto"
                  fullWidth
                  variant="outlined"
                />
              )}
              loading={loadingVendas}
              loadingText="Carregando produtos..."
            />
          </Grid>
          
          {/* Seleção de Venda */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Venda</InputLabel>
              <Select
                value={vendaSelecionada || ''}
                onChange={handleVendaChange}
                label="Venda"
                disabled={loadingVendas}
              >
                <MuiMenuItem value="">
                  <em>Selecione uma venda</em>
                </MuiMenuItem>
                {vendasComProduto.map((venda) => (
                  <MuiMenuItem key={venda.id} value={venda.id}>
                    #{venda.id} - {venda.cliente_nome} - {formatarData(venda.data)} - {formatarValor(venda.valor_total)}
                  </MuiMenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Crédito para Cliente */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Cliente para Receber o Crédito</InputLabel>
              <Select
                value={creditoCliente || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setCreditoCliente(value);
                  if (value === 'novo') {
                    navigate('/clientes/novo', { state: { returnTo: '/devolucoes/nova' } });
                  } else {
                    setClienteSelecionado(value);
                    setFormData(prev => ({ ...prev, cliente_id: value }));
                  }
                }}
                label="Cliente para Receber o Crédito"
              >
                <MuiMenuItem value="novo">
                  <em>Criar Novo Cliente</em>
                </MuiMenuItem>
                {clientes && clientes.length > 0 && clientes.map((cliente) => {
                  // Destacar o cliente da venda selecionada
                  const isClienteDaVenda = vendaSelecionada && 
                    vendasComProduto.find(v => v.id === vendaSelecionada)?.cliente_id === cliente.id;
                  
                  return (
                    <MuiMenuItem 
                      key={cliente.id} 
                      value={cliente.id}
                      sx={isClienteDaVenda ? { fontWeight: 'bold', backgroundColor: 'rgba(25, 118, 210, 0.12)' } : {}}
                    >
                      {isClienteDaVenda ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                          <Typography sx={{ fontWeight: 'bold' }}>
                            {cliente.nome} {cliente.whatsapp ? `- ${cliente.whatsapp}` : ''}
                          </Typography>
                          <Chip 
                            size="small" 
                            label="Cliente da venda original" 
                            color="primary" 
                            sx={{ ml: 1, height: 20 }} 
                          />
                        </Box>
                      ) : (
                        `${cliente.nome}${cliente.whatsapp ? ` - ${cliente.whatsapp}` : ''}`
                      )}
                    </MuiMenuItem>
                  );
                })}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 1 }}>
                O cliente da venda original é destacado e selecionado automaticamente, mas você pode escolher outro cliente para receber o crédito.
              </Typography>
            </FormControl>
          </Grid>
          
          {/* Motivo da Devolução */}
          <Grid item xs={12}>
            <TextField
              label="Motivo da Devolução"
              value={motivo}
              onChange={handleMotivoChange}
              fullWidth
              multiline
              rows={2}
              required
            />
          </Grid>
          
          {/* Lista de Itens da Venda */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>Itens para Devolução</Typography>
            
            {loadingItens ? (
              <Typography>Carregando itens...</Typography>
            ) : itensDaVenda && itensDaVenda.length === 0 ? (
              <Typography>Selecione uma venda para ver os itens disponíveis</Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell>Tamanho</TableCell>
                      <TableCell align="right">Preço Unit.</TableCell>
                      <TableCell align="right">Qtd. Comprada</TableCell>
                      <TableCell align="right">Qtd. Devolução</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {itensDaVenda && itensDaVenda.map((item) => {
                      const itemSelecionado = itensSelecionados.find(i => i.venda_item_id === item.id);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{item.produto_nome}</TableCell>
                          <TableCell>{item.produto_tamanho}</TableCell>
                          <TableCell align="right">{formatarValor(item.preco_unitario)}</TableCell>
                          <TableCell align="right">{item.quantidade}</TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              InputProps={{ inputProps: { min: 0, max: item.quantidade } }}
                              value={itemSelecionado ? itemSelecionado.quantidade : ''}
                              onChange={(e) => handleQuantidadeChange(item.id, e.target.value)}
                              sx={{ width: '80px' }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/devolucoes')} 
            sx={{ mr: 1 }}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained"
            onClick={handleSubmit}
            disabled={!vendaSelecionada || !clienteSelecionado || !motivo || itensSelecionados.length === 0 || !itensSelecionados.some(item => item.quantidade > 0)}
          >
            Registrar Devolução
          </Button>
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Devoluções</Typography>
        {!showForm && (user?.nivel_acesso === 'admin' || user?.nivel_acesso === 'vendedor') && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/devolucoes/nova')}
          >
            Nova Devolução
          </Button>
        )}
      </Box>
      
      {showForm ? (
        renderForm()
      ) : (
        <>
          {/* Filtros */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Cliente"
                  name="cliente"
                  value={filtros.cliente}
                  onChange={handleFiltroChange}
                  fullWidth
                  size="small"
                />
              </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={filtros.status}
                label="Status"
                onChange={handleFiltroChange}
              >
                <MuiMenuItem value="">Todos</MuiMenuItem>
                <MuiMenuItem value="pendente">Pendente</MuiMenuItem>
                <MuiMenuItem value="aprovada">Aprovada</MuiMenuItem>
                <MuiMenuItem value="rejeitada">Rejeitada</MuiMenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Data Início"
              name="data_inicio"
              type="date"
              value={filtros.data_inicio}
              onChange={handleFiltroChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Data Fim"
              name="data_fim"
              type="date"
              value={filtros.data_fim}
              onChange={handleFiltroChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={handleLimparFiltros}
              sx={{ mr: 1 }}
            >
              Limpar
            </Button>
            <Button
              variant="contained"
              onClick={() => fetchDevolucoes()}
            >
              Filtrar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabela de Devoluções */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Valor Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Carregando...</TableCell>
              </TableRow>
            ) : devolucoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Nenhuma devolução encontrada</TableCell>
              </TableRow>
            ) : (
              devolucoes.map((devolucao) => (
                <TableRow key={devolucao.id}>
                  <TableCell>{devolucao.id}</TableCell>
                  <TableCell>{formatarData(devolucao.data)}</TableCell>
                  <TableCell>{devolucao.cliente_nome}</TableCell>
                  <TableCell>{formatarValor(devolucao.valor_total)}</TableCell>
                  <TableCell>{getStatusChip(devolucao.status)}</TableCell>
                  <TableCell>
                    <Tooltip title="Ver detalhes">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/devolucoes/${devolucao.id}`)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>
      </>
      )}
    </Box>
  );
};

export default Devolucoes;