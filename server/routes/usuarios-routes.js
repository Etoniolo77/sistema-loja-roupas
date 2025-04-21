const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const { auth, admin } = require('../middlewares/auth');

// Obter todos os usuários (apenas admin)
router.get('/', auth, admin, async (req, res) => {
  try {
    const usuarios = await db.promiseAll(
      'SELECT id, nome, login, nivel_acesso, created_at, updated_at FROM usuarios ORDER BY nome'
    );
    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ message: 'Erro ao buscar usuários.' });
  }
});

// Obter um usuário específico (apenas admin)
router.get('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await db.promiseGet(
      'SELECT id, nome, login, nivel_acesso, created_at, updated_at FROM usuarios WHERE id = ?',
      [id]
    );
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    
    res.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ message: 'Erro ao buscar usuário.' });
  }
});

// Criar um novo usuário (apenas admin)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { nome, login, senha, nivel_acesso } = req.body;
    
    // Validações básicas
    if (!nome || !login || !senha || !nivel_acesso) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    
    if (!['admin', 'vendedor', 'estoquista'].includes(nivel_acesso)) {
      return res.status(400).json({ message: 'Nível de acesso inválido.' });
    }
    
    // Verifica se o login já existe
    const usuarioExistente = await db.promiseGet('SELECT id FROM usuarios WHERE login = ?', [login]);
    if (usuarioExistente) {
      return res.status(400).json({ message: 'Este login já está em uso.' });
    }
    
    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    
    // Insere o novo usuário
    const result = await db.promiseRun(
      'INSERT INTO usuarios (nome, login, senha, nivel_acesso) VALUES (?, ?, ?, ?)',
      [nome, login, senhaHash, nivel_acesso]
    );
    
    // Retorna o usuário criado
    const novoUsuario = await db.promiseGet(
      'SELECT id, nome, login, nivel_acesso, created_at, updated_at FROM usuarios WHERE id = ?',
      [result.lastID]
    );
    
    res.status(201).json(novoUsuario);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ message: 'Erro ao criar usuário.' });
  }
});

// Atualizar um usuário (apenas admin)
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, login, senha, nivel_acesso } = req.body;
    
    // Validações básicas
    if (!nome || !login || !nivel_acesso) {
      return res.status(400).json({ message: 'Nome, login e nível de acesso são obrigatórios.' });
    }
    
    if (!['admin', 'vendedor', 'estoquista'].includes(nivel_acesso)) {
      return res.status(400).json({ message: 'Nível de acesso inválido.' });
    }
    
    // Verifica se o usuário existe
    const usuarioExistente = await db.promiseGet('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (!usuarioExistente) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    
    // Verifica se o login já está em uso por outro usuário
    const loginEmUso = await db.promiseGet('SELECT id FROM usuarios WHERE login = ? AND id != ?', [login, id]);
    if (loginEmUso) {
      return res.status(400).json({ message: 'Este login já está em uso.' });
    }
    
    // Atualiza o usuário
    if (senha) {
      // Se a senha foi fornecida, faz o hash e atualiza
      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(senha, salt);
      
      await db.promiseRun(
        'UPDATE usuarios SET nome = ?, login = ?, senha = ?, nivel_acesso = ? WHERE id = ?',
        [nome, login, senhaHash, nivel_acesso, id]
      );
    } else {
      // Se a senha não foi fornecida, mantém a senha atual
      await db.promiseRun(
        'UPDATE usuarios SET nome = ?, login = ?, nivel_acesso = ? WHERE id = ?',
        [nome, login, nivel_acesso, id]
      );
    }
    
    // Retorna o usuário atualizado
    const usuarioAtualizado = await db.promiseGet(
      'SELECT id, nome, login, nivel_acesso, created_at, updated_at FROM usuarios WHERE id = ?',
      [id]
    );
    
    res.json(usuarioAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário.' });
  }
});

// Excluir um usuário (apenas admin)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica se o usuário existe
    const usuarioExistente = await db.promiseGet('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (!usuarioExistente) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    
    // Verifica se o usuário a ser excluído é o último administrador
    if (id === '1') {
      return res.status(400).json({ message: 'Não é possível excluir o usuário administrador padrão.' });
    }
    
    // Exclui o usuário
    await db.promiseRun('DELETE FROM usuarios WHERE id = ?', [id]);
    
    res.json({ message: 'Usuário excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ message: 'Erro ao excluir usuário.' });
  }
});

module.exports = router;