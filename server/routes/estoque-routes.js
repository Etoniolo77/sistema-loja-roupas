const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth, estoquista } = require('../middlewares/auth');

// Obter informações do estoque (todos os produtos)
router.get('/', auth, async (req, res) => {
  try {
    const estoque = await db.promiseAll(`
      SELECT p.id, p.nome, p.tamanho, p.quantidade, p.preco,
             CASE 
               WHEN p.quantidade <= 5 THEN 'baixo'
               WHEN p.quantidade <= 10 THEN 'médio'
               ELSE 'adequado'
             END as nivel_estoque,
             p.updated_at as ultima_atualizacao
      FROM produtos p
      ORDER BY 
        CASE 
          WHEN p.quantidade <= 5 THEN 1
          WHEN p.quantidade <= 10 THEN 2
          ELSE 3
        END,
        p.nome, p.tamanho
    `);
    
    res.json(estoque);
  } catch (error) {
    console.error('Erro ao buscar estoque:', error);
    res.status(500).json({ message: 'Erro ao buscar estoque.' });
  }
});

// Adicionar quantidade ao estoque de um produto
router.post('/adicionar', auth, estoquista, async (req, res) => {
  try {
    const { produto_id, quantidade, motivo } = req.body;
    
    // Validações básicas
    if (!produto_id || quantidade === undefined || !motivo) {
      return res.status(400).json({ message: 'Produto, quantidade e motivo são obrigatórios.' });
    }
    
    // Valida a quantidade
    if (quantidade <= 0) {
      return res.status(400).json({ message: 'A quantidade deve ser um valor positivo.' });
    }
    
    // Verifica se o produto existe
    const produto = await db.promiseGet('SELECT id, nome, quantidade FROM produtos WHERE id = ?', [produto_id]);
    if (!produto) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    
    // Atualiza a quantidade do produto
    await db.promiseRun(
      'UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?',
      [quantidade, produto_id]
    );
    
    // Registra a movimentação de estoque
    await db.promiseRun(
      'INSERT INTO estoque_movimentacoes (produto_id, quantidade, tipo, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [produto_id, quantidade, 'entrada', motivo, req.usuario.id]
    );
    
    // Retorna o produto atualizado
    const produtoAtualizado = await db.promiseGet(
      'SELECT id, nome, tamanho, quantidade, preco FROM produtos WHERE id = ?',
      [produto_id]
    );
    
    res.json({
      message: `Estoque atualizado com sucesso. Adicionado ${quantidade} unidades.`,
      produto: produtoAtualizado
    });
  } catch (error) {
    console.error('Erro ao adicionar ao estoque:', error);
    res.status(500).json({ message: 'Erro ao adicionar ao estoque.' });
  }
});

// Remover quantidade do estoque de um produto
router.post('/remover', auth, estoquista, async (req, res) => {
  try {
    const { produto_id, quantidade, motivo } = req.body;
    
    // Validações básicas
    if (!produto_id || quantidade === undefined || !motivo) {
      return res.status(400).json({ message: 'Produto, quantidade e motivo são obrigatórios.' });
    }
    
    // Valida a quantidade
    if (quantidade <= 0) {
      return res.status(400).json({ message: 'A quantidade deve ser um valor positivo.' });
    }
    
    // Verifica se o produto existe
    const produto = await db.promiseGet('SELECT id, nome, quantidade FROM produtos WHERE id = ?', [produto_id]);
    if (!produto) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    
    // Verifica se há estoque suficiente
    if (produto.quantidade < quantidade) {
      return res.status(400).json({ 
        message: 'Quantidade insuficiente em estoque.',
        available: produto.quantidade
      });
    }
    
    // Atualiza a quantidade do produto
    await db.promiseRun(
      'UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?',
      [quantidade, produto_id]
    );
    
    // Registra a movimentação de estoque
    await db.promiseRun(
      'INSERT INTO estoque_movimentacoes (produto_id, quantidade, tipo, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [produto_id, quantidade, 'saida', motivo, req.usuario.id]
    );
    
    // Retorna o produto atualizado
    const produtoAtualizado = await db.promiseGet(
      'SELECT id, nome, tamanho, quantidade, preco FROM produtos WHERE id = ?',
      [produto_id]
    );
    
    res.json({
      message: `Estoque atualizado com sucesso. Removido ${quantidade} unidades.`,
      produto: produtoAtualizado
    });
  } catch (error) {
    console.error('Erro ao remover do estoque:', error);
    res.status(500).json({ message: 'Erro ao remover do estoque.' });
  }
});

