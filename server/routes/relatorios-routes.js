const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth } = require('../middlewares/auth');

// Relatório de vendas por vendedor
router.get('/vendas/vendedor', auth, async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    
    if (!data_inicio || !data_fim) {
      return res.status(400).json({ message: 'Data inicial e final são obrigatórias para o relatório.' });
    }

    // Validação do formato das datas
    const dataInicioValida = !isNaN(Date.parse(data_inicio));
    const dataFimValida = !isNaN(Date.parse(data_fim));
    
    if (!dataInicioValida || !dataFimValida) {
      return res.status(400).json({ message: 'Formato de data inválido. Use o formato YYYY-MM-DD.' });
    }
    
    // Garante que a data inicial não é posterior à data final
    if (new Date(data_inicio) > new Date(data_fim)) {
      return res.status(400).json({ message: 'A data inicial não pode ser posterior à data final.' });
    }
    
    const vendas = await db.promiseAll(`
      SELECT 
        u.id as vendedor_id,
        u.nome as vendedor_nome,
        COUNT(v.id) as total_vendas,
        SUM(v.valor_total) as valor_total,
        AVG(v.valor_total) as ticket_medio
      FROM vendas v
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.status = 'concluida' AND v.data BETWEEN ? AND ?
      GROUP BY u.id, u.nome
      ORDER BY valor_total DESC
    `, [data_inicio, data_fim]);
    
    res.json({
      vendas,
      resumo: {
        total_vendedores: vendas.length,
        total_vendas: vendas.reduce((acc, curr) => acc + curr.total_vendas, 0),
        valor_total: vendas.reduce((acc, curr) => acc + curr.valor_total, 0)
      }
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de vendas por vendedor:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de vendas por vendedor.' });
  }
});

