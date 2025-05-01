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
      SELECT v.id, v.data, v.subtotal, v.desconto_percentual, v.desconto_valor, 
             v.valor_total, v.forma_pagamento, v.status, v.observacoes,
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
      SELECT v.id, v.data, v.subtotal, v.desconto_percentual, v.desconto_valor, 
             v.valor_total, v.forma_pagamento, v.status, v.observacoes,
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

// Criar uma nova venda (endpoint antigo - mantido para compatibilidade)
router.post('/nova', async (req, res) => {
  const { clienteId, itens, formaPagamento, valorTotal } = req.body;

  try {
    // Validações básicas
    if (!clienteId || !itens || itens.length === 0 || !formaPagamento || !valorTotal) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    // Verificar se o cliente existe
    const cliente = await db.promiseGet('SELECT id FROM clientes WHERE id = ?', [clienteId]);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    // Iniciar transação
    await db.beginTransaction();

    // Inserir venda
    const vendaResult = await db.promiseRun('INSERT INTO vendas (cliente_id, forma_pagamento, valor_total) VALUES (?, ?, ?)', [clienteId, formaPagamento, valorTotal]);
    const vendaId = vendaResult.insertId;

    // Inserir itens da venda
    for (const item of itens) {
      const { produtoId, quantidade, precoUnitario } = item;

      // Verificar se o produto existe e tem estoque suficiente
      const produto = await db.promiseGet('SELECT id, quantidade FROM produtos WHERE id = ?', [produtoId]);
      if (!produto || produto.quantidade < quantidade) {
        await db.rollback();
        return res.status(400).json({ message: `Produto ${produtoId} não encontrado ou quantidade insuficiente.` });
      }

      // Atualizar estoque
      await db.promiseRun('UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?', [quantidade, produtoId]);

      // Inserir item da venda
      await db.promiseRun('INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)', [vendaId, produtoId, quantidade, precoUnitario]);
    }

    // Commit da transação
    await db.commit();

    res.status(201).json({ message: 'Venda criada com sucesso.', vendaId });
  } catch (error) {
    // Rollback em caso de erro
    await db.rollback();
    console.error('Erro ao criar venda:', error);
    res.status(500).json({ message: 'Erro ao criar venda.' });
  }
});

