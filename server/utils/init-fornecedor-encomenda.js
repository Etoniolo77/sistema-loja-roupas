const fs = require('fs');
const path = require('path');
const db = require('../database');

/**
 * Verifica se uma coluna existe em uma tabela
 */
async function colunaExiste(tabela, coluna) {
  try {
    const result = await db.promiseAll(`PRAGMA table_info(${tabela})`);
    return result.some(col => col.name === coluna);
  } catch (error) {
    console.error(`Erro ao verificar se a coluna ${coluna} existe na tabela ${tabela}:`, error);
    return false;
  }
}

/**
 * Inicializa as tabelas de fornecedores e encomendas
 */
async function inicializarFornecedorEncomenda() {
  try {
    // Lê o arquivo SQL com as definições das tabelas
    const schemaPath = path.join(__dirname, '..', 'db', 'fornecedor-encomenda-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Verifica se as colunas já existem nas tabelas
    const fornecedorIdExiste = await colunaExiste('produtos', 'fornecedor_id');
    const cpfExiste = await colunaExiste('clientes', 'cpf');
    const dataNascimentoExiste = await colunaExiste('clientes', 'data_nascimento');
    const enderecoExiste = await colunaExiste('clientes', 'endereco');
    
    // Divide o arquivo em comandos SQL individuais
    const sqlCommands = [];
    let currentCommand = '';
    let inTrigger = false;
    let skipCommand = false;
    
    // Divide o arquivo linha por linha
    const lines = schemaSql.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Verifica se a linha atual contém comandos que adicionam colunas que já existem
      if (trimmedLine.includes('ALTER TABLE produtos ADD COLUMN fornecedor_id') && fornecedorIdExiste ||
          trimmedLine.includes('ALTER TABLE produtos ADD FOREIGN KEY (fornecedor_id)') && fornecedorIdExiste ||
          trimmedLine.includes('ALTER TABLE clientes ADD COLUMN cpf') && cpfExiste ||
          trimmedLine.includes('ALTER TABLE clientes ADD COLUMN data_nascimento') && dataNascimentoExiste ||
          trimmedLine.includes('ALTER TABLE clientes ADD COLUMN endereco') && enderecoExiste) {
        // Se a linha atual inicia um comando ALTER TABLE que deve ser pulado, marcamos para pular
        if (!currentCommand.trim()) {
          skipCommand = true;
        }
        continue;
      }
      
      // Se estamos pulando o comando atual, verificamos se chegamos ao final dele
      if (skipCommand && trimmedLine.endsWith(';')) {
        skipCommand = false;
        continue;
      }
      
      // Se estamos pulando o comando atual, continuamos sem adicionar a linha
      if (skipCommand) {
        continue;
      }
      
      // Adiciona a linha atual ao comando em construção
      currentCommand += line + '\n';
      
      // Verifica se estamos entrando em um bloco BEGIN...END
      if (trimmedLine.includes('BEGIN')) {
        inTrigger = true;
      }
      
      // Verifica se estamos saindo de um bloco BEGIN...END
      if (trimmedLine === 'END;') {
        inTrigger = false;
      }
      
      // Se encontramos um ponto e vírgula e não estamos dentro de um trigger,
      // consideramos que é o fim de um comando
      if (trimmedLine.endsWith(';') && !inTrigger && trimmedLine !== 'END;') {
        sqlCommands.push(currentCommand.trim());
        currentCommand = '';
      }
    }
    
    // Adiciona o último comando se houver algum
    if (currentCommand.trim()) {
      sqlCommands.push(currentCommand.trim());
    }
    
    // Filtra comandos vazios
    const filteredCommands = sqlCommands.filter(cmd => cmd.trim() !== '');
    
    console.log(`Executando ${filteredCommands.length} comandos SQL do schema de fornecedores e encomendas...`);
    
    // Executa cada comando SQL
    for (const cmd of filteredCommands) {
      try {
        await db.promiseRun(cmd);
      } catch (cmdError) {
        console.error('Erro ao executar comando SQL:', cmdError);
        console.error('Comando problemático:', cmd);
        throw cmdError;
      }
    }
    
    // Adiciona a coluna fornecedor_id e a foreign key se ainda não existirem
    if (!fornecedorIdExiste) {
      try {
        await db.promiseRun('ALTER TABLE produtos ADD COLUMN fornecedor_id INTEGER');
        await db.promiseRun('ALTER TABLE produtos ADD FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)');
        console.log('Coluna fornecedor_id adicionada à tabela produtos');
      } catch (error) {
        console.warn('Aviso: Não foi possível adicionar a coluna fornecedor_id:', error.message);
      }
    } else {
      console.log('Coluna fornecedor_id já existe na tabela produtos');
    }
    
    console.log('Tabelas de fornecedores e encomendas inicializadas com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao inicializar tabelas de fornecedores e encomendas:', error);
    throw error;
  }
}

module.exports = inicializarFornecedorEncomenda;