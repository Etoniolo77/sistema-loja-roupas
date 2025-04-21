const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { auth } = require('../middlewares/auth');

router.post('/login', async (req, res) => {
  try {
    console.log('=== Início do processamento de login ===');
    console.log('Dados recebidos:', req.body);
    
    // Aceitar diferentes formatos de credenciais
    const login = req.body.login || req.body.username || req.body.user;
    const senha = req.body.senha || req.body.password;
    
    console.log('Credenciais processadas:', { login, senha: '***' });
    
    if (!login || !senha) {
      console.log('Dados incompletos:', { temLogin: !!login, temSenha: !!senha });
      return res.status(400).json({ 
        message: 'Dados de login incompletos',
        details: 'Login e senha são obrigatórios'
      });
    }
    
    // Verificar credenciais do admin
    if ((login === 'admin' && senha === 'admin123')) {
      console.log('Login bem-sucedido para usuário admin');
      
      const token = jwt.sign(
        { 
          id: 1,
          nome: 'Administrador',
          login: 'admin',
          nivel_acesso: 'admin'
        },
        process.env.JWT_SECRET || 'token_temporario_secreto',
        { expiresIn: '24h' }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso',
        token,
        user: {
          id: 1,
          nome: 'Administrador',
          login: 'admin',
          nivel_acesso: 'admin'
        }
      });
    }
    
    console.log('Credenciais inválidas para:', login);
    return res.status(401).json({ 
      success: false, 
      message: 'Erro ao fazer login. Verifique suas credenciais.',
      details: 'Use admin/admin123 para teste'
    });
    
  } catch (error) {
    console.error('Erro ao processar login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao processar a requisição de login',
      error: error.message
    });
  }
});

// Rota para verificar o token
router.get('/verify-token', auth, (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Token válido',
      user: {
        id: req.usuario.id,
        name: req.usuario.nome,
        username: req.usuario.login,
        role: req.usuario.nivel_acesso
      }
    });
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Token inválido',
      error: error.message
    });
  }
});

module.exports = router;