// Criar uma nova venda (endpoint principal usado pelo cliente)
router.post('/', auth, vendedor, async (req, res) => {
  const { cliente_id, itens, forma_pagamento, subtotal, desconto_percentual, desconto_valor, valor_total, observacoes, status = 'pendente', numero_parcelas, data_primeira_parcela } = req.body;

  // Iniciar transação
  await db.beginTransaction();

  try {
    // Validações básicas
    if (!itens || itens.length === 0) {
      await db.rollback();
      return res.status(400).json({ message: 'A venda deve conter pelo menos um item.' });
    }

    if (!forma_pagamento) {
      await db.rollback();
      return res.status(400).json({ message: 'A forma de pagamento é obrigatória.' });
    }

    // Verificar se o cliente existe (se foi informado)
    if (cliente_id) {
      const cliente = await db.promiseGet('SELECT id FROM clientes WHERE id = ?', [cliente_id]);
      if (!cliente) {
        await db.rollback();
        return res.status(404).json({ message: 'Cliente não encontrado.' });
      }
    }

    // Validar parcelamento para crediário
    if (forma_pagamento === 'crediario') {
      if (!cliente_id) {
        await db.rollback();
        return res.status(400).json({ message: 'Para vendas no crediário é necessário selecionar um cliente.' });
      }
      
      if (!numero_parcelas || numero_parcelas < 1 || numero_parcelas > 6) {
        await db.rollback();
        return res.status(400).json({ message: 'O número de parcelas deve estar entre 1 e 6.' });
      }
      
      if (!data_primeira_parcela) {
        await db.rollback();
        return res.status(400).json({ message: 'É necessário definir a data da primeira parcela.' });
      }
    }

    // Inserir venda
    try {
      console.log('Inserindo venda no banco de dados...');
      const vendaResult = await db.promiseRun(
        'INSERT INTO vendas (cliente_id, forma_pagamento, subtotal, desconto_percentual, desconto_valor, valor_total, observacoes, usuario_id, status, numero_parcelas, data_primeira_parcela) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [cliente_id, forma_pagamento, subtotal, desconto_percentual, desconto_valor, valor_total, observacoes, req.usuario.id, forma_pagamento === 'crediario' ? 'pendente' : 'concluida', forma_pagamento === 'crediario' ? numero_parcelas : null, forma_pagamento === 'crediario' ? data_primeira_parcela : null]
      );
      
      // Se não for crediário, registra o pagamento automaticamente
      if (forma_pagamento !== 'crediario') {
        await db.promiseRun(
          'INSERT INTO pagamentos (venda_id, valor, forma_pagamento, usuario_id, observacoes) VALUES (?, ?, ?, ?, ?)',
          [vendaResult.lastID, valor_total, forma_pagamento, req.usuario.id, 'Pagamento automático na finalização da venda']
        );
      }

      if (!vendaResult || !vendaResult.lastID) {
        console.error('Erro: ID da venda não foi gerado');
        await db.rollback();
        return res.status(500).json({ message: 'Erro ao criar venda: ID não gerado' });
      }

      const vendaId = vendaResult.lastID;
      console.log('Venda inserida com ID:', vendaId);

      // Inserir itens da venda
      console.log('Processando itens da venda...');
      for (const item of itens) {
        const { produto_id, quantidade, preco_unitario } = item;
        console.log('Processando item:', { produto_id, quantidade, preco_unitario });

        // Verificar se o produto existe e tem estoque suficiente
        const produto = await db.promiseGet('SELECT quantidade FROM produtos WHERE id = ?', [produto_id]);
        if (!produto) {
          console.error(`Produto ${produto_id} não encontrado`);
          await db.rollback();
          return res.status(404).json({ message: `Produto ${produto_id} não encontrado.` });
        }

        if (produto.quantidade < quantidade) {
          console.error(`Estoque insuficiente para o produto ${produto_id}. Disponível: ${produto.quantidade}, Solicitado: ${quantidade}`);
          await db.rollback();
          return res.status(400).json({ message: `Estoque insuficiente para o produto ${produto_id}. Disponível: ${produto.quantidade}` });
        }

        // Inserir item da venda
        console.log('Inserindo item na venda...');
        await db.promiseRun(
          'INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
          [vendaId, produto_id, quantidade, preco_unitario, quantidade * preco_unitario]
        );

        // Atualizar estoque
        console.log('Atualizando estoque do produto...');
        await db.promiseRun(
          'UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?',
          [quantidade, produto_id]
        );
      }

      // Se for crediário, criar as parcelas
      if (forma_pagamento === 'crediario' && numero_parcelas > 0) {
        console.log('Criando parcelas para o crediário...');
        const valorParcela = parseFloat((valor_total / numero_parcelas).toFixed(2));
        const resto = parseFloat((valor_total - (valorParcela * numero_parcelas)).toFixed(2));
        
        // Buscar configuração de dias de vencimento
        let diasVencimento = 30; // Valor padrão
        try {
          const config = await db.promiseGet('SELECT dias_vencimento_crediario FROM configuracoes LIMIT 1');
          if (config && config.dias_vencimento_crediario) {
            diasVencimento = config.dias_vencimento_crediario;
          }
          console.log('Dias de vencimento do crediário:', diasVencimento);
        } catch (configError) {
          console.warn('Erro ao buscar configuração de dias de vencimento, usando valor padrão:', configError.message);
        }
        
        // Criar parcelas
        for (let i = 0; i < numero_parcelas; i++) {
          // Calcular data de vencimento
          const dataVencimento = new Date(data_primeira_parcela);
          dataVencimento.setMonth(dataVencimento.getMonth() + i);
          
          // Ajustar valor da última parcela para compensar arredondamentos
          const valorParcelaAtual = i === numero_parcelas - 1 ? valorParcela + resto : valorParcela;
          
          await db.promiseRun(
            'INSERT INTO parcelas_crediario (venda_id, numero_parcela, valor, data_vencimento, status) VALUES (?, ?, ?, ?, ?)',
            [vendaId, i + 1, valorParcelaAtual, dataVencimento.toISOString().split('T')[0], 'pendente']
          );
        }
      }
      
      // Commit da transação
      console.log('Finalizando transação com commit...');
      await db.commit();

      console.log('Venda registrada com sucesso:', vendaId);
      res.status(201).json({
        message: 'Venda registrada com sucesso.',
        id: vendaId
      });
    } catch (error) {
      // Rollback em caso de erro
      console.error('Erro durante o processamento da venda:', error);
      try {
        await db.rollback();
        console.log('Transação revertida com sucesso');
      } catch (rollbackError) {
        console.error('Erro ao reverter transação:', rollbackError);
      }
      
      res.status(500).json({
        message: 'Erro ao salvar venda.',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    try {
      await db.rollback();
      console.log('Transação revertida com sucesso');
    } catch (rollbackError) {
      console.error('Erro ao reverter transação:', rollbackError);
    }
    
    res.status(500).json({
      message: 'Erro ao salvar venda.',
      error: error.message
    });
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
    await db.beginTransaction();
    
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
      await db.commit();
      
      res.json({ message: 'Venda cancelada com sucesso e estoque restaurado.' });
    } catch (error) {
      // Rollback em caso de erro
      await db.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao cancelar venda:', error);
    res.status(500).json({ message: 'Erro ao cancelar venda.' });
  }
});



// Obter parcelas de uma venda
router.get('/:id/parcelas', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const vendaId = parseInt(id, 10);
    
    if (isNaN(vendaId)) {
      return res.status(400).json({ message: 'ID da venda inválido.' });
    }
    
    // Verificar se a venda existe
    const venda = await db.promiseGet('SELECT * FROM vendas WHERE id = ?', [vendaId]);
    
    if (!venda) {
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }
    
    // Buscar as parcelas da venda
    const parcelas = await db.promiseAll(`
      SELECT p.*, 
             CASE 
               WHEN p.status = 'paga' THEN u.nome 
               ELSE NULL 
             END as usuario
      FROM parcelas_crediario p
      LEFT JOIN pagamentos pag ON p.pagamento_id = pag.id
      LEFT JOIN usuarios u ON pag.usuario_id = u.id
      WHERE p.venda_id = ?
      ORDER BY p.numero_parcela ASC
    `, [vendaId]);
    
    // Calcular totais
    const totalParcelas = parcelas.reduce((acc, parcela) => acc + parcela.valor, 0);
    const totalPago = parcelas
      .filter(parcela => parcela.status === 'paga')
      .reduce((acc, parcela) => acc + parcela.valor, 0);
    
    res.json({
      parcelas,
      totalParcelas,
      totalPago,
      saldoRestante: totalParcelas - totalPago
    });
  } catch (error) {
    console.error('Erro ao buscar parcelas da venda:', error);
    res.status(500).json({ message: 'Erro ao buscar parcelas da venda.' });
  }
});

// Obter histórico de pagamentos de uma venda
router.get('/:id/pagamentos', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica se a venda existe
    const venda = await db.promiseGet('SELECT id, cliente_id, valor_total, status FROM vendas WHERE id = ?', [id]);
    if (!venda) {
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }
    
    // Busca os pagamentos da venda
    const pagamentos = await db.promiseAll(`
      SELECT p.id, p.valor, p.forma_pagamento, p.data, p.observacoes, u.nome as usuario
      FROM pagamentos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.venda_id = ?
      ORDER BY p.data DESC
    `, [id]);
    
    // Calcula o total pago e o saldo restante
    const totalPago = pagamentos.reduce((acc, pagamento) => acc + pagamento.valor, 0);
    const saldoRestante = venda.valor_total - totalPago;
    
    res.json({
      pagamentos,
      totalPago,
      valorTotal: venda.valor_total,
      saldoRestante
    });
  } catch (error) {
    console.error('Erro ao buscar pagamentos da venda:', error);
    res.status(500).json({ message: 'Erro ao buscar pagamentos da venda.' });
  }
});

