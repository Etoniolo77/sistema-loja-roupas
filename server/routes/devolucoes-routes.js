const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth, vendedor, admin } = require('../middlewares/auth');

// Obter todas as devoluções
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
      SELECT d.id, d.data, d.motivo, d.valor_total, d.status,
             v.id as venda_id,
             c.id as cliente_id, c.nome as cliente_nome,
             u.id as usuario_id, u.nome as usuario_nome
      FROM devolucoes d
      JOIN vendas v ON d.venda_id = v.id
      JOIN clientes c ON d.cliente_id = c.id
      JOIN usuarios u ON d.usuario_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Adiciona os filtros à consulta
    if (cliente) {
      query += ' AND c.nome LIKE ?';
      queryParams.push(`%${cliente}%`);
    }
    
    if (data_inicio) {
      query += ' AND d.data >= ?';
      queryParams.push(data_inicio);
    }
    
    if (data_fim) {
      query += ' AND d.data <= ?';
      queryParams.push(data_fim);
    }
    
    if (status) {
      query += ' AND d.status = ?';
      queryParams.push(status);
    }
    
    // Consulta para contar o total de registros
    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const countResult = await db.promiseGet(countQuery, queryParams);
    const total = countResult.total;
    
    // Adiciona ordenação e paginação
    query += ' ORDER BY d.data DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);
    
    // Executa a consulta
    const devolucoes = await db.promiseAll(query, queryParams);
    
    res.json({
      data: devolucoes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar devoluções:', error);
    res.status(500).json({ message: 'Erro ao buscar devoluções.' });
  }
});

// Obter uma devolução específica com seus itens
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Busca a devolução
    const devolucao = await db.promiseGet(`
      SELECT d.id, d.data, d.motivo, d.valor_total, d.status,
             v.id as venda_id,
             c.id as cliente_id, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp,
             u.id as usuario_id, u.nome as usuario_nome
      FROM devolucoes d
      JOIN vendas v ON d.venda_id = v.id
      JOIN clientes c ON d.cliente_id = c.id
      JOIN usuarios u ON d.usuario_id = u.id
      WHERE d.id = ?
    `, [id]);
    
    if (!devolucao) {
      return res.status(404).json({ message: 'Devolução não encontrada.' });
    }
    
    // Busca os itens da devolução
    const itens = await db.promiseAll(`
      SELECT di.id, di.quantidade, di.preco_unitario, di.subtotal,
             p.id as produto_id, p.nome as produto_nome, p.tamanho
      FROM devolucao_itens di
      JOIN produtos p ON di.produto_id = p.id
      WHERE di.devolucao_id = ?
    `, [id]);
    
    // Retorna a devolução com seus itens
    res.json({
      ...devolucao,
      itens
    });
  } catch (error) {
    console.error('Erro ao buscar devolução:', error);
    res.status(500).json({ message: 'Erro ao buscar devolução.' });
  }
});

