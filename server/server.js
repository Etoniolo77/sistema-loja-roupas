const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuração do CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Servir arquivos estáticos do frontend em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Middlewares
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Inicialização do banco de dados
const db = require('./database');
const inicializarBancoDados = require('./utils/init-db');

// Rotas de status e teste
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', message: 'Servidor está funcionando corretamente' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Servidor está online!' });
});

// Importar rotas
const authRoutes = require('./routes/auth-routes');
const usuariosRoutes = require('./routes/usuarios-routes');
const produtosRoutes = require('./routes/produtos-routes');
const clientesRoutes = require('./routes/clientes-routes');
const vendasRoutes = require('./routes/vendas-routes');
const estoqueRoutes = require('./routes/estoque-routes');
const relatoriosRoutes = require('./routes/relatorios-routes');
const dashboardRoutes = require('./routes/dashboard-routes');
const fornecedoresRoutes = require('./routes/fornecedores-routes');
const encomendasRoutes = require('./routes/encomendas-routes');
const devolucoesRoutes = require('./routes/devolucoes-routes');
const inventarioRoutes = require('./routes/inventario-routes');
const configuracoesRoutes = require('./routes/configuracoes-routes');

// Usar rotas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);
app.use('/api/encomendas', encomendasRoutes);
app.use('/api/devolucoes', devolucoesRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/configuracoes', configuracoesRoutes);

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('Erro na aplicação:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Função para iniciar o servidor
const iniciarAplicacao = async () => {
  try {
    console.log('\n=== Iniciando Sistema ===');
    
    // Primeiro inicializa o banco de dados
    await inicializarBancoDados();
    console.log('✓ Banco de dados inicializado com sucesso!');

    // Depois inicia o servidor
    app.listen(PORT, () => {
      console.log('\n=== Servidor Iniciado com Sucesso ===');
      console.log(`✓ Servidor rodando em: http://localhost:${PORT}`);
      console.log('✓ CORS habilitado para: http://localhost:5000');
      console.log('\nPressione CTRL+C para encerrar o servidor\n');
    });
  } catch (error) {
    console.error('\nErro ao iniciar aplicação:', error);
    process.exit(1);
  }
};

// Inicia o servidor
iniciarAplicacao();