// Registrar um pagamento para uma venda
router.post('/:id/pagamentos', auth, vendedor, async (req, res) => {
  try {
    const { id } = req.params;
    const { valor, forma_pagamento, observacoes } = req.body;
    const usuario_id = req.usuario.id;
    
    console.log('=== Início do processamento de pagamento ===');
    console.log('ID da venda recebido:', id, 'Tipo:', typeof id);
    console.log('Dados completos:', {
      venda_id: id,
      valor,
      forma_pagamento,
      observacoes,
      usuario_id
    });

    // Converter ID para número e validar
    const vendaId = parseInt(id, 10);
    if (isNaN(vendaId)) {
      console.error('ID da venda inválido:', id);
      return res.status(400).json({ message: 'ID da venda inválido.' });
    }

    // Primeiro, verificar se a venda existe com uma query simples
    console.log('Verificando existência da venda...');
    const vendaExiste = await db.promiseGet('SELECT COUNT(*) as count FROM vendas WHERE id = ?', [vendaId]);
    console.log('Resultado da verificação:', vendaExiste);

    if (!vendaExiste || vendaExiste.count === 0) {
      console.error(`Venda não encontrada para o ID: ${vendaId}`);
      return res.status(404).json({ 
        message: 'Venda não encontrada.',
        details: `Não foi possível encontrar uma venda com o ID: ${vendaId}`
      });
    }

    // Buscar detalhes da venda
    console.log('Buscando detalhes da venda...');
    const venda = await db.promiseGet(`
      SELECT 
        v.*,
        c.nome as cliente_nome,
        (SELECT COALESCE(SUM(valor), 0) FROM pagamentos WHERE venda_id = v.id) as total_pago
      FROM vendas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id 
      WHERE v.id = ?
    `, [vendaId]);

    console.log('Detalhes da venda encontrada:', venda);

    if (!venda) {
      console.error(`Erro ao buscar detalhes da venda: ${vendaId}`);
      return res.status(500).json({ 
        message: 'Erro ao buscar detalhes da venda.',
        details: 'Não foi possível recuperar os detalhes da venda do banco de dados.'
      });
    }

    // Verificar status da venda
    if (venda.status === 'cancelada') {
      console.warn('Tentativa de pagamento em venda cancelada:', vendaId);
      return res.status(400).json({ message: 'Não é possível adicionar pagamentos a uma venda cancelada.' });
    }

    // Validar valor do pagamento
    if (!valor || valor <= 0) {
      console.warn('Valor de pagamento inválido:', valor);
      return res.status(400).json({ message: 'O valor do pagamento deve ser maior que zero.' });
    }

    // Validar forma de pagamento
    const formasPagamento = ['credito', 'debito', 'pix', 'cheque', 'especie'];
    if (!formasPagamento.includes(forma_pagamento)) {
      console.warn('Forma de pagamento inválida:', forma_pagamento);
      return res.status(400).json({ message: 'Forma de pagamento inválida.' });
    }

    // Calcular saldo restante
    const saldoRestante = venda.valor_total - (venda.total_pago || 0);
    console.log('Saldo restante calculado:', saldoRestante);

    if (valor > saldoRestante) {
      console.warn('Valor do pagamento excede o saldo restante:', { valor, saldoRestante });
      return res.status(400).json({ 
        message: 'O valor do pagamento excede o saldo restante.',
        saldoRestante
      });
    }

    // Iniciar transação
    await db.beginTransaction();

    try {
      // Registrar o pagamento
      console.log('Registrando novo pagamento...');
      const result = await db.promiseRun(
        'INSERT INTO pagamentos (venda_id, valor, forma_pagamento, observacoes, usuario_id) VALUES (?, ?, ?, ?, ?)',
        [vendaId, valor, forma_pagamento, observacoes, usuario_id]
      );
      
      // Verificar se é uma venda com crediário
      const isCrediario = await db.promiseGet(
        'SELECT forma_pagamento FROM vendas WHERE id = ? AND forma_pagamento = "crediario"',
        [vendaId]
      );
      
      if (isCrediario) {
        // Buscar parcelas pendentes ordenadas por data de vencimento
        const parcelas = await db.promiseAll(
          'SELECT id, valor FROM parcelas_crediario WHERE venda_id = ? AND status = "pendente" ORDER BY data_vencimento ASC',
          [vendaId]
        );
        
        let valorRestante = valor;
        
        // Atualizar parcelas com o pagamento
        for (const parcela of parcelas) {
          if (valorRestante <= 0) break;
          
          if (valorRestante >= parcela.valor) {
            // Paga a parcela completamente
            await db.promiseRun(
              'UPDATE parcelas_crediario SET status = "paga", pagamento_id = ?, data_pagamento = CURRENT_TIMESTAMP WHERE id = ?',
              [result.lastID, parcela.id]
            );
            valorRestante -= parcela.valor;
          } else {
            // Paga parcialmente (cria uma nova parcela com o valor restante)
            await db.promiseRun(
              'UPDATE parcelas_crediario SET valor = ?, status = "paga", pagamento_id = ?, data_pagamento = CURRENT_TIMESTAMP WHERE id = ?',
              [valorRestante, result.lastID, parcela.id]
            );
            
            // Cria uma nova parcela com o valor restante
            const valorRestanteParcela = parcela.valor - valorRestante;
            await db.promiseRun(
              'INSERT INTO parcelas_crediario (venda_id, numero_parcela, valor, data_vencimento, status) VALUES (?, ?, ?, (SELECT data_vencimento FROM parcelas_crediario WHERE id = ?), "pendente")',
              [vendaId, parcela.numero_parcela, valorRestanteParcela, parcela.id]
            );
            
            valorRestante = 0;
          }
        }
      }

      // Verificar se a venda deve ser marcada como concluída
      if (saldoRestante - valor <= 0) {
        console.log('Atualizando status da venda para concluída...');
        await db.promiseRun(
          'UPDATE vendas SET status = ? WHERE id = ?',
          ['concluida', vendaId]
        );
        
        // Se for crediário, marca todas as parcelas restantes como pagas
        if (isCrediario) {
          await db.promiseRun(
            'UPDATE parcelas_crediario SET status = "paga", pagamento_id = ?, data_pagamento = CURRENT_TIMESTAMP WHERE venda_id = ? AND status = "pendente"',
            [result.lastID, vendaId]
          );
        }
      }

      // Confirmar transação
      await db.commit();

      console.log('Pagamento registrado com sucesso:', result);
      res.status(201).json({
        message: 'Pagamento registrado com sucesso',
        pagamento_id: result.lastID,
        venda_id: vendaId,
        saldo_restante: saldoRestante - valor
      });
    } catch (error) {
      // Reverter transação em caso de erro
      await db.promiseRun('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    res.status(500).json({ 
      message: 'Erro ao registrar pagamento.',
      error: error.message,
      stack: error.stack
    });
  }
});

