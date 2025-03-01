const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth } = require('../middlewares/auth');

// Relatório de vendas por período
router.get('/vendas/periodo', auth, async (req, res) => {
  try {
    // Parâmetros de filtro
    const data_inicio = req.query.data_inicio;
    const data_fim = req.query.data_fim;
    
    if (!data_inicio || !data_fim) {
      return res.status(400).json({ message: 'Data inicial e final são obrigatórias para o relatório.' });
    }
    
    // Relatório de vendas por período
    const vendas = await db.promiseAll(`
      SELECT v.id, v.data, c.nome as cliente, 
             (SELECT COUNT(*) FROM venda_itens WHERE venda_id = v.id) as total_itens,
             v.valor_total, v.status, u.nome as vendedor
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.data BETWEEN ? AND ?
      ORDER BY v.data DESC
    `, [data_inicio, data_fim]);
    
    // Resumo do período
    const resumo = await db.promiseGet(`
      SELECT 
        COUNT(*) as total_vendas,
        SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as vendas_concluidas,
        SUM(CASE WHEN status = 'cancelada' THEN 1 ELSE 0 END) as vendas_canceladas,
        SUM(CASE WHEN status = 'concluida' THEN valor_total ELSE 0 END) as valor_total,
        (SELECT COUNT(DISTINCT cliente_id) FROM vendas WHERE data BETWEEN ? AND ? AND cliente_id IS NOT NULL) as total_clientes
      FROM vendas
      WHERE data BETWEEN ? AND ?
    `, [data_inicio, data_fim, data_inicio, data_fim]);
    
    res.json({
      vendas,
      resumo
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de vendas por período:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de vendas por período.' });
  }
});

// Relatório de produtos mais vendidos
router.get('/produtos/mais-vendidos', auth, async (req, res) => {
  try {
    // Parâmetros de filtro
    const data_inicio = req.query.data_inicio;
    const data_fim = req.query.data_fim;
    const limit = parseInt(req.query.limit) || 20;
    
    if (!data_inicio || !data_fim) {
      return res.status(400).json({ message: 'Data inicial e final são obrigatórias para o relatório.' });
    }
    
    // Relatório de produtos mais vendidos
    const produtos = await db.promiseAll(`
      SELECT 
        p.id, p.nome, p.tamanho,
        SUM(vi.quantidade) as quantidade_vendida,
        AVG(vi.preco_unitario) as preco_medio,
        SUM(vi.subtotal) as valor_total,
        COUNT(DISTINCT vi.venda_id) as total_vendas
      FROM venda_itens vi
      JOIN produtos p ON vi.produto_id = p.id
      JOIN vendas v ON vi.venda_id = v.id
      WHERE v.status = 'concluida' AND v.data BETWEEN ? AND ?
      GROUP BY p.id, p.nome, p.tamanho
      ORDER BY quantidade_vendida DESC
      LIMIT ?
    `, [data_inicio, data_fim, limit]);
    
    // Resumo do período
    const resumo = await db.promiseGet(`
      SELECT 
        SUM(vi.quantidade) as total_itens_vendidos,
        SUM(vi.subtotal) as valor_total,
        COUNT(DISTINCT v.id) as total_vendas,
        COUNT(DISTINCT p.id) as total_produtos
      FROM venda_itens vi
      JOIN produtos p ON vi.produto_id = p.id
      JOIN vendas v ON vi.venda_id = v.id
      WHERE v.status = 'concluida' AND v.data BETWEEN ? AND ?
    `, [data_inicio, data_fim]);
    
    res.json({
      produtos,
      resumo
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de produtos mais vendidos:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de produtos mais vendidos.' });
  }
});

// Relatório de clientes mais ativos
router.get('/clientes/mais-ativos', auth, async (req, res) => {
  try {
    // Parâmetros de filtro
    const data_inicio = req.query.data_inicio;
    const data_fim = req.query.data_fim;
    const limit = parseInt(req.query.limit) || 20;
    
    if (!data_inicio || !data_fim) {
      return res.status(400).json({ message: 'Data inicial e final são obrigatórias para o relatório.' });
    }
    
    // Relatório de clientes mais ativos
    const clientes = await db.promiseAll(`
      SELECT 
        c.id, c.nome, c.instagram, c.whatsapp,
        COUNT(v.id) as total_compras,
        SUM(v.valor_total) as valor_total,
        AVG(v.valor_total) as ticket_medio,
        MAX(v.data) as ultima_compra
      FROM vendas v
      JOIN clientes c ON v.cliente_id = c.id
      WHERE v.status = 'concluida' AND v.data BETWEEN ? AND ?
      GROUP BY c.id, c.nome, c.instagram, c.whatsapp
      ORDER BY total_compras DESC, valor_total DESC
      LIMIT ?
    `, [data_inicio, data_fim, limit]);
    
    // Resumo do período
    const resumo = await db.promiseGet(`
      SELECT 
        COUNT(DISTINCT c.id) as total_clientes,
        SUM(v.valor_total) as valor_total,
        COUNT(v.id) as total_vendas,
        SUM(v.valor_total) / COUNT(v.id) as ticket_medio_geral
      FROM vendas v
      JOIN clientes c ON v.cliente_id = c.id
      WHERE v.status = 'concluida' AND v.data BETWEEN ? AND ?
    `, [data_inicio, data_fim]);
    
    res.json({
      clientes,
      resumo
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de clientes mais ativos:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de clientes mais ativos.' });
  }
});

// Relatório de estoque
router.get('/estoque', auth, async (req, res) => {
  try {
    // Parâmetro opcional para filtrar apenas produtos com estoque baixo
    const estoque_baixo = req.query.estoque_baixo === 'true';
    const ordenacao = req.query.ordem || 'nome';
    let order;
    
    switch (ordenacao) {
      case 'estoque_asc':
        order = 'p.quantidade ASC';
        break;
      case 'estoque_desc':
        order = 'p.quantidade DESC';
        break;
      case 'valor_asc':
        order = 'valor_estoque ASC';
        break;
      case 'valor_desc':
        order = 'valor_estoque DESC';
        break;
      default:
        order = 'p.nome ASC, p.tamanho ASC';
    }
    
    // Constrói a consulta
    let query = `
      SELECT 
        p.id, p.nome, p.tamanho, p.quantidade,
        p.preco, (p.quantidade * p.preco) as valor_estoque,
        CASE 
          WHEN p.quantidade <= 5 THEN 'baixo'
          WHEN p.quantidade <= 10 THEN 'médio'
          ELSE 'adequado'
        END as nivel_estoque,
        (SELECT SUM(vi.quantidade) FROM venda_itens vi JOIN vendas v ON vi.venda_id = v.id 
         WHERE vi.produto_id = p.id AND v.status = 'concluida' AND v.data >= datetime('now', '-30 days')) 
         as vendas_ultimo_mes
      FROM produtos p
    `;
    
    // Adiciona filtro por estoque baixo se necessário
    if (estoque_baixo) {
      query += ' WHERE p.quantidade <= 5';
    }
    
    // Adiciona ordenação
    query += ` ORDER BY ${order}`;
    
    // Executa a consulta
    const produtos = await db.promiseAll(query);
    
    // Resumo do estoque
    const resumo = await db.promiseGet(`
      SELECT 
        COUNT(*) as total_produtos,
        SUM(CASE WHEN quantidade <= 5 THEN 1 ELSE 0 END) as estoque_baixo,
        SUM(CASE WHEN quantidade > 5 AND quantidade <= 10 THEN 1 ELSE 0 END) as estoque_medio,
        SUM(CASE WHEN quantidade > 10 THEN 1 ELSE 0 END) as estoque_adequado,
        SUM(quantidade) as quantidade_total,
        SUM(quantidade * preco) as valor_estoque_total
      FROM produtos
    `);
    
    res.json({
      produtos,
      resumo
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de estoque:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de estoque.' });
  }
});

// Relatório de movimentações de estoque
router.get('/estoque/movimentacoes', auth, async (req, res) => {
  try {
    // Parâmetros de filtro
    const data_inicio = req.query.data_inicio;
    const data_fim = req.query.data_fim;
    const tipo = req.query.tipo; // 'entrada', 'saida' ou null para ambos
    
    if (!data_inicio || !data_fim) {
      return res.status(400).json({ message: 'Data inicial e final são obrigatórias para o relatório.' });
    }
    
    // Constrói a consulta
    let query = `
      SELECT 
        m.id, m.data, m.quantidade, m.tipo, m.motivo,
        p.id as produto_id, p.nome as produto_nome, p.tamanho as produto_tamanho,
        u.nome as usuario
      FROM estoque_movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.data BETWEEN ? AND ?
    `;
    
    const queryParams = [data_inicio, data_fim];
    
    // Adiciona filtro por tipo se necessário
    if (tipo && ['entrada', 'saida'].includes(tipo)) {
      query += ' AND m.tipo = ?';
      queryParams.push(tipo);
    }
    
    // Adiciona ordenação
    query += ' ORDER BY m.data DESC';
    
    // Executa a consulta
    const movimentacoes = await db.promiseAll(query, queryParams);
    
    // Resumo das movimentações
    const resumo = await db.promiseGet(`
      SELECT 
        COUNT(*) as total_movimentacoes,
        SUM(CASE WHEN tipo = 'entrada' THEN 1 ELSE 0 END) as total_entradas,
        SUM(CASE WHEN tipo = 'saida' THEN 1 ELSE 0 END) as total_saidas,
        SUM(CASE WHEN tipo = 'entrada' THEN quantidade ELSE 0 END) as quantidade_total_entradas,
        SUM(CASE WHEN tipo = 'saida' THEN quantidade ELSE 0 END) as quantidade_total_saidas
      FROM estoque_movimentacoes
      WHERE data BETWEEN ? AND ?
      ${tipo ? ' AND tipo = ?' : ''}
    `, tipo ? [data_inicio, data_fim, tipo] : [data_inicio, data_fim]);
    
    res.json({
      movimentacoes,
      resumo
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de movimentações de estoque:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de movimentações de estoque.' });
  }
});

module.exports = router;