// Obter histórico de movimentações de estoque
router.get('/movimentacoes', auth, async (req, res) => {
  try {
    // Parâmetros de paginação opcionais
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Filtros opcionais
    const tipo = req.query.tipo; // 'entrada' ou 'saida'
    const produto = req.query.produto; // termo de busca pelo nome do produto
    const data_inicio = req.query.data_inicio;
    const data_fim = req.query.data_fim;
    
    // Constrói a consulta SQL base
    let query = `
      SELECT m.id, m.quantidade, m.tipo, m.motivo, m.data,
             p.nome as produto_nome, p.tamanho as produto_tamanho,
             u.nome as usuario
      FROM estoque_movimentacoes m
      LEFT JOIN produtos p ON m.produto_id = p.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Adiciona os filtros à consulta
    if (tipo) {
      query += ' AND m.tipo = ?';
      queryParams.push(tipo);
    }
    
    if (produto) {
      query += ' AND p.nome LIKE ?';
      queryParams.push(`%${produto}%`);
    }
    
    if (data_inicio) {
      query += ' AND m.data >= ?';
      queryParams.push(data_inicio);
    }
    
    if (data_fim) {
      query += ' AND m.data <= ?';
      queryParams.push(data_fim);
    }
    
    // Consulta para contar o total de registros
    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const countResult = await db.promiseGet(countQuery, queryParams);
    const total = countResult.total;
    
    // Adiciona ordenação e paginação
    query += ' ORDER BY m.data DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);
    
    // Executa a consulta
    const movimentacoes = await db.promiseAll(query, queryParams);
    
    res.json({
      data: movimentacoes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error);
    res.status(500).json({ message: 'Erro ao buscar movimentações.' });
  }
});

// Obter produtos com estoque baixo
router.get('/baixo', auth, async (req, res) => {
  try {
    const produtosBaixoEstoque = await db.promiseAll(`
      SELECT id, nome, tamanho, quantidade, preco
      FROM produtos
      WHERE quantidade <= 5
      ORDER BY quantidade, nome, tamanho
    `);
    
    res.json(produtosBaixoEstoque);
  } catch (error) {
    console.error('Erro ao buscar produtos com estoque baixo:', error);
    res.status(500).json({ message: 'Erro ao buscar produtos com estoque baixo.' });
  }
});

router.post('/troca', async (req, res) => {
  const { produtoIdOriginal, produtoIdNovo, quantidade } = req.body;

  try {
    // Verificar se os produtos existem
    const produtoOriginal = await db.promiseGet('SELECT id, quantidade FROM produtos WHERE id = ?', [produtoIdOriginal]);
    const produtoNovo = await db.promiseGet('SELECT id, quantidade FROM produtos WHERE id = ?', [produtoIdNovo]);

    if (!produtoOriginal || !produtoNovo) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    // Verificar se há quantidade suficiente para troca
    if (produtoOriginal.quantidade < quantidade) {
      return res.status(400).json({ message: 'Quantidade insuficiente para troca.' });
    }

    // Iniciar transação
    await db.beginTransaction();

    // Atualizar quantidades
    await db.promiseRun('UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?', [quantidade, produtoIdOriginal]);
    await db.promiseRun('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?', [quantidade, produtoIdNovo]);

    // Registrar troca
    await db.promiseRun('INSERT INTO trocas (produto_id_original, produto_id_novo, quantidade) VALUES (?, ?, ?)', [produtoIdOriginal, produtoIdNovo, quantidade]);

    // Commit da transação
    await db.commit();

    res.json({ message: 'Troca realizada com sucesso.' });
  } catch (error) {
    // Rollback em caso de erro
    await db.rollback();
    console.error('Erro ao realizar troca:', error);
    res.status(500).json({ message: 'Erro ao realizar troca.' });
  }
});

module.exports = router;