// Excluir um pagamento
router.delete('/pagamentos/:id', auth, vendedor, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica se o pagamento existe
    const pagamento = await db.promiseGet(`
      SELECT p.id, p.venda_id, p.valor, v.valor_total, v.status
      FROM pagamentos p
      JOIN vendas v ON p.venda_id = v.id
      WHERE p.id = ?
    `, [id]);
    
    if (!pagamento) {
      return res.status(404).json({ message: 'Pagamento não encontrado.' });
    }
    
    if (pagamento.status === 'cancelada') {
      return res.status(400).json({ message: 'Não é possível remover pagamentos de uma venda cancelada.' });
    }
    
    // Busca todos os pagamentos da venda para recalcular o total
    const pagamentosExistentes = await db.promiseAll('SELECT id, valor FROM pagamentos WHERE venda_id = ? AND id != ?', [pagamento.venda_id, id]);
    const totalPago = pagamentosExistentes.reduce((acc, pag) => acc + pag.valor, 0);
    
    // Remove o pagamento
    await db.promiseRun('DELETE FROM pagamentos WHERE id = ?', [id]);
    
    // Atualiza o status da venda se necessário
    if (totalPago >= pagamento.valor_total) {
      await db.promiseRun('UPDATE vendas SET status = "concluida" WHERE id = ?', [pagamento.venda_id]);
    } else if (totalPago > 0) {
      await db.promiseRun('UPDATE vendas SET status = "pendente" WHERE id = ?', [pagamento.venda_id]);
    } else {
      // Se não há pagamentos, volta para 'pendente'
      await db.promiseRun('UPDATE vendas SET status = "pendente" WHERE id = ?', [pagamento.venda_id]);
    }
    
    res.json({ 
      message: 'Pagamento removido com sucesso.',
      totalPago,
      valorTotal: pagamento.valor_total,
      saldoRestante: pagamento.valor_total - totalPago,
      status: totalPago >= pagamento.valor_total ? 'concluida' : 'pendente'
    });
  } catch (error) {
    console.error('Erro ao remover pagamento:', error);
    res.status(500).json({ message: 'Erro ao remover pagamento.' });
  }
});

