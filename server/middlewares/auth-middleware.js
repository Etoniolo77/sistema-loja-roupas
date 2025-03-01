const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_jwt';

// Middleware para verificar o token JWT
exports.auth = async (req, res, next) => {
  try {
    // Pega o token do header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }
    
    // Verifica o token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verifica se o usuário existe no banco de dados
    const usuario = await db.promiseGet(
      'SELECT id, nome, login, nivel_acesso FROM usuarios WHERE id = ?',
      [decoded.id]
    );
    
    if (!usuario) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }
    
    // Adiciona o usuário ao objeto de requisição
    req.usuario = usuario;
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido.' });
  }
};

// Middleware para verificar permissões de administrador
exports.admin = (req, res, next) => {
  if (req.usuario.nivel_acesso !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
  }
  next();
};

// Middleware para verificar permissões de vendedor
exports.vendedor = (req, res, next) => {
  if (req.usuario.nivel_acesso !== 'admin' && req.usuario.nivel_acesso !== 'vendedor') {
    return res.status(403).json({ message: 'Acesso negado. Permissão de vendedor necessária.' });
  }
  next();
};

// Middleware para verificar permissões de estoquista
exports.estoquista = (req, res, next) => {
  if (req.usuario.nivel_acesso !== 'admin' && req.usuario.nivel_acesso !== 'estoquista') {
    return res.status(403).json({ message: 'Acesso negado. Permissão de estoquista necessária.' });
  }
  next();
};
