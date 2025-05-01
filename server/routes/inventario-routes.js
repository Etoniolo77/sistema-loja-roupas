const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth, estoquista } = require('../middlewares/auth');

// Verificar se existe um inventário em andamento
router.get('/em-andamento', auth, async (req, res) => {
  try {
    const inventario = await db.promiseGet(`
      SELECT id, data_inicio, status, usuario_id 
      FROM inventarios 
      WHERE status = 'em_andamento' 
      ORDER BY data_inicio DESC LIMIT 1
    `);
    
    if (!inventario) {
      return res.json({ em_andamento: false });
    }
    
    // Buscar os itens do inventário em andamento
    const itens = await db.promiseAll(`
      SELECT 
        i.produto_id, 
        i.quantidade_sistema, 
        i.quantidade_fisica, 
        i.observacao,
        p.nome as produto_nome,
        p.tamanho as produto_tamanho
      FROM inventario_itens i
      JOIN produtos p ON i.produto_id = p.id
      WHERE i.inventario_id = ?
    `, [inventario.id]);
    
    // Formatar os dados para o frontend
    const dados = {};
    itens.forEach(item => {
      dados[item.produto_id] = {
        quantidade_sistema: item.quantidade_sistema,
        quantidade_fisica: item.quantidade_fisica !== null ? item.quantidade_fisica.toString() : '',
        observacao: item.observacao || ''
      };
    });
    
    res.json({
      em_andamento: true,
      inventario,
      dados
    });
  } catch (error) {
    console.error('Erro ao verificar inventário em andamento:', error);
    res.status(500).json({ message: 'Erro ao verificar inventário em andamento.' });
  }
});

// Iniciar um novo inventário
router.post('/iniciar', auth, estoquista, async (req, res) => {
  try {
    // Verificar se já existe um inventário em andamento
    const inventarioExistente = await db.promiseGet(`
      SELECT id FROM inventarios WHERE status = 'em_andamento'
    `);
    
    if (inventarioExistente) {
      return res.status(400).json({ 
        message: 'Já existe um inventário em andamento. Finalize-o antes de iniciar um novo.' 
      });
    }
    
    // Iniciar transação
    await db.beginTransaction();
    
    // Criar novo inventário
    const result = await db.promiseRun(`
      INSERT INTO inventarios (data_inicio, status, usuario_id)
      VALUES (CURRENT_TIMESTAMP, 'em_andamento', ?)
    `, [req.usuario.id]);
    
    const inventarioId = result.lastID;
    
    // Buscar todos os produtos
    const produtos = await db.promiseAll(`
      SELECT id, quantidade FROM produtos
    `);
    
    // Inserir itens do inventário com a quantidade atual do sistema
    for (const produto of produtos) {
      await db.promiseRun(`
        INSERT INTO inventario_itens (
          inventario_id, produto_id, quantidade_sistema, quantidade_fisica
        ) VALUES (?, ?, ?, NULL)
      `, [inventarioId, produto.id, produto.quantidade]);
    }
    
    // Commit da transação
    await db.commit();
    
    res.json({
      message: 'Novo inventário iniciado com sucesso',
      inventario_id: inventarioId
    });
  } catch (error) {
    // Rollback em caso de erro
    await db.rollback();
    console.error('Erro ao iniciar inventário:', error);
    res.status(500).json({ message: 'Erro ao iniciar inventário.' });
  }
});

// Salvar inventário
router.post('/salvar', auth, estoquista, async (req, res) => {
  try {
    const { itens } = req.body;
    
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ message: 'Nenhum item informado para o inventário.' });
    }
    
    // Verificar se existe um inventário em andamento
    const inventario = await db.promiseGet(`
      SELECT id FROM inventarios WHERE status = 'em_andamento'
    `);
    
    if (!inventario) {
      return res.status(404).json({ message: 'Nenhum inventário em andamento encontrado.' });
    }
    
    // Iniciar transação
    await db.beginTransaction();
    
    // Atualizar os itens do inventário
    for (const item of itens) {
      await db.promiseRun(`
        UPDATE inventario_itens
        SET quantidade_fisica = ?, observacao = ?
        WHERE inventario_id = ? AND produto_id = ?
      `, [
        item.quantidade_fisica,
        item.observacao || null,
        inventario.id,
        item.produto_id
      ]);
    }
    
    // Commit da transação
    await db.commit();
    
    res.json({
      message: 'Inventário salvo com sucesso',
      inventario_id: inventario.id
    });
  } catch (error) {
    // Rollback em caso de erro
    await db.rollback();
    console.error('Erro ao salvar inventário:', error);
    res.status(500).json({ message: 'Erro ao salvar inventário.' });
  }
});

// Finalizar inventário
router.post('/finalizar', auth, estoquista, async (req, res) => {
  try {
    // Verificar se existe um inventário em andamento
    const inventario = await db.promiseGet(`
      SELECT id FROM inventarios WHERE status = 'em_andamento'
    `);
    
    if (!inventario) {
      return res.status(404).json({ message: 'Nenhum inventário em andamento encontrado.' });
    }
    
    // Atualizar o status do inventário
    await db.promiseRun(`
      UPDATE inventarios
      SET status = 'finalizado', data_fim = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [inventario.id]);
    
    res.json({
      message: 'Inventário finalizado com sucesso',
      inventario_id: inventario.id
    });
  } catch (error) {
    console.error('Erro ao finalizar inventário:', error);
    res.status(500).json({ message: 'Erro ao finalizar inventário.' });
  }
});

// Ajustar estoque com base no inventário
router.post('/ajustar-estoque', auth, estoquista, async (req, res) => {
  try {
    const { ajustes } = req.body;
    
    if (!ajustes || !Array.isArray(ajustes) || ajustes.length === 0) {
      return res.status(400).json({ message: 'Nenhum ajuste informado.' });
    }
    
    // Verificar se existe um inventário em andamento
    const inventario = await db.promiseGet(`
      SELECT id FROM inventarios WHERE status = 'em_andamento'
    `);
    
    if (!inventario) {
      return res.status(404).json({ message: 'Nenhum inventário em andamento encontrado.' });
    }
    
    // Iniciar transação
    await db.beginTransaction();
    
    // Processar cada ajuste
    for (const ajuste of ajustes) {
      // Atualizar a quantidade do produto
      await db.promiseRun(`
        UPDATE produtos
        SET quantidade = ?
        WHERE id = ?
      `, [ajuste.quantidade_nova, ajuste.produto_id]);
      
      // Registrar a movimentação de estoque
      const tipo = ajuste.variacao > 0 ? 'entrada' : 'saida';
      const quantidade = Math.abs(ajuste.variacao);
      
      await db.promiseRun(`
        INSERT INTO estoque_movimentacoes (
          produto_id, quantidade, tipo, motivo, usuario_id
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        ajuste.produto_id,
        quantidade,
        tipo,
        `Ajuste por inventário: ${ajuste.observacao || ''}`,
        req.usuario.id
      ]);
    }
    
    // Finalizar o inventário
    await db.promiseRun(`
      UPDATE inventarios
      SET status = 'finalizado', data_fim = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [inventario.id]);
    
    // Commit da transação
    await db.commit();
    
    res.json({
      message: 'Estoque ajustado com sucesso',
      inventario_id: inventario.id,
      ajustes_realizados: ajustes.length
    });
  } catch (error) {
    // Rollback em caso de erro
    await db.rollback();
    console.error('Erro ao ajustar estoque:', error);
    res.status(500).json({ message: 'Erro ao ajustar estoque.' });
  }
});

// Obter histórico de inventários
router.get('/historico', auth, async (req, res) => {
  try {
    const inventarios = await db.promiseAll(`
      SELECT 
        i.id, 
        i.data_inicio, 
        i.data_fim, 
        i.status,
        u.nome as usuario,
        (SELECT COUNT(*) FROM inventario_itens WHERE inventario_id = i.id AND quantidade_fisica IS NOT NULL) as itens_contados,
        (SELECT COUNT(*) FROM inventario_itens WHERE inventario_id = i.id) as total_itens
      FROM inventarios i
      LEFT JOIN usuarios u ON i.usuario_id = u.id
      ORDER BY i.data_inicio DESC
      LIMIT 50
    `);
    
    res.json(inventarios);
  } catch (error) {
    console.error('Erro ao buscar histórico de inventários:', error);
    res.status(500).json({ message: 'Erro ao buscar histórico de inventários.' });
  }
});

// Obter detalhes de um inventário específico
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar informações do inventário
    const inventario = await db.promiseGet(`
      SELECT 
        i.id, 
        i.data_inicio, 
        i.data_fim, 
        i.status,
        u.nome as usuario
      FROM inventarios i
      LEFT JOIN usuarios u ON i.usuario_id = u.id
      WHERE i.id = ?
    `, [id]);
    
    if (!inventario) {
      return res.status(404).json({ message: 'Inventário não encontrado.' });
    }
    
    // Buscar os itens do inventário
    const itens = await db.promiseAll(`
      SELECT 
        i.produto_id, 
        i.quantidade_sistema, 
        i.quantidade_fisica, 
        i.observacao,
        p.nome as produto_nome,
        p.tamanho as produto_tamanho,
        (i.quantidade_fisica - i.quantidade_sistema) as variacao
      FROM inventario_itens i
      JOIN produtos p ON i.produto_id = p.id
      WHERE i.inventario_id = ?
      ORDER BY 
        CASE 
          WHEN i.quantidade_fisica IS NULL THEN 1
          WHEN i.quantidade_fisica <> i.quantidade_sistema THEN 0
          ELSE 2
        END,
        p.nome, p.tamanho
    `, [id]);
    
    res.json({
      inventario,
      itens
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do inventário:', error);
    res.status(500).json({ message: 'Erro ao buscar detalhes do inventário.' });
  }
});

module.exports = router;