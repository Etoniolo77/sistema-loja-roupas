const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth, vendedor } = require('../middlewares/auth');

// Obter todas as vendas
router.get('/', auth, async (req, res) => {
  try {
    // Parâmetros de paginação opcionais
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Filtros opcionais
    const cliente = req.query.cliente;
    const data_inicio = req.query.data_inicio;
    const data_fim = req.query.data_fim;
    const status = req.query.status;
    
    // Constrói a consulta SQL base
    let query = `
      SELECT v.id, v.data, v.valor_total, v.status, v.observacoes,
             c.id as cliente_id, c.nome as cliente_nome,
             u.id as usuario_id, u.nome as usuario_nome,
             (SELECT COUNT(*) FROM venda_itens WHERE venda_id = v.id) as total_itens
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Adiciona os filtros à consulta
    if (cliente) {
      query += ' AND c.nome LIKE ?';
      queryParams.push(`%${cliente}%`);
    }
    
    if (data_inicio) {
      query += ' AND v.data >= ?';
      queryParams.push(data_inicio);
    }
    
    if (data_fim) {
      query += ' AND v.data <= ?';
      queryParams.push(data_fim);
    }
    
    if (status) {
      query += ' AND v.status = ?';
      queryParams.push(status);
    }
    
    // Consulta para contar o total de registros
    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const countResult = await db.promiseGet(countQuery, queryParams);
    const total = countResult.total;
    
    // Adiciona ordenação e paginação
    query += ' ORDER BY v.data DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);
    
    // Executa a consulta
    const vendas = await db.promiseAll(query, queryParams);
    
    res.json({
      data: vendas,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    res.status(500).json({ message: 'Erro ao buscar vendas.' });
  }
});

// Obter uma venda específica com seus itens
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Busca a venda
    const venda = await db.promiseGet(`
      SELECT v.id, v.data, v.valor_total, v.status, v.observacoes,
             c.id as cliente_id, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp,
             u.id as usuario_id, u.nome as usuario_nome
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.id = ?
    `, [id]);
    
    if (!venda) {
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }
    
    // Busca os itens da venda
    const itens = await db.promiseAll(`
      SELECT vi.id, vi.quantidade, vi.preco_unitario, vi.subtotal,
             p.id as produto_id, p.nome as produto_nome, p.tamanho as produto_tamanho
      FROM venda_itens vi
      LEFT JOIN produtos p ON vi.produto_id = p.id
      WHERE vi.venda_id = ?
    `, [id]);
    
    // Adiciona os itens à venda
    venda.itens = itens;
    
    res.json(venda);
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    res.status(500).json({ message: 'Erro ao buscar venda.' });
  }
});

// Criar uma nova venda
router.post('/', auth, vendedor, async (req, res) => {
  try {
    const { cliente_id, itens, observacoes } = req.body;
    
    // Validações básicas
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ message: 'É necessário informar pelo menos um item.' });
    }
    
    // Verifica se o cliente existe (se fornecido)
    if (cliente_id) {
      const clienteExistente = await db.promiseGet('SELECT id FROM clientes WHERE id = ?', [cliente_id]);
      if (!clienteExistente) {
        return res.status(404).json({ message: 'Cliente não encontrado.' });
      }
    }
    
    // Valida os itens e calcula o valor total
    let valorTotal = 0;
    const itensValidados = [];
    
    for (const item of itens) {
      if (!item.produto_id || !item.quantidade || item.quantidade <= 0) {
        return res.status(400).json({ message: 'Cada item deve ter um produto e uma quantidade válida.' });
      }
      
      // Busca informações do produto
      const produto = await db.promiseGet(
        'SELECT id, nome, tamanho, quantidade, preco FROM produtos WHERE id = ?',
        [item.produto_id]
      );
      
      if (!produto) {
        return res.status(404).json({ message: `Produto ID ${item.produto_id} não encontrado.` });
      }
      
      // Verifica se há estoque suficiente
      if (produto.quantidade < item.quantidade) {
        return res.status(400).json({ 
          message: `Estoque insuficiente para o produto: ${produto.nome} (${produto.tamanho}).`,
          available: produto.quantidade,
          required: item.quantidade
        });
      }
      
      // Calcula o subtotal
      const precoUnitario = item.preco_unitario || produto.preco;
      const subtotal = precoUnitario * item.quantidade;
      
      // Adiciona ao valor total
      valorTotal += subtotal;
      
      // Adiciona aos itens validados
      itensValidados.push({
        produto_id: produto.id,
        quantidade: item.quantidade,
        preco_unitario: precoUnitario,
        subtotal
      });
    }
    
    // Inicia uma transação
    await db.promiseRun('BEGIN TRANSACTION');
    
    try {
      // Cria a venda
      const resultVenda = await db.promiseRun(
        'INSERT INTO vendas (cliente_id, valor_total, usuario_id, observacoes) VALUES (?, ?, ?, ?)',
        [cliente_id || null, valorTotal, req.usuario.id, observacoes || null]
      );
      
      const vendaId = resultVenda.lastID;
      
      // Adiciona os itens da venda
      for (const item of itensValidados) {
        await db.promiseRun(
          'INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
          [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
        );
        
        // Atualiza o estoque (a trigger já faz isso, mas vamos registrar a movimentação)
        await db.promiseRun(
          'INSERT INTO estoque_movimentacoes (produto_id, quantidade, tipo, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)',
          [item.produto_id, item.quantidade, 'saida', `Venda #${vendaId}`, req.usuario.id]
        );
      }
      
      // Commit da transação
      await db.promiseRun('COMMIT');
      
      // Retorna a venda criada
      const novaVenda = await db.promiseGet(`
        SELECT v.id, v.data, v.valor_total, v.status,
               c.id as cliente_id, c.nome as cliente_nome,
               u.id as usuario_id, u.nome as usuario_nome
        FROM vendas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN usuarios u ON v.usuario_id = u.id
        WHERE v.id = ?
      `, [vendaId]);
      
      // Busca os itens da venda
      const itensVenda = await db.promiseAll(`
        SELECT vi.id, vi.quantidade, vi.preco_unitario, vi.subtotal,
               p.id as produto_id, p.nome as produto_nome, p.tamanho as produto_tamanho
        FROM venda_itens vi
        LEFT JOIN produtos p ON vi.produto_id = p.id
        WHERE vi.venda_id = ?
      `, [vendaId]);
      
      // Adiciona os itens à venda
      novaVenda.itens = itensVenda;
      
      res.status(201).json(novaVenda);
    } catch (error) {
      // Rollback em caso de erro
      await db.promiseRun('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    res.status(500).json({ message: 'Erro ao criar venda.' });
  }
});

