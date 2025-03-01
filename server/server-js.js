const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Importação das rotas
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const clientesRoutes = require('./routes/clientes');
const produtosRoutes = require('./routes/produtos');
const vendasRoutes = require('./routes/vendas');
const estoqueRoutes = require('./routes/estoque');
const dashboardRoutes = require('./routes/dashboard');
const relatoriosRoutes = require('./routes/relatorios');

// Inicialização do banco de dados
const db = require('./database');

const app = express();

// Configuração dos middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Definição das rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/relatorios', relatoriosRoutes);

// Servir arquivos estáticos do front-end em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Inicialização do servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
