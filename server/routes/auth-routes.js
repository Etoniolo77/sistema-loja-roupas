const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { auth } = require('../middlewares/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_jwt';

// Rota de login
router.post('/login', async (req, res) => {
  try {
    const { login, senha } = req.body;
    
    // Verifica se o login e a senha foram fornecidos
    if (!login || !senha) {
      return res.status(400).json({ message: 'Login e senha são obrigatórios.' });
    }
    
    // Busca o usuário no banco de dados
    const usuario = await db.promiseGet(
      'SELECT id, nome, login, senha, nivel_acesso FROM usuarios WHERE login = ?',
      [login]
    );
    
    // Verifica se o usuário existe
    if (!usuario) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }
    
    // Verifica se a senha está correta
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }
    
    // Cria o token JWT
    const token = jwt.sign(
      { id: usuario.id, nivel_acesso: usuario.nivel_acesso },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    
    // Retorna o token e as informações do usuário
    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        login: usuario.login,
        nivel_acesso: usuario.nivel_acesso
      }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro ao fazer login.' });
  }
});

// Rota para verificar o token e obter informações do usuário atual
router.get('/me', auth, (req, res) => {
  res.json({
    usuario: {
      id: req.usuario.id,
      nome: req.usuario.nome,
      login: req.usuario.login,
      nivel_acesso: req.usuario.nivel_acesso
    }
  });
});

module.exports = router;
