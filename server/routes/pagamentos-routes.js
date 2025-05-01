const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth, vendedor } = require('../middlewares/auth');

// Registrar um novo pagamento
router.post('/', auth, vendedor, async (req, res) => {
  const { venda_id, valor, forma_pagamento, observacoes } = req.body;
  
  try {
    // Inicia uma transação
    await db.promiseRun('BEGIN TRANSACTION');
    
    // Busca informações da venda
    const venda = await db.promiseGet(
      'SELECT valor_total, status FROM vendas WHERE id = ?',
      [venda_id]
    );
    
    if (!venda) {
      await db.promiseRun('ROLLBACK');
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }
    
    // Calcula o total já pago
    const pagamentosResult = await db.promiseGet(
      'SELECT COALESCE(SUM(valor), 0) as total_pago FROM pagamentos WHERE venda_id = ?',
      [venda_id]
    );
    
    const totalPago = pagamentosResult.total_pago + valor;
    
    // Verifica se o valor total dos pagamentos não excede o valor da venda
    if (totalPago > venda.valor_total) {
      await db.promiseRun('ROLLBACK');
      return res.status(400).json({
        message: 'O valor total dos pagamentos excede o valor da venda.'
      });
    }
    
    // Registra o pagamento
    const result = await db.promiseRun(
      `INSERT INTO pagamentos (venda_id, valor, forma_pagamento, usuario_id, observacoes)
       VALUES (?, ?, ?, ?, ?)`,
      [venda_id, valor, forma_pagamento, req.user.id, observacoes]
    );
    
    // Atualiza o status da venda se necessário
    if (totalPago >= venda.valor_total && venda.status === 'pendente') {
      await db.promiseRun(
        'UPDATE vendas SET status = "concluida" WHERE id = ?',
        [venda_id]
      );
    }
    
    await db.promiseRun('COMMIT');
    
    res.status(201).json({
      message: 'Pagamento registrado com sucesso.',
      pagamento_id: result.lastID
    });
  } catch (error) {
    await db.promiseRun('ROLLBACK');
    console.error('Erro ao registrar pagamento:', error);
    res.status(500).json({ message: 'Erro ao registrar pagamento.' });
  }
});

// Obter histórico de pagamentos de uma venda
router.get('/venda/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const pagamentos = await db.promiseAll(
      `SELECT p.*, u.nome as usuario_nome
       FROM pagamentos p
       LEFT JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.venda_id = ?
       ORDER BY p.data DESC`,
      [id]
    );
    
    res.json(pagamentos);
  } catch (error) {
    console.error('Erro ao buscar histórico de pagamentos:', error);
    res.status(500).json({ message: 'Erro ao buscar histórico de pagamentos.' });
  }
});

// Obter resumo de pagamentos de uma venda
router.get('/venda/:id/resumo', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const venda = await db.promiseGet(
      'SELECT valor_total FROM vendas WHERE id = ?',
      [id]
    );
    
    if (!venda) {
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }
    
    const pagamentosResult = await db.promiseGet(
      'SELECT COALESCE(SUM(valor), 0) as total_pago FROM pagamentos WHERE venda_id = ?',
      [id]
    );
    
    const resumo = {
      valor_total: venda.valor_total,
      total_pago: pagamentosResult.total_pago,
      saldo_restante: venda.valor_total - pagamentosResult.total_pago
    };
    
    res.json(resumo);
  } catch (error) {
    console.error('Erro ao buscar resumo de pagamentos:', error);
    res.status(500).json({ message: 'Erro ao buscar resumo de pagamentos.' });
  }
});

module.exports = router;