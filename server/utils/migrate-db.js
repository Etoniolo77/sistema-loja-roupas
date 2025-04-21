const db = require('../database');

const migrateDatabase = async () => {
  console.log('Iniciando migração do banco de dados...');
  
  try {
    // Verifica se a tabela vendas existe e tem as colunas necessárias
    const vendasTableInfo = await db.promiseAll("PRAGMA table_info(vendas)");
    
    // Verifica se as colunas especificadas existem na tabela vendas
    const hasSubtotal = vendasTableInfo.some(col => col.name === 'subtotal');
    const hasDescontoPercentual = vendasTableInfo.some(col => col.name === 'desconto_percentual');
    const hasDescontoValor = vendasTableInfo.some(col => col.name === 'desconto_valor');
    const hasFormaPagamento = vendasTableInfo.some(col => col.name === 'forma_pagamento');
    
    // Adiciona a coluna subtotal se não existir
    if (!hasSubtotal) {
      console.log('Adicionando coluna subtotal...');
      await db.promiseRun('ALTER TABLE vendas ADD COLUMN subtotal REAL NOT NULL DEFAULT 0');
    }
    
    // Adiciona a coluna desconto_percentual se não existir
    if (!hasDescontoPercentual) {
      console.log('Adicionando coluna desconto_percentual...');
      await db.promiseRun('ALTER TABLE vendas ADD COLUMN desconto_percentual REAL DEFAULT 0');
    }
    
    // Adiciona a coluna desconto_valor se não existir
    if (!hasDescontoValor) {
      console.log('Adicionando coluna desconto_valor...');
      await db.promiseRun('ALTER TABLE vendas ADD COLUMN desconto_valor REAL DEFAULT 0');
    }
    
    // Adiciona a coluna forma_pagamento se não existir
    if (!hasFormaPagamento) {
      console.log('Adicionando coluna forma_pagamento...');
      await db.promiseRun('ALTER TABLE vendas ADD COLUMN forma_pagamento TEXT NOT NULL DEFAULT "especie"');
    }
    
    // Verifica se a coluna status da tabela vendas tem o valor 'pendente'
    try {
      const statusCheck = await db.promiseGet("SELECT sql FROM sqlite_master WHERE type='table' AND name='vendas'");
      if (statusCheck && !statusCheck.sql.includes("'pendente'")) {
        console.log('Atualizando constraints da coluna status para incluir pendente...');
        
        // Desabilitar temporariamente as foreign keys
        await db.promiseRun('PRAGMA foreign_keys = OFF;');
        
        // Verificar se a tabela temporária existe e removê-la se necessário
        await db.promiseRun(`DROP TABLE IF EXISTS vendas_temp;`);
        
        // Criar tabela temporária com a nova estrutura
        await db.promiseRun(`
          CREATE TABLE vendas_temp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            subtotal REAL NOT NULL DEFAULT 0,
            desconto_percentual REAL DEFAULT 0,
            desconto_valor REAL DEFAULT 0,
            valor_total REAL NOT NULL,
            forma_pagamento TEXT NOT NULL DEFAULT 'especie' 
              CHECK (forma_pagamento IN ('credito', 'debito', 'pix', 'crediario', 'cheque', 'especie')),
            status TEXT NOT NULL DEFAULT 'pendente' 
              CHECK (status IN ('pendente', 'concluida', 'cancelada')),
            usuario_id INTEGER NOT NULL,
            observacoes TEXT,
            data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
          );
        `);
        
        // Copiar dados da tabela original com valores padrão para campos obrigatórios
        // e garantir que as referências existam
        await db.promiseRun(`
          INSERT INTO vendas_temp (
            id,
            cliente_id,
            subtotal,
            desconto_percentual,
            desconto_valor,
            valor_total,
            forma_pagamento,
            status,
            usuario_id,
            observacoes,
            data
          ) 
          SELECT 
            v.id,
            CASE 
              WHEN c.id IS NULL THEN NULL 
              ELSE v.cliente_id 
            END as cliente_id,
            COALESCE(v.subtotal, v.valor_total) as subtotal,
            COALESCE(v.desconto_percentual, 0) as desconto_percentual,
            COALESCE(v.desconto_valor, 0) as desconto_valor,
            v.valor_total,
            COALESCE(v.forma_pagamento, 'especie') as forma_pagamento,
            COALESCE(v.status, 'concluida') as status,
            COALESCE(v.usuario_id, 1) as usuario_id,
            v.observacoes,
            v.data
          FROM vendas v
          LEFT JOIN clientes c ON v.cliente_id = c.id
          LEFT JOIN usuarios u ON v.usuario_id = u.id;
        `);
        
        // Remover tabela original
        await db.promiseRun(`DROP TABLE vendas;`);
        
        // Renomear tabela temporária
        await db.promiseRun(`ALTER TABLE vendas_temp RENAME TO vendas;`);
        
        // Reabilitar as foreign keys
        await db.promiseRun('PRAGMA foreign_keys = ON;');
        
        console.log('Tabela vendas recriada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao verificar ou modificar constraint de status:', error);
    }
    
    // Verifica se a tabela pagamentos existe
    const pagamentosExists = await db.promiseGet("SELECT name FROM sqlite_master WHERE type='table' AND name='pagamentos'");
    
    if (!pagamentosExists) {
      console.log('Criando tabela pagamentos...');
      await db.promiseRun(`
        CREATE TABLE pagamentos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          venda_id INTEGER NOT NULL,
          valor REAL NOT NULL,
          forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('credito', 'debito', 'pix', 'cheque', 'especie')),
          data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          observacoes TEXT,
          usuario_id INTEGER NOT NULL,
          FOREIGN KEY (venda_id) REFERENCES vendas(id),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
      `);
      console.log('Tabela pagamentos criada com sucesso!');
    }
    
    console.log('Migração concluída com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro durante a migração:', error);
    return false;
  }
};

module.exports = migrateDatabase;

// Se o script for executado diretamente
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('Script de migração finalizado.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Falha na migração:', error);
      process.exit(1);
    });
} 