// Buscar vendas por produto
router.get('/por-produto', auth, async (req, res) => {
  try {
    const { termo, status } = req.query;
    
    if (!termo) {
      return res.status(400).json({ message: 'O termo de busca é obrigatório.' });
    }
    
    // Constrói a consulta SQL base
    let query = `
      SELECT DISTINCT
        v.id, v.data, v.subtotal, v.desconto_percentual, v.desconto_valor,
        v.valor_total, v.forma_pagamento, v.status, v.observacoes,
        c.id as cliente_id, c.nome as cliente_nome,
        u.id as usuario_id, u.nome as usuario_nome,
        (SELECT COUNT(*) FROM venda_itens WHERE venda_id = v.id) as total_itens
      FROM vendas v
      JOIN venda_itens vi ON v.id = vi.venda_id
      JOIN produtos p ON vi.produto_id = p.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE p.nome LIKE ?
    `;
    
    const queryParams = [`%${termo}%`];
    
    // Adiciona filtro de status se fornecido
    if (status) {
      query += ' AND v.status = ?';
      queryParams.push(status);
    }
    
    // Adiciona ordenação
    query += ' ORDER BY v.data DESC';
    
    // Executa a consulta
    const vendas = await db.promiseAll(query, queryParams);
    
    res.json({
      data: vendas,
      total: vendas.length
    });
  } catch (error) {
    console.error('Erro ao buscar vendas por produto:', error);
    res.status(500).json({ message: 'Erro ao buscar vendas por produto.' });
  }
});



// Obter itens de uma venda
router.get('/:id/itens', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Buscando itens para a venda ${id}`);
    
    // Verifica se a venda existe
    const venda = await db.promiseGet('SELECT id FROM vendas WHERE id = ?', [id]);
    if (!venda) {
      console.warn(`Venda ${id} não encontrada`);
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }
    
    // Busca os itens da venda com detalhes do produto
    const itens = await db.promiseAll(`
      SELECT 
        vi.id, 
        vi.produto_id, 
        p.nome as produto_nome, 
        p.tamanho as produto_tamanho,
        vi.quantidade, 
        vi.preco_unitario,
        (vi.quantidade * vi.preco_unitario) as subtotal
      FROM venda_itens vi
      LEFT JOIN produtos p ON vi.produto_id = p.id
      WHERE vi.venda_id = ?
      ORDER BY p.nome, p.tamanho
    `, [id]);
    
    console.log(`Encontrados ${itens.length} itens para a venda ${id}`);
    
    res.json(itens);
  } catch (error) {
    console.error(`Erro ao buscar itens da venda ${req.params.id}:`, error);
    res.status(500).json({ message: 'Erro ao buscar itens da venda.' });
  }
});

module.exports = router;
