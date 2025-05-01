const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth, vendedor } = require('../middlewares/auth');

// Obter todos os clientes
router.get('/', auth, async (req, res) => {
  try {
    const clientes = await db.promiseAll(
      'SELECT id, nome, instagram, whatsapp, cpf, data_nascimento, endereco, observacoes, created_at, updated_at FROM clientes ORDER BY nome'
    );
    res.json(clientes);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ message: 'Erro ao buscar clientes.' });
  }
});

// Obter um cliente específico
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await db.promiseGet(
      'SELECT id, nome, instagram, whatsapp, cpf, data_nascimento, endereco, observacoes, created_at, updated_at FROM clientes WHERE id = ?',
      [id]
    );
    
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }
    
    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ message: 'Erro ao buscar cliente.' });
  }
});

// Criar um novo cliente
router.post('/', auth, vendedor, async (req, res) => {
  try {
    const { nome, instagram, whatsapp, cpf, data_nascimento, endereco, observacoes } = req.body;
    
    // Validações básicas
    if (!nome || !whatsapp) {
      return res.status(400).json({ message: 'Nome e WhatsApp são obrigatórios.' });
    }
    
    // Insere o novo cliente
    const result = await db.promiseRun(
      'INSERT INTO clientes (nome, instagram, whatsapp, cpf, data_nascimento, endereco, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nome, instagram || '', whatsapp, cpf || '', data_nascimento || '', endereco || '', observacoes || '']
    );
    
    // Retorna o cliente criado
    const novoCliente = await db.promiseGet(
      'SELECT id, nome, instagram, whatsapp, cpf, data_nascimento, endereco, observacoes, created_at, updated_at FROM clientes WHERE id = ?',
      [result.lastID]
    );
    
    res.status(201).json(novoCliente);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ message: 'Erro ao criar cliente.' });
  }
});

// Atualizar um cliente
router.put('/:id', auth, vendedor, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, instagram, whatsapp, cpf, data_nascimento, endereco, observacoes } = req.body;
    
    // Validações básicas
    if (!nome || !whatsapp) {
      return res.status(400).json({ message: 'Nome e WhatsApp são obrigatórios.' });
    }
    
    // Verifica se o cliente existe
    const clienteExistente = await db.promiseGet('SELECT id FROM clientes WHERE id = ?', [id]);
    if (!clienteExistente) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }
    
    // Atualiza o cliente
    await db.promiseRun(
      'UPDATE clientes SET nome = ?, instagram = ?, whatsapp = ?, cpf = ?, data_nascimento = ?, endereco = ?, observacoes = ? WHERE id = ?',
      [nome, instagram || '', whatsapp, cpf || '', data_nascimento || '', endereco || '', observacoes || '', id]
    );
    
    // Retorna o cliente atualizado
    const clienteAtualizado = await db.promiseGet(
      'SELECT id, nome, instagram, whatsapp, cpf, data_nascimento, endereco, observacoes, created_at, updated_at FROM clientes WHERE id = ?',
      [id]
    );
    
    res.json(clienteAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ message: 'Erro ao atualizar cliente.' });
  }
});

// Excluir um cliente
router.delete('/:id', auth, vendedor, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica se o cliente existe
    const clienteExistente = await db.promiseGet('SELECT id FROM clientes WHERE id = ?', [id]);
    if (!clienteExistente) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }
    
    // Verifica se o cliente tem vendas associadas
    const clienteComVendas = await db.promiseGet('SELECT id FROM vendas WHERE cliente_id = ? LIMIT 1', [id]);
    if (clienteComVendas) {
      return res.status(400).json({ 
        message: 'Não é possível excluir o cliente pois ele possui vendas registradas.',
        solution: 'Você pode remover as referências do cliente nas vendas antes de excluí-lo.'
      });
    }
    
    // Exclui o cliente
    await db.promiseRun('DELETE FROM clientes WHERE id = ?', [id]);
    
    res.json({ message: 'Cliente excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ message: 'Erro ao excluir cliente.' });
  }
});

// Obter vendas de um cliente
router.get('/:id/vendas', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Buscando vendas para o cliente ${id}`);
    
    // Verifica se o cliente existe
    const cliente = await db.promiseGet('SELECT id, nome FROM clientes WHERE id = ?', [id]);
    if (!cliente) {
      console.warn(`Cliente ${id} não encontrado`);
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }
    
    // Busca as vendas do cliente com informações do vendedor
    const vendas = await db.promiseAll(`
      SELECT 
        v.id, 
        v.data, 
        v.valor_total, 
        v.status,
        v.forma_pagamento,
        u.nome as vendedor,
        (SELECT COUNT(*) FROM venda_itens WHERE venda_id = v.id) as total_itens
      FROM vendas v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.cliente_id = ?
      ORDER BY v.data DESC
    `, [id]);
    
    console.log(`Encontradas ${vendas.length} vendas para o cliente ${id}`);
    
    res.json(vendas);
  } catch (error) {
    console.error(`Erro ao buscar vendas do cliente ${req.params.id}:`, error);
    res.status(500).json({ message: 'Erro ao buscar vendas do cliente.' });
  }
});

router.get('/pendentes', async (req, res) => {
  try {
    const query = `
      SELECT c.id, c.nome, SUM(p.valor) AS valorPendente, MAX(p.data_vencimento) AS dataVencimento
      FROM clientes c
      JOIN pagamentos p ON c.id = p.cliente_id
      WHERE p.status = 'pendente'
      GROUP BY c.id, c.nome
      HAVING SUM(p.valor) > 0
    `;
    const [result] = await db.query(query);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar clientes pendentes:', error);
    res.status(500).json({ message: 'Erro ao buscar clientes pendentes' });
  }
});

module.exports = router;