// Relatório de estoque
router.get('/estoque', auth, async (req, res) => {
  try {
    const produtos = await db.promiseAll(`
      SELECT 
        p.id,
        p.nome,
        p.tamanho,
        p.quantidade as estoque_atual,
        p.preco_custo,
        p.preco_venda,
        CASE 
          WHEN p.quantidade <= 0 THEN 'sem_estoque'
          WHEN p.quantidade < p.estoque_minimo THEN 'baixo'
          ELSE 'normal'
        END as status_estoque
      FROM produtos p
      ORDER BY p.quantidade ASC
    `);
    
    const resumo = await db.promiseGet(`
      SELECT 
        COUNT(*) as total_produtos,
        SUM(quantidade) as total_itens,
        COUNT(CASE WHEN quantidade <= 0 THEN 1 END) as sem_estoque,
        COUNT(CASE WHEN quantidade < estoque_minimo AND quantidade > 0 THEN 1 END) as estoque_baixo,
        SUM(preco_custo * quantidade) as valor_total_custo,
        SUM(preco_venda * quantidade) as valor_total_venda
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

// Relatório de encomendas por período
router.get('/encomendas/periodo', auth, async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    
    if (!data_inicio || !data_fim) {
      return res.status(400).json({ message: 'Data inicial e final são obrigatórias para o relatório.' });
    }

    // Validação do formato das datas
    const dataInicioValida = !isNaN(Date.parse(data_inicio));
    const dataFimValida = !isNaN(Date.parse(data_fim));
    
    if (!dataInicioValida || !dataFimValida) {
      return res.status(400).json({ message: 'Formato de data inválido. Use o formato YYYY-MM-DD.' });
    }
    
    // Garante que a data inicial não é posterior à data final
    if (new Date(data_inicio) > new Date(data_fim)) {
      return res.status(400).json({ message: 'A data inicial não pode ser posterior à data final.' });
    }
    
    const encomendas = await db.promiseAll(`
      SELECT 
        e.id,
        e.cliente_id,
        c.nome as cliente_nome,
        e.tamanho,
        e.observacao,
        e.atendida,
        e.created_at,
        e.updated_at
      FROM encomendas e
      JOIN clientes c ON e.cliente_id = c.id
      WHERE e.created_at BETWEEN ? AND ?
      ORDER BY e.created_at DESC
    `, [data_inicio, data_fim]);
    
    const resumo = await db.promiseGet(`
      SELECT 
        COUNT(*) as total_encomendas,
        COUNT(CASE WHEN atendida = 1 THEN 1 END) as atendidas,
        COUNT(CASE WHEN atendida = 0 THEN 1 END) as pendentes,
        COUNT(DISTINCT cliente_id) as total_clientes
      FROM encomendas
      WHERE created_at BETWEEN ? AND ?
    `, [data_inicio, data_fim]);
    
    res.json({
      encomendas,
      resumo
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de encomendas:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de encomendas.' });
  }
});

// Relatório de créditos e débitos dos clientes
router.get('/clientes/creditos-debitos', auth, async (req, res) => {
  try {
    const clientes = await db.promiseAll(`
      WITH creditos_debitos AS (
        -- Vendas a crediário
        SELECT 
          v.cliente_id,
          v.valor_total as valor_debito,
          0 as valor_credito
        FROM vendas v
        WHERE v.forma_pagamento = 'crediario' AND v.status = 'concluida'
        
        UNION ALL
        
        -- Pagamentos de crediário
        SELECT 
          v.cliente_id,
          0 as valor_debito,
          p.valor as valor_credito
        FROM pagamentos p
        JOIN vendas v ON p.venda_id = v.id
        WHERE v.forma_pagamento = 'crediario' AND v.status = 'concluida'
      )
      SELECT 
        c.id,
        c.nome,
        c.whatsapp,
        COALESCE(SUM(cd.valor_credito), 0) as total_creditos,
        COALESCE(SUM(cd.valor_debito), 0) as total_debitos,
        COALESCE(SUM(cd.valor_credito - cd.valor_debito), 0) as saldo
      FROM clientes c
      LEFT JOIN creditos_debitos cd ON c.id = cd.cliente_id
      GROUP BY c.id, c.nome, c.whatsapp
      HAVING saldo != 0
      ORDER BY saldo ASC
    `);
    
    const resumo = await db.promiseGet(`
      WITH creditos_debitos AS (
        -- Vendas a crediário
        SELECT 
          v.cliente_id,
          v.valor_total as valor_debito,
          0 as valor_credito
        FROM vendas v
        WHERE v.forma_pagamento = 'crediario' AND v.status = 'concluida'
        
        UNION ALL
        
        -- Pagamentos de crediário
        SELECT 
          v.cliente_id,
          0 as valor_debito,
          p.valor as valor_credito
        FROM pagamentos p
        JOIN vendas v ON p.venda_id = v.id
        WHERE v.forma_pagamento = 'crediario' AND v.status = 'concluida'
      )
      SELECT 
        COUNT(DISTINCT c.id) as total_clientes,
        COALESCE(SUM(cd.valor_credito), 0) as total_creditos,
        COALESCE(SUM(cd.valor_debito), 0) as total_debitos,
        COALESCE(SUM(cd.valor_credito - cd.valor_debito), 0) as saldo_geral
      FROM clientes c
      LEFT JOIN creditos_debitos cd ON c.id = cd.cliente_id
    `);

    
    res.json({
      clientes,
      resumo
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de créditos e débitos:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de créditos e débitos.' });
  }
});

// Relatório de débitos diários
router.get('/clientes/debitos-diarios', auth, async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    
    if (!data_inicio || !data_fim) {
      return res.status(400).json({ message: 'Data inicial e final são obrigatórias para o relatório.' });
    }

    // Validação do formato das datas
    const dataInicioValida = !isNaN(Date.parse(data_inicio));
    const dataFimValida = !isNaN(Date.parse(data_fim));
    
    if (!dataInicioValida || !dataFimValida) {
      return res.status(400).json({ message: 'Formato de data inválido. Use o formato YYYY-MM-DD.' });
    }
    
    // Garante que a data inicial não é posterior à data final
    if (new Date(data_inicio) > new Date(data_fim)) {
      return res.status(400).json({ message: 'A data inicial não pode ser posterior à data final.' });
    }

    const debitos = await db.promiseAll(`
      WITH pagamentos_por_venda AS (
        SELECT venda_id, COALESCE(SUM(CASE WHEN valor IS NOT NULL THEN valor ELSE 0 END), 0) as total_pago
        FROM pagamentos
        WHERE valor > 0
        GROUP BY venda_id
      )
      SELECT 
        v.id as venda_id,
        v.data as data,
        c.nome as cliente_nome,
        v.valor_total as valor_total,
        COALESCE(ppv.total_pago, 0) as valor_pago,
        v.valor_total - COALESCE(ppv.total_pago, 0) as valor,
        v.observacoes as descricao,
        v.forma_pagamento,
        v.status
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN pagamentos_por_venda ppv ON v.id = ppv.venda_id
      WHERE (v.status = 'pendente' OR v.valor_total > COALESCE(ppv.total_pago, 0))
        AND v.data BETWEEN ? AND ?
      HAVING valor > 0
      ORDER BY v.data DESC
    `, [data_inicio, data_fim]);

    const resumo = await db.promiseGet(`
      WITH pagamentos_por_venda AS (
        SELECT venda_id, COALESCE(SUM(CASE WHEN valor IS NOT NULL THEN valor ELSE 0 END), 0) as total_pago
        FROM pagamentos
        WHERE valor > 0
        GROUP BY venda_id
      )
      SELECT 
        COUNT(DISTINCT v.id) as total_debitos,
        SUM(v.valor_total - COALESCE(ppv.total_pago, 0)) as valor_total,
        COUNT(DISTINCT c.id) as total_clientes
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN pagamentos_por_venda ppv ON v.id = ppv.venda_id
      WHERE (v.status = 'pendente' OR v.valor_total > COALESCE(ppv.total_pago, 0))
        AND v.data BETWEEN ? AND ?
      HAVING valor_total > 0
        AND v.valor_total > COALESCE(ppv.total_pago, 0)
    `, [data_inicio, data_fim]);

    res.json({
      debitos,
      resumo
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de débitos diários:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de débitos diários.' });
  }
});

module.exports = router;
