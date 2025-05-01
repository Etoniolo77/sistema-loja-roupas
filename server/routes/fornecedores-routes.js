const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth, estoquista } = require('../middlewares/auth');

// Obter todos os fornecedores
router.get('/', auth, async (req, res) => {
  try {
    const fornecedores = await db.promiseAll(
      'SELECT id, nome, telefone, referencia, anotacoes, created_at, updated_at FROM fornecedores ORDER BY nome'
    );
    res.json(fornecedores);
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error);
    res.status(500).json({ message: 'Erro ao buscar fornecedores.' });
  }
});

// Obter um fornecedor específico
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const fornecedor = await db.promiseGet(
      'SELECT id, nome, telefone, referencia, anotacoes, created_at, updated_at FROM fornecedores WHERE id = ?',
      [id]
    );
    
    if (!fornecedor) {
      return res.status(404).json({ message: 'Fornecedor não encontrado.' });
    }
    
    res.json(fornecedor);
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error);
    res.status(500).json({ message: 'Erro ao buscar fornecedor.' });
  }
});

// Criar um novo fornecedor
router.post('/', auth, estoquista, async (req, res) => {
  try {
    const { nome, telefone, referencia, anotacoes } = req.body;
    
    // Validações básicas
    if (!nome) {
      return res.status(400).json({ message: 'Nome é obrigatório.' });
    }
    
    // Insere o novo fornecedor
    const result = await db.promiseRun(
      'INSERT INTO fornecedores (nome, telefone, referencia, anotacoes) VALUES (?, ?, ?, ?)',
      [nome, telefone || '', referencia || '', anotacoes || '']
    );
    
    // Retorna o fornecedor criado
    const novoFornecedor = await db.promiseGet(
      'SELECT id, nome, telefone, referencia, anotacoes, created_at, updated_at FROM fornecedores WHERE id = ?',
      [result.lastID]
    );
    
    res.status(201).json(novoFornecedor);
  } catch (error) {
    console.error('Erro ao criar fornecedor:', error);
    res.status(500).json({ message: 'Erro ao criar fornecedor.' });
  }
});

// Atualizar um fornecedor
router.put('/:id', auth, estoquista, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, referencia, anotacoes } = req.body;
    
    // Validações básicas
    if (!nome) {
      return res.status(400).json({ message: 'Nome é obrigatório.' });
    }
    
    // Verifica se o fornecedor existe
    const fornecedorExistente = await db.promiseGet('SELECT id FROM fornecedores WHERE id = ?', [id]);
    if (!fornecedorExistente) {
      return res.status(404).json({ message: 'Fornecedor não encontrado.' });
    }
    
    // Atualiza o fornecedor
    await db.promiseRun(
      'UPDATE fornecedores SET nome = ?, telefone = ?, referencia = ?, anotacoes = ? WHERE id = ?',
      [nome, telefone || '', referencia || '', anotacoes || '', id]
    );
    
    // Retorna o fornecedor atualizado
    const fornecedorAtualizado = await db.promiseGet(
      'SELECT id, nome, telefone, referencia, anotacoes, created_at, updated_at FROM fornecedores WHERE id = ?',
      [id]
    );
    
    res.json(fornecedorAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    res.status(500).json({ message: 'Erro ao atualizar fornecedor.' });
  }
});

// Excluir um fornecedor
router.delete('/:id', auth, estoquista, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica se o fornecedor existe
    const fornecedorExistente = await db.promiseGet('SELECT id FROM fornecedores WHERE id = ?', [id]);
    if (!fornecedorExistente) {
      return res.status(404).json({ message: 'Fornecedor não encontrado.' });
    }
    
    // Verifica se o fornecedor tem produtos associados
    const fornecedorComProdutos = await db.promiseGet('SELECT id FROM produtos WHERE fornecedor_id = ? LIMIT 1', [id]);
    if (fornecedorComProdutos) {
      return res.status(400).json({ 
        message: 'Não é possível excluir o fornecedor pois ele possui produtos associados.',
        solution: 'Você pode remover a associação dos produtos antes de excluir o fornecedor.'
      });
    }
    
    // Exclui o fornecedor
    await db.promiseRun('DELETE FROM fornecedores WHERE id = ?', [id]);
    
    res.json({ message: 'Fornecedor excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir fornecedor:', error);
    res.status(500).json({ message: 'Erro ao excluir fornecedor.' });
  }
});

module.exports = router;