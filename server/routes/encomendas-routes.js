const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth, vendedor } = require('../middlewares/auth');

// Obter todas as encomendas
router.get('/', auth, async (req, res) => {
  try {
    const encomendas = await db.promiseAll(`
      SELECT e.id, e.cliente_id, c.nome as cliente_nome, e.tamanho, e.observacao, 
             e.atendida, e.created_at, e.updated_at
      FROM encomendas e
      LEFT JOIN clientes c ON e.cliente_id = c.id
      ORDER BY e.created_at DESC
    `);
    res.json(encomendas);
  } catch (error) {
    console.error('Erro ao buscar encomendas:', error);
    res.status(500).json({ message: 'Erro ao buscar encomendas.' });
  }
});

// Obter uma encomenda específica
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const encomenda = await db.promiseGet(`
      SELECT e.id, e.cliente_id, c.nome as cliente_nome, e.tamanho, e.observacao, 
             e.atendida, e.created_at, e.updated_at
      FROM encomendas e
      LEFT JOIN clientes c ON e.cliente_id = c.id
      WHERE e.id = ?
    `, [id]);
    
    if (!encomenda) {
      return res.status(404).json({ message: 'Encomenda não encontrada.' });
    }
    
    res.json(encomenda);
  } catch (error) {
    console.error('Erro ao buscar encomenda:', error);
    res.status(500).json({ message: 'Erro ao buscar encomenda.' });
  }
});

// Criar uma nova encomenda
router.post('/', auth, vendedor, async (req, res) => {
  try {
    const { cliente_id, tamanho, observacao, atendida } = req.body;
    
    // Validações básicas
    if (!cliente_id || !tamanho) {
      return res.status(400).json({ message: 'Cliente e tamanho são obrigatórios.' });
    }
    
    // Valida o tamanho
    if (!['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'].includes(tamanho)) {
      return res.status(400).json({ message: 'Tamanho inválido. Valores permitidos: PP, P, M, G, GG, XG, XXG' });
    }
    
    // Verifica se o cliente existe
    const clienteExistente = await db.promiseGet('SELECT id FROM clientes WHERE id = ?', [cliente_id]);
    if (!clienteExistente) {
      return res.status(400).json({ message: 'Cliente não encontrado.' });
    }
    
    // Insere a nova encomenda
    const result = await db.promiseRun(
      'INSERT INTO encomendas (cliente_id, tamanho, observacao, atendida) VALUES (?, ?, ?, ?)',
      [cliente_id, tamanho, observacao || '', atendida ? 1 : 0]
    );
    
    // Retorna a encomenda criada
    const novaEncomenda = await db.promiseGet(`
      SELECT e.id, e.cliente_id, c.nome as cliente_nome, e.tamanho, e.observacao, 
             e.atendida, e.created_at, e.updated_at
      FROM encomendas e
      LEFT JOIN clientes c ON e.cliente_id = c.id
      WHERE e.id = ?
    `, [result.lastID]);
    
    res.status(201).json(novaEncomenda);
  } catch (error) {
    console.error('Erro ao criar encomenda:', error);
    res.status(500).json({ message: 'Erro ao criar encomenda.' });
  }
});

// Atualizar uma encomenda
router.put('/:id', auth, vendedor, async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_id, tamanho, observacao, atendida } = req.body;
    
    // Validações básicas
    if (!cliente_id || !tamanho) {
      return res.status(400).json({ message: 'Cliente e tamanho são obrigatórios.' });
    }
    
    // Valida o tamanho
    if (!['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'].includes(tamanho)) {
      return res.status(400).json({ message: 'Tamanho inválido. Valores permitidos: PP, P, M, G, GG, XG, XXG' });
    }
    
    // Verifica se a encomenda existe
    const encomendaExistente = await db.promiseGet('SELECT id FROM encomendas WHERE id = ?', [id]);
    if (!encomendaExistente) {
      return res.status(404).json({ message: 'Encomenda não encontrada.' });
    }
    
    // Verifica se o cliente existe
    const clienteExistente = await db.promiseGet('SELECT id FROM clientes WHERE id = ?', [cliente_id]);
    if (!clienteExistente) {
      return res.status(400).json({ message: 'Cliente não encontrado.' });
    }
    
    // Atualiza a encomenda
    await db.promiseRun(
      'UPDATE encomendas SET cliente_id = ?, tamanho = ?, observacao = ?, atendida = ? WHERE id = ?',
      [cliente_id, tamanho, observacao || '', atendida ? 1 : 0, id]
    );
    
    // Retorna a encomenda atualizada
    const encomendaAtualizada = await db.promiseGet(`
      SELECT e.id, e.cliente_id, c.nome as cliente_nome, e.tamanho, e.observacao, 
             e.atendida, e.created_at, e.updated_at
      FROM encomendas e
      LEFT JOIN clientes c ON e.cliente_id = c.id
      WHERE e.id = ?
    `, [id]);
    
    res.json(encomendaAtualizada);
  } catch (error) {
    console.error('Erro ao atualizar encomenda:', error);
    res.status(500).json({ message: 'Erro ao atualizar encomenda.' });
  }
});

// Excluir uma encomenda
router.delete('/:id', auth, vendedor, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica se a encomenda existe
    const encomendaExistente = await db.promiseGet('SELECT id FROM encomendas WHERE id = ?', [id]);
    if (!encomendaExistente) {
      return res.status(404).json({ message: 'Encomenda não encontrada.' });
    }
    
    // Exclui a encomenda
    await db.promiseRun('DELETE FROM encomendas WHERE id = ?', [id]);
    
    res.json({ message: 'Encomenda excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir encomenda:', error);
    res.status(500).json({ message: 'Erro ao excluir encomenda.' });
  }
});

module.exports = router;