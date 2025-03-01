const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth } = require('../middlewares/auth');

// Obter dados para o dashboard
router.get('/', auth, async (req, res) => {
  try {
    // Período de análise (padrão: último mês)
    const periodoParam = req.query.periodo || 'mes';
    let periodoSQL;
    
    switch (periodoParam) {
      case 'semana':
        periodoSQL = "datetime('now', '-7 days')";
        break;
      case 'mes':
        periodoSQL = "datetime('now', '-30 days')";
        break;
      case 'trimestre':
        periodoSQL = "datetime('now', '-90 days')";
        break;
      case 'ano':
        periodoSQL = "datetime('now', '-365 days')";
        break;
      default:
        periodoSQL = "datetime('now', '-30 days')";
    }
    
    // 1. Total de vendas e valor no período
    const vendasPeriodo = await db.promiseGet(`
      SELECT COUNT(*) as total_vendas, 
             SUM(valor_total) as valor_total
      FROM vendas 
      WHERE status = 'concluida' AND data >= ${periodoSQL}
    `);
    
    // 2. Comparação com período anterior
    const periodoAnteriorSQL = periodoParam === 'semana' 
      ? "datetime('now', '-14 days') AND datetime('now', '-7 days')"
      : periodoParam === 'mes'
        ? "datetime('now', '-60 days') AND datetime('now', '-30 days')"
        : periodoParam === 'trimestre'
          ? "datetime('now', '-180 days') AND datetime('now', '-90 days')"
          : "datetime('now', '-730 days') AND datetime('now', '-365 days')";
    
    const vendasPeriodoAnterior = await db.promiseGet(`
      SELECT COUNT(*) as total_vendas, 
             SUM(valor_total) as valor_total
      FROM vendas 
      WHERE status = 'concluida' AND data BETWEEN ${periodoAnteriorSQL}
    `);
    
    // 3. Vendas por dia (para gráfico de linha)
    const vendasPorDia = await db.promiseAll(`
      SELECT date(data) as dia, 
             COUNT(*) as total_vendas, 
             SUM(valor_total) as valor_total
      FROM vendas 
      WHERE status = 'concluida' AND data >= ${periodoSQL}
      GROUP BY date(data)
      ORDER BY date(data)
    `);
    
    // 4. Produtos mais vendidos
    const produtosMaisVendidos = await db.promiseAll(`
      SELECT p.id, p.nome, p.tamanho, 
             SUM(vi.quantidade) as quantidade_vendida,
             SUM(vi.subtotal) as valor_total
      FROM venda_itens vi
      JOIN produtos p ON vi.produto_id = p.id
      JOIN vendas v ON vi.venda_id = v.id
      WHERE v.status = 'concluida' AND v.data >= ${periodoSQL}
      GROUP BY p.id, p.nome, p.tamanho
      ORDER BY quantidade_vendida DESC
      LIMIT 10
    `);
    
    // 5. Clientes com mais compras
    const clientesMaisCompras = await db.promiseAll(`
      SELECT c.id, c.nome,
             COUNT(v.id) as total_compras,
             SUM(v.valor_total) as valor_total
      FROM vendas v
      JOIN clientes c ON v.cliente_id = c.id
      WHERE v.status = 'concluida' AND v.data >= ${periodoSQL}
      GROUP BY c.id, c.nome
      ORDER BY total_compras DESC
      LIMIT 5
    `);
    
    // 6. Status do estoque
    const statusEstoque = await db.promiseGet(`
      SELECT 
        COUNT(*) as total_produtos,
        SUM(CASE WHEN quantidade <= 5 THEN 1 ELSE 0 END) as estoque_baixo,
        SUM(CASE WHEN quantidade > 5 AND quantidade <= 10 THEN 1 ELSE 0 END) as estoque_medio,
        SUM(CASE WHEN quantidade > 10 THEN 1 ELSE 0 END) as estoque_adequado,
        SUM(quantidade) as quantidade_total,
        SUM(quantidade * preco) as valor_estoque
      FROM produtos
    `);
    
    // 7. Resumo de vendas por tamanho
    const vendasPorTamanho = await db.promiseAll(`
      SELECT p.tamanho,
             SUM(vi.quantidade) as quantidade_vendida,
             SUM(vi.subtotal) as valor_total
      FROM venda_itens vi
      JOIN produtos p ON vi.produto_id = p.id
      JOIN vendas v ON vi.venda_id = v.id
      WHERE v.status = 'concluida' AND v.data >= ${periodoSQL}
      GROUP BY p.tamanho
      ORDER BY quantidade_vendida DESC
    `);
    
    // Organiza e retorna todos os dados
    res.json({
      resumo: {
        vendas_periodo: vendasPeriodo,
        comparacao_anterior: {
          vendas: {
            atual: vendasPeriodo.total_vendas || 0,
            anterior: vendasPeriodoAnterior.total_vendas || 0,
            variacao: vendasPeriodoAnterior.total_vendas 
              ? ((vendasPeriodo.total_vendas - vendasPeriodoAnterior.total_vendas) / vendasPeriodoAnterior.total_vendas * 100).toFixed(2)
              : 100
          },
          valor: {
            atual: vendasPeriodo.valor_total || 0,
            anterior: vendasPeriodoAnterior.valor_total || 0,
            variacao: vendasPeriodoAnterior.valor_total 
              ? ((vendasPeriodo.valor_total - vendasPeriodoAnterior.valor_total) / vendasPeriodoAnterior.valor_total * 100).toFixed(2)
              : 100
          }
        },
        estoque: statusEstoque
      },
      graficos: {
        vendas_por_dia: vendasPorDia,
        produtos_mais_vendidos: produtosMaisVendidos,
        clientes_mais_compras: clientesMaisCompras,
        vendas_por_tamanho: vendasPorTamanho
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ message: 'Erro ao buscar dados do dashboard.' });
  }
});

module.exports = router;