// Criar uma nova devolução
router.post('/', auth, vendedor, async (req, res) => {
  const { venda_id, cliente_id, motivo, itens } = req.body;
  
  // Validações básicas
  if (!venda_id || !cliente_id || !motivo || !itens || !itens.length) {
    return res.status(400).json({ 
      message: 'Dados incompletos. Venda, cliente, motivo e itens são obrigatórios.' 
    });
  }
  
  // Inicia uma transação
  await db.beginTransaction();
  
  try {
    // Verifica se a venda existe e está concluída
    const venda = await db.promiseGet(
      'SELECT id, cliente_id, status FROM vendas WHERE id = ?', 
      [venda_id]
    );
    
    if (!venda) {
      await db.rollback();
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }
    
    if (venda.status !== 'concluida') {
      await db.rollback();
      return res.status(400).json({ 
        message: 'Apenas vendas concluídas podem ter devoluções.' 
      });
    }
    
    // Calcula o valor total da devolução
    let valor_total = 0;
    for (const item of itens) {
      // Verifica se o item existe na venda
      const vendaItem = await db.promiseGet(
        'SELECT id, produto_id, quantidade, preco_unitario FROM venda_itens WHERE id = ? AND venda_id = ?',
        [item.venda_item_id, venda_id]
      );
      
      if (!vendaItem) {
        await db.rollback();
        return res.status(404).json({ 
          message: `Item de venda ${item.venda_item_id} não encontrado nesta venda.` 
        });
      }
      
      // Verifica se a quantidade a devolver é válida
      if (item.quantidade <= 0 || item.quantidade > vendaItem.quantidade) {
        await db.rollback();
        return res.status(400).json({ 
          message: `Quantidade inválida para o item ${vendaItem.produto_id}.` 
        });
      }
      
      // Calcula o subtotal do item
      const subtotal = vendaItem.preco_unitario * item.quantidade;
      valor_total += subtotal;
    }
    
    // Cria a devolução
    const result = await db.promiseRun(
      `INSERT INTO devolucoes 
       (venda_id, cliente_id, motivo, valor_total, usuario_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [venda_id, cliente_id, motivo, valor_total, req.usuario.id]
    );
    
    const devolucao_id = result.lastID;
    
    // Insere os itens da devolução
    for (const item of itens) {
      const vendaItem = await db.promiseGet(
        'SELECT id, produto_id, quantidade, preco_unitario FROM venda_itens WHERE id = ?',
        [item.venda_item_id]
      );
      
      await db.promiseRun(
        `INSERT INTO devolucao_itens 
         (devolucao_id, venda_item_id, produto_id, quantidade, preco_unitario, subtotal) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          devolucao_id,
          item.venda_item_id,
          vendaItem.produto_id,
          item.quantidade,
          vendaItem.preco_unitario,
          vendaItem.preco_unitario * item.quantidade
        ]
      );
    }
    
    // Confirma a transação
    await db.commit();
    
    res.status(201).json({
      message: 'Devolução registrada com sucesso. Aguardando aprovação.',
      devolucao_id
    });
  } catch (error) {
    await db.rollback();
    console.error('Erro ao criar devolução:', error);
    res.status(500).json({ message: 'Erro ao criar devolução.' });
  }
});

// Aprovar uma devolução
router.put('/:id/aprovar', auth, admin, async (req, res) => {
  const { id } = req.params;
  
  // Inicia uma transação
  await db.beginTransaction();
  
  try {
    // Verifica se a devolução existe e está pendente
    const devolucao = await db.promiseGet(
      'SELECT id, status FROM devolucoes WHERE id = ?', 
      [id]
    );
    
    if (!devolucao) {
      await db.rollback();
      return res.status(404).json({ message: 'Devolução não encontrada.' });
    }
    
    if (devolucao.status !== 'pendente') {
      await db.rollback();
      return res.status(400).json({ 
        message: 'Apenas devoluções pendentes podem ser aprovadas.' 
      });
    }
    
    // Atualiza o status da devolução para aprovada
    // O trigger atualizar_estoque_apos_devolucao irá atualizar o estoque e criar o crédito
    await db.promiseRun(
      'UPDATE devolucoes SET status = ? WHERE id = ?',
      ['aprovada', id]
    );
    
    // Confirma a transação
    await db.commit();
    
    res.json({
      message: 'Devolução aprovada com sucesso. Estoque atualizado e crédito gerado para o cliente.'
    });
  } catch (error) {
    await db.rollback();
    console.error('Erro ao aprovar devolução:', error);
    res.status(500).json({ message: 'Erro ao aprovar devolução.' });
  }
});

// Rejeitar uma devolução
router.put('/:id/rejeitar', auth, admin, async (req, res) => {
  const { id } = req.params;
  const { motivo_rejeicao } = req.body;
  
  if (!motivo_rejeicao) {
    return res.status(400).json({ message: 'Motivo da rejeição é obrigatório.' });
  }
  
  try {
    // Verifica se a devolução existe e está pendente
    const devolucao = await db.promiseGet(
      'SELECT id, status FROM devolucoes WHERE id = ?', 
      [id]
    );
    
    if (!devolucao) {
      return res.status(404).json({ message: 'Devolução não encontrada.' });
    }
    
    if (devolucao.status !== 'pendente') {
      return res.status(400).json({ 
        message: 'Apenas devoluções pendentes podem ser rejeitadas.' 
      });
    }
    
    // Atualiza o status da devolução para rejeitada
    await db.promiseRun(
      'UPDATE devolucoes SET status = ?, observacoes = ? WHERE id = ?',
      ['rejeitada', motivo_rejeicao, id]
    );
    
    res.json({
      message: 'Devolução rejeitada com sucesso.'
    });
  } catch (error) {
    console.error('Erro ao rejeitar devolução:', error);
    res.status(500).json({ message: 'Erro ao rejeitar devolução.' });
  }
});