// Cancelar uma venda
router.put('/:id/cancelar', auth, vendedor, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    
    // Valida o motivo
    if (!motivo) {
      return res.status(400).json({ message: 'É necessário informar o motivo do cancelamento.' });
    }
    
    // Verifica se a venda existe
    const venda = await db.promiseGet('SELECT id, status FROM vendas WHERE id = ?', [id]);
    if (!venda) {
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }
    
    // Verifica se a venda já está cancelada
    if (venda.status === 'cancelada') {
      return res.status(400).json({ message: 'Esta venda já está cancelada.' });
    }
    
    // Inicia uma transação
    await db.promiseRun('BEGIN TRANSACTION');
    
    try {
      // Busca os itens da venda
      const itens = await db.promiseAll(
        'SELECT produto_id, quantidade FROM venda_itens WHERE venda_id = ?',
        [id]
      );
      
      // Atualiza o status da venda para cancelada
      await db.promiseRun(
        'UPDATE vendas SET status = ?, observacoes = CASE WHEN observacoes IS NULL THEN ? ELSE observacoes || "\n" || ? END WHERE id = ?',
        ['cancelada', `Cancelamento: ${motivo}`, `Cancelamento: ${motivo}`, id]
      );
      
      // Registra a movimentação de estoque para cada item (restaurar estoque)
      for (const item of itens) {
        await db.promiseRun(
          'INSERT INTO estoque_movimentacoes (produto_id, quantidade, tipo, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)',
          [item.produto_id, item.quantidade, 'entrada', `Cancelamento da venda #${id}: ${motivo}`, req.usuario.id]
        );
      }
      
      // Commit da transação
      await db.promiseRun('COMMIT');
      
      res.json({ message: 'Venda cancelada com sucesso e estoque restaurado.' });
    } catch (error) {
      // Rollback em caso de erro
      await db.promiseRun('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Erro ao cancelar venda:', error);
    res.status(500).json({ message: 'Erro ao cancelar venda.' });
  }
});

module.exports = router;
