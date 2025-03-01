const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth, estoquista } = require('../middlewares/auth');

// Obter todos os produtos
router.get('/', auth, async (req, res) => {
  try {
    const produtos = await db.promiseAll(
      'SELECT id, nome, tamanho, quantidade, preco, created_at, updated_at FROM produtos ORDER BY nome, tamanho'
    );
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ message: 'Erro ao buscar produtos.' });
  }
});

// Obter um produto específico
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await db.promiseGet(
      'SELECT id, nome, tamanho, quantidade, preco, created_at, updated_at FROM produtos WHERE id = ?',
      [id]
    );
    
    if (!produto) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    
    res.json(produto);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ message: 'Erro ao buscar produto.' });
  }
});

// Criar um novo produto
router.post('/', auth, estoquista, async (req, res) => {
  try {
    const { nome, tamanho, quantidade, preco } = req.body;
    
    // Validações básicas
    if (!nome || !tamanho || quantidade === undefined || preco === undefined) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    
    // Valida o tamanho
    if (!['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'].includes(tamanho)) {
      return res.status(400).json({ message: 'Tamanho inválido. Valores permitidos: PP, P, M, G, GG, XG, XXG' });
    }
    
    // Valida a quantidade e o preço
    if (quantidade < 0) {
      return res.status(400).json({ message: 'A quantidade deve ser um valor positivo.' });
    }
    
    if (preco <= 0) {
      return res.status(400).json({ message: 'O preço deve ser maior que zero.' });
    }
    
    // Verifica se já existe um produto com mesmo nome e tamanho
    const produtoExistente = await db.promiseGet(
      'SELECT id FROM produtos WHERE nome = ? AND tamanho = ?',
      [nome, tamanho]
    );
    
    if (produtoExistente) {
      return res.status(400).json({ 
        message: 'Já existe um produto com esse nome e tamanho.',
        suggestion: 'Você pode atualizar a quantidade do produto existente.'
      });
    }
    
    // Insere o novo produto
    const result = await db.promiseRun(
      'INSERT INTO produtos (nome, tamanho, quantidade, preco) VALUES (?, ?, ?, ?)',
      [nome, tamanho, quantidade, preco]
    );
    
    // Se a quantidade inicial for maior que zero, registra a movimentação de estoque
    if (quantidade > 0) {
      await db.promiseRun(
        'INSERT INTO estoque_movimentacoes (produto_id, quantidade, tipo, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)',
        [result.lastID, quantidade, 'entrada', 'Estoque inicial', req.usuario.id]
      );
    }
    
    // Retorna o produto criado
    const novoProduto = await db.promiseGet(
      'SELECT id, nome, tamanho, quantidade, preco, created_at, updated_at FROM produtos WHERE id = ?',
      [result.lastID]
    );
    
    res.status(201).json(novoProduto);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ message: 'Erro ao criar produto.' });
  }
});

// Atualizar um produto
router.put('/:id', auth, estoquista, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, tamanho, preco } = req.body;
    
    // Validações básicas
    if (!nome || !tamanho || preco === undefined) {
      return res.status(400).json({ message: 'Nome, tamanho e preço são obrigatórios.' });
    }
    
    // Valida o tamanho
    if (!['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'].includes(tamanho)) {
      return res.status(400).json({ message: 'Tamanho inválido. Valores permitidos: PP, P, M, G, GG, XG, XXG' });
    }
    
    // Valida o preço
    if (preco <= 0) {
      return res.status(400).json({ message: 'O preço deve ser maior que zero.' });
    }
    
    // Verifica se o produto existe
    const produtoExistente = await db.promiseGet('SELECT id FROM produtos WHERE id = ?', [id]);
    if (!produtoExistente) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    
    // Verifica se já existe um produto com mesmo nome e tamanho (exceto o próprio produto)
    const produtoDuplicado = await db.promiseGet(
      'SELECT id FROM produtos WHERE nome = ? AND tamanho = ? AND id != ?',
      [nome, tamanho, id]
    );
    
    if (produtoDuplicado) {
      return res.status(400).json({ 
        message: 'Já existe outro produto com esse nome e tamanho.',
        suggestion: 'Você pode escolher um nome ou tamanho diferente.'
      });
    }
    
    // Atualiza o produto (apenas nome, tamanho e preço - quantidade é gerenciada separadamente)
    await db.promiseRun(
      'UPDATE produtos SET nome = ?, tamanho = ?, preco = ? WHERE id = ?',
      [nome, tamanho, preco, id]
    );
    
    // Retorna o produto atualizado
    const produtoAtualizado = await db.promiseGet(
      'SELECT id, nome, tamanho, quantidade, preco, created_at, updated_at FROM produtos WHERE id = ?',
      [id]
    );
    
    res.json(produtoAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ message: 'Erro ao atualizar produto.' });
  }
});

// Excluir um produto
router.delete('/:id', auth, estoquista, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica se o produto existe
    const produtoExistente = await db.promiseGet('SELECT id FROM produtos WHERE id = ?', [id]);
    if (!produtoExistente) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    
    // Verifica se o produto tem vendas associadas
    const produtoComVendas = await db.promiseGet('SELECT id FROM venda_itens WHERE produto_id = ? LIMIT 1', [id]);
    if (produtoComVendas) {
      return res.status(400).json({ 
        message: 'Não é possível excluir o produto pois ele possui vendas registradas.',
        solution: 'Você pode deixar o produto com quantidade zero em vez de excluí-lo.'
      });
    }
    
    // Exclui as movimentações de estoque do produto
    await db.promiseRun('DELETE FROM estoque_movimentacoes WHERE produto_id = ?', [id]);
    
    // Exclui o produto
    await db.promiseRun('DELETE FROM produtos WHERE id = ?', [id]);
    
    res.json({ message: 'Produto excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ message: 'Erro ao excluir produto.' });
  }
});

// Buscar histórico de movimentações de um produto
router.get('/:id/movimentacoes', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica se o produto existe
    const produtoExistente = await db.promiseGet('SELECT id FROM produtos WHERE id = ?', [id]);
    if (!produtoExistente) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    
    // Busca as movimentações do produto
    const movimentacoes = await db.promiseAll(`
      SELECT m.id, m.quantidade, m.tipo, m.motivo, m.data, u.nome as usuario
      FROM estoque_movimentacoes m
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.produto_id = ?
      ORDER BY m.data DESC
    `, [id]);
    
    res.json(movimentacoes);
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error);
    res.status(500).json({ message: 'Erro ao buscar movimentações.' });
  }
});

module.exports = router;
