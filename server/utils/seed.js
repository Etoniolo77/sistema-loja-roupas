const db = require('../database');

async function seed() {
  try {
    console.log('Iniciando processo de seed do banco de dados...');

    // Desabilitar foreign keys temporariamente
    await db.promiseRun('PRAGMA foreign_keys = OFF');

    console.log('Limpando dados existentes...');
    
    // Limpar dados existentes
    await db.promiseRun('DELETE FROM venda_itens');
    await db.promiseRun('DELETE FROM vendas');
    await db.promiseRun('DELETE FROM estoque_movimentacoes');
    await db.promiseRun('DELETE FROM produtos');
    await db.promiseRun('DELETE FROM clientes');
    
    // Resetar autoincrement
    await db.promiseRun('DELETE FROM sqlite_sequence');

    // Criar clientes de teste
    console.log('\nCriando clientes de teste...');
    const clientes = [
      ['Maria Silva', '11999999999', '@mariasilva', 'Cliente VIP'],
      ['João Santos', '11988888888', '@joaosantos', 'Prefere roupas esportivas'],
      ['Ana Oliveira', '11977777777', '@anaoliveira', 'Gosta de vestidos'],
      ['Carlos Pereira', '11966666666', '@carlospereira', 'Cliente novo'],
      ['Lucia Ferreira', '11955555555', '@luciaferreira', 'Compra frequentemente'],
      ['Roberto Almeida', '11944444444', '@robertoalmeida', 'Prefere pagamento em PIX'],
      ['Fernanda Lima', '11933333333', '@fernandalima', 'Compra para revenda'],
      ['Paulo Souza', '11922222222', '@paulosouza', 'Prefere roupas de marca'],
      ['Camila Santos', '11911111111', '@camilasantos', 'Sempre pede desconto'],
      ['Ricardo Oliveira', '11900000000', '@ricardooliveira', 'Cliente corporativo']
    ];

    for (const [nome, whatsapp, instagram, observacoes] of clientes) {
      await db.promiseRun(
        'INSERT INTO clientes (nome, whatsapp, instagram, observacoes) VALUES (?, ?, ?, ?)',
        [nome, whatsapp, instagram, observacoes]
      );
    }

    // Criar produtos de teste
    console.log('Criando produtos de teste...');
    const produtos = [
      // Camisetas
      ['Camiseta Básica', 'P', 30, 49.90],
      ['Camiseta Básica', 'M', 50, 49.90],
      ['Camiseta Básica', 'G', 40, 49.90],
      ['Camiseta Estampada', 'P', 25, 59.90],
      ['Camiseta Estampada', 'M', 35, 59.90],
      ['Camiseta Estampada', 'G', 30, 59.90],
      // Calças
      ['Calça Jeans Slim', 'P', 20, 159.90],
      ['Calça Jeans Slim', 'M', 30, 159.90],
      ['Calça Jeans Slim', 'G', 25, 159.90],
      ['Calça Moletom', 'P', 15, 89.90],
      ['Calça Moletom', 'M', 20, 89.90],
      ['Calça Moletom', 'G', 18, 89.90],
      // Vestidos
      ['Vestido Floral', 'P', 15, 129.90],
      ['Vestido Floral', 'M', 20, 129.90],
      ['Vestido Floral', 'G', 10, 129.90],
      ['Vestido Liso', 'P', 12, 119.90],
      ['Vestido Liso', 'M', 18, 119.90],
      ['Vestido Liso', 'G', 8, 119.90],
      // Blusas
      ['Blusa Manga Longa', 'P', 20, 89.90],
      ['Blusa Manga Longa', 'M', 25, 89.90],
      ['Blusa Manga Longa', 'G', 15, 89.90],
      ['Blusa Cropped', 'P', 30, 69.90],
      ['Blusa Cropped', 'M', 40, 69.90],
      ['Blusa Cropped', 'G', 20, 69.90],
      // Acessórios
      ['Cinto Couro', 'P', 10, 79.90],
      ['Cinto Couro', 'M', 15, 79.90],
      ['Cinto Couro', 'G', 8, 79.90],
      ['Boné Ajustável', 'PP', 25, 49.90],
      ['Boné Ajustável', 'P', 30, 49.90],
      ['Boné Ajustável', 'M', 20, 49.90]
    ];

    for (const [nome, tamanho, quantidade, preco] of produtos) {
      await db.promiseRun(
        'INSERT INTO produtos (nome, tamanho, quantidade, preco) VALUES (?, ?, ?, ?)',
        [nome, tamanho, quantidade, preco]
      );
    }

    // Criar vendas de teste
    console.log('Criando vendas de teste...');
    
    // Venda 1 - Concluída - Crédito
    await db.promiseRun(`
      INSERT INTO vendas (cliente_id, subtotal, valor_total, forma_pagamento, status, usuario_id, data, observacoes) 
      VALUES (1, 159.90, 159.90, 'credito', 'concluida', 1, datetime('now', '-10 days'), 'Pagamento em 2x')
    `);

    // Venda 2 - Concluída - PIX com desconto
    await db.promiseRun(`
      INSERT INTO vendas (cliente_id, subtotal, desconto_percentual, valor_total, forma_pagamento, status, usuario_id, data, observacoes)
      VALUES (2, 279.80, 10, 251.82, 'pix', 'concluida', 1, datetime('now', '-8 days'), 'Desconto por pagamento à vista')
    `);

    // Venda 3 - Concluída - Débito
    await db.promiseRun(`
      INSERT INTO vendas (cliente_id, subtotal, valor_total, forma_pagamento, status, usuario_id, data)
      VALUES (3, 389.70, 389.70, 'debito', 'concluida', 1, datetime('now', '-6 days'))
    `);
    
    // Venda 4 - Concluída - Espécie com desconto em valor
    await db.promiseRun(`
      INSERT INTO vendas (cliente_id, subtotal, desconto_valor, valor_total, forma_pagamento, status, usuario_id, data, observacoes)
      VALUES (4, 199.80, 20, 179.80, 'especie', 'concluida', 2, datetime('now', '-5 days'), 'Desconto de R$20 por pagamento em dinheiro')
    `);
    
    // Venda 5 - Concluída - Crediário
    await db.promiseRun(`
      INSERT INTO vendas (cliente_id, subtotal, valor_total, forma_pagamento, status, usuario_id, data, observacoes)
      VALUES (5, 259.80, 259.80, 'crediario', 'concluida', 2, datetime('now', '-4 days'), 'Pagamento em 3x sem juros')
    `);
    
    // Venda 6 - Concluída - Cheque
    await db.promiseRun(`
      INSERT INTO vendas (cliente_id, subtotal, valor_total, forma_pagamento, status, usuario_id, data, observacoes)
      VALUES (6, 319.80, 319.80, 'cheque', 'concluida', 1, datetime('now', '-3 days'), 'Cheque para 30 dias')
    `);
    
    // Venda 7 - Cancelada
    await db.promiseRun(`
      INSERT INTO vendas (cliente_id, subtotal, valor_total, forma_pagamento, status, usuario_id, data, observacoes)
      VALUES (7, 149.70, 149.70, 'credito', 'cancelada', 2, datetime('now', '-2 days'), 'Cliente desistiu da compra')
    `);
    
    // Venda 8 - Concluída - Hoje
    await db.promiseRun(`
      INSERT INTO vendas (cliente_id, subtotal, valor_total, forma_pagamento, status, usuario_id, data)
      VALUES (8, 209.85, 209.85, 'pix', 'concluida', 1, datetime('now'))
    `);

    // Inserir itens das vendas
    console.log('Criando itens das vendas...');
    const itensVendas = [
      // Venda 1
      [1, 4, 1, 159.90, 159.90],  // 1 Calça Jeans P
      
      // Venda 2
      [2, 2, 2, 49.90, 99.80],    // 2 Camisetas M
      [2, 11, 2, 89.90, 179.80],  // 2 Blusas M
      
      // Venda 3
      [3, 8, 3, 129.90, 389.70],  // 3 Vestidos M
      
      // Venda 4
      [4, 5, 2, 59.90, 119.80],   // 2 Camisetas Estampadas M
      [4, 10, 1, 89.90, 89.90],   // 1 Calça Moletom P
      
      // Venda 5
      [5, 14, 2, 129.90, 259.80], // 2 Vestidos Florais M
      
      // Venda 6
      [6, 20, 2, 89.90, 179.80],  // 2 Blusas Manga Longa M
      [6, 28, 2, 49.90, 99.80],   // 2 Bonés Ajustáveis P
      [6, 25, 1, 79.90, 79.90],   // 1 Cinto Couro P
      
      // Venda 7 (Cancelada)
      [7, 22, 1, 69.90, 69.90],   // 1 Blusa Cropped P
      [7, 16, 1, 119.90, 119.90], // 1 Vestido Liso P
      
      // Venda 8
      [8, 4, 1, 59.90, 59.90],    // 1 Camiseta Estampada P
      [8, 23, 2, 69.90, 139.80],  // 2 Blusas Cropped M
      [8, 29, 1, 49.90, 49.90]    // 1 Boné Ajustável M
    ];

    for (const [venda_id, produto_id, quantidade, preco_unitario, subtotal] of itensVendas) {
      await db.promiseRun(
        'INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
        [venda_id, produto_id, quantidade, preco_unitario, subtotal]
      );
    }

    // Criar movimentações de estoque
    console.log('Criando movimentações de estoque...');
    const movimentacoes = [
      // Entradas
      [2, 50, 'entrada', 'Compra de fornecedor', 1],  // Entrada de Camisetas M
      [5, 30, 'entrada', 'Compra de fornecedor', 1],  // Entrada de Calças M
      [8, 20, 'entrada', 'Compra de fornecedor', 1],  // Entrada de Vestidos M
      [11, 25, 'entrada', 'Compra de fornecedor', 1], // Entrada de Blusas M
      [14, 15, 'entrada', 'Compra de fornecedor', 3], // Entrada de Vestidos Florais P
      [17, 18, 'entrada', 'Compra de fornecedor', 3], // Entrada de Vestidos Lisos M
      [20, 25, 'entrada', 'Compra de fornecedor', 3], // Entrada de Blusas Manga Longa M
      [23, 40, 'entrada', 'Compra de fornecedor', 3], // Entrada de Blusas Cropped M
      [26, 15, 'entrada', 'Compra de fornecedor', 3], // Entrada de Cintos M
      [29, 20, 'entrada', 'Compra de fornecedor', 3], // Entrada de Bonés M
      
      // Saídas
      [2, 5, 'saida', 'Ajuste de inventário', 1],     // Saída de Camisetas M
      [5, 3, 'saida', 'Produto danificado', 1]        // Saída de Calças M
    ];

    for (const [produto_id, quantidade, tipo, motivo, usuario_id] of movimentacoes) {
      await db.promiseRun(
        'INSERT INTO estoque_movimentacoes (produto_id, quantidade, tipo, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)',
        [produto_id, quantidade, tipo, motivo, usuario_id]
      );
    }

    // Reabilitar foreign keys
    await db.promiseRun('PRAGMA foreign_keys = ON');

    console.log('Seed concluído com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro durante o seed:', error);
    throw error;
  }
}

// Executar o seed se o arquivo for executado diretamente
if (require.main === module) {
  seed().then(() => {
    console.log('Processo de seed finalizado.');
    process.exit(0);
  }).catch((error) => {
    console.error('Falha no processo de seed:', error);
    process.exit(1);
  });
}

module.exports = seed;