// Obter créditos disponíveis de um cliente
router.get('/creditos/cliente/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica se o cliente existe
    const cliente = await db.promiseGet('SELECT id FROM clientes WHERE id = ?', [id]);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }
    
    // Busca os créditos disponíveis do cliente
    const creditos = await db.promiseAll(`
      SELECT id, valor, origem, data_criacao, data_expiracao
      FROM creditos_cliente
      WHERE cliente_id = ? AND status = 'disponivel' AND (data_expiracao IS NULL OR data_expiracao > datetime('now'))
      ORDER BY data_criacao DESC
    `, [id]);
    
    // Calcula o total de créditos disponíveis
    const totalCreditos = creditos.reduce((total, credito) => total + credito.valor, 0);
    
    res.json({
      creditos,
      total: totalCreditos
    });
  } catch (error) {
    console.error('Erro ao buscar créditos do cliente:', error);
    res.status(500).json({ message: 'Erro ao buscar créditos do cliente.' });
  }
});

// Usar crédito em uma venda
router.post('/creditos/usar', auth, vendedor, async (req, res) => {
  const { cliente_id, venda_id, credito_id, valor_usado } = req.body;
  
  // Validações básicas
  if (!cliente_id || !venda_id || !credito_id || !valor_usado || valor_usado <= 0) {
    return res.status(400).json({ 
      message: 'Dados incompletos ou inválidos.' 
    });
  }
  
  // Inicia uma transação
  await db.beginTransaction();
  
  try {
    // Verifica se o crédito existe, pertence ao cliente e está disponível
    const credito = await db.promiseGet(
      `SELECT id, cliente_id, valor, status, data_expiracao 
       FROM creditos_cliente 
       WHERE id = ? AND cliente_id = ? AND status = 'disponivel' 
       AND (data_expiracao IS NULL OR data_expiracao > datetime('now'))`,
      [credito_id, cliente_id]
    );
    
    if (!credito) {
      await db.rollback();
      return res.status(404).json({ message: 'Crédito não encontrado ou indisponível.' });
    }
    
    // Verifica se o valor a ser usado não excede o valor do crédito
    if (valor_usado > credito.valor) {
      await db.rollback();
      return res.status(400).json({ 
        message: `Valor solicitado (${valor_usado}) excede o crédito disponível (${credito.valor}).` 
      });
    }
    
    // Verifica se a venda existe e está pendente
    const venda = await db.promiseGet(
      'SELECT id, cliente_id, status, valor_total FROM vendas WHERE id = ?',
      [venda_id]
    );
    
    if (!venda) {
      await db.rollback();
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }
    
    if (venda.status !== 'pendente') {
      await db.rollback();
      return res.status(400).json({ 
        message: 'Apenas vendas pendentes podem receber créditos.' 
      });
    }
    
    // Registra o uso do crédito
    await db.promiseRun(
      'INSERT INTO uso_creditos (credito_id, venda_id, valor_usado) VALUES (?, ?, ?)',
      [credito_id, venda_id, valor_usado]
    );
    
    // Atualiza o status do crédito se foi totalmente utilizado
    if (valor_usado >= credito.valor) {
      await db.promiseRun(
        "UPDATE creditos_cliente SET status = 'utilizado' WHERE id = ?",
        [credito_id]
      );
    } else {
      // Se foi parcialmente utilizado, cria um novo crédito com o valor restante
      const valor_restante = credito.valor - valor_usado;
      
      await db.promiseRun(
        "UPDATE creditos_cliente SET status = 'utilizado' WHERE id = ?",
        [credito_id]
      );
      
      await db.promiseRun(
        `INSERT INTO creditos_cliente 
         (cliente_id, valor, origem, data_expiracao) 
         VALUES (?, ?, 'manual', ?)`,
        [cliente_id, valor_restante, credito.data_expiracao]
      );
    }
    
    // Atualiza o valor total da venda
    const novo_valor_total = Math.max(0, venda.valor_total - valor_usado);
    
    await db.promiseRun(
      'UPDATE vendas SET valor_total = ? WHERE id = ?',
      [novo_valor_total, venda_id]
    );
    
    // Confirma a transação
    await db.commit();
    
    res.json({
      message: `Crédito de R$ ${valor_usado.toFixed(2)} aplicado com sucesso na venda.`,
      novo_valor_total
    });
  } catch (error) {
    await db.rollback();
    console.error('Erro ao usar crédito:', error);
    res.status(500).json({ message: 'Erro ao usar crédito.' });
  }
});

module.exports = router;