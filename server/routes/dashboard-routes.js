const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth } = require('../middlewares/auth');

// Função auxiliar para calcular intervalo de datas com base no período
const getDateRange = (periodo) => {
  const now = new Date();
  let startDate;
  switch (periodo) {
    case 'semana':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'mes':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'trimestre':
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case 'ano':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1)); // Default: último mês
  }
  return { start: startDate.toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] };
};

// Rota principal do dashboard
router.get('/', auth, async (req, res) => {
  try {
    const periodo = req.query.periodo || 'mes';
    const { start, end } = getDateRange(periodo);

    // Resumo de vendas no período
    const vendasPeriodo = await db.promiseGet(`
      SELECT 
        COUNT(*) as total_vendas,
        SUM(CASE WHEN status = 'concluida' THEN valor_total ELSE 0 END) as valor_total
      FROM vendas
      WHERE data BETWEEN ? AND ?
    `, [start, end]);

    // Comparação com período anterior
    const prevStart = new Date(start);
    const prevEnd = new Date(end);
    const diffDays = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
    prevStart.setDate(prevStart.getDate() - diffDays);
    prevEnd.setDate(prevEnd.getDate() - diffDays);

    const vendasAnterior = await db.promiseGet(`
      SELECT 
        COUNT(*) as total_vendas,
        SUM(CASE WHEN status = 'concluida' THEN valor_total ELSE 0 END) as valor_total
      FROM vendas
      WHERE data BETWEEN ? AND ?
    `, [prevStart.toISOString().split('T')[0], prevEnd.toISOString().split('T')[0]]);

    const variacaoVendas = vendasAnterior.total_vendas 
      ? ((vendasPeriodo.total_vendas - vendasAnterior.total_vendas) / vendasAnterior.total_vendas) * 100 
      : 0;
    const variacaoValor = vendasAnterior.valor_total 
      ? ((vendasPeriodo.valor_total - vendasAnterior.valor_total) / vendasAnterior.valor_total) * 100 
      : 0;

    // Resumo de estoque
    const estoque = await db.promiseGet(`
      SELECT 
        COUNT(*) as total_produtos,
        SUM(CASE WHEN quantidade <= 5 THEN 1 ELSE 0 END) as estoque_baixo,
        SUM(quantidade * preco) as valor_estoque
      FROM produtos
    `);

    // Gráficos
    const vendasPorDia = await db.promiseAll(`
      SELECT DATE(data) as dia, SUM(valor_total) as valor_total
      FROM vendas
      WHERE status = 'concluida' AND data BETWEEN ? AND ?
      GROUP BY DATE(data)
      ORDER BY dia
    `, [start, end]);

    const produtosMaisVendidos = await db.promiseAll(`
      SELECT p.nome, p.tamanho, SUM(vi.quantidade) as quantidade_vendida
      FROM venda_itens vi
      JOIN produtos p ON vi.produto_id = p.id
      JOIN vendas v ON vi.venda_id = v.id
      WHERE v.status = 'concluida' AND v.data BETWEEN ? AND ?
      GROUP BY p.id, p.nome, p.tamanho
      ORDER BY quantidade_vendida DESC
      LIMIT 10
    `, [start, end]);

    const vendasPorTamanho = await db.promiseAll(`
      SELECT p.tamanho, SUM(vi.quantidade) as quantidade_vendida
      FROM venda_itens vi
      JOIN produtos p ON vi.produto_id = p.id
      JOIN vendas v ON vi.venda_id = v.id
      WHERE v.status = 'concluida' AND v.data BETWEEN ? AND ?
      GROUP BY p.tamanho
      ORDER BY quantidade_vendida DESC
    `, [start, end]);

    // Resposta estruturada para o frontend
    res.json({
      resumo: {
        vendas_periodo: {
          total_vendas: vendasPeriodo.total_vendas || 0,
          valor_total: vendasPeriodo.valor_total || 0,
        },
        comparacao_anterior: {
          vendas: { variacao: variacaoVendas || 0 },
          valor: { variacao: variacaoValor || 0 },
        },
        estoque: {
          total_produtos: estoque.total_produtos || 0,
          estoque_baixo: estoque.estoque_baixo || 0,
          valor_estoque: estoque.valor_estoque || 0,
        },
      },
      graficos: {
        vendas_por_dia: vendasPorDia || [],
        produtos_mais_vendidos: produtosMaisVendidos || [],
        vendas_por_tamanho: vendasPorTamanho || [],
      },
    });
  } catch (error) {
    console.error('Erro ao gerar dashboard:', error);
    res.status(500).json({ message: 'Erro ao gerar dashboard.', error: error.message });
  }
});

// Rota para verificar o status do dashboard
router.get('/status', (req, res) => {
  res.json({ status: 'online', message: 'Serviço de dashboard funcionando corretamente' });
});

module.exports = router;