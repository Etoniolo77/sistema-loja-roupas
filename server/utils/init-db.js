const fs = require('fs');
const path = require('path');
const db = require('../database');
const initReturnsSystem = require('./init-returns');
const inicializarTabelasInventario = require('./init-inventory');
const inicializarFornecedorEncomenda = require('./init-fornecedor-encomenda');
const inicializarConfiguracoes = require('./init-configuracoes');
const inicializarSistemaCrediario = require('./init-crediario');

/**
 * Inicializa o banco de dados com as tabelas necessárias
 */
async function inicializarBancoDados() {
  try {
    // Lê o arquivo SQL com as definições das tabelas
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Divide o arquivo em comandos SQL individuais
    // Método mais simples e robusto para dividir os comandos SQL
    const sqlCommands = [];
    let currentCommand = '';
    let inTrigger = false;
    
    // Divide o arquivo linha por linha
    const lines = schemaSql.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
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
    
    console.log(`Executando ${filteredCommands.length} comandos SQL do schema principal...`);
    
    // Executa cada comando SQL
    for (const cmd of filteredCommands) {
      try {
        await db.promiseRun(cmd + ';');
      } catch (cmdError) {
        console.error('Erro ao executar comando SQL:', cmdError);
        console.error('Comando problemático:', cmd);
        throw cmdError;
      }
    }
    
    // Inicializa o sistema de devoluções e créditos
    await initReturnsSystem();
    
    // Inicializa as tabelas de inventário
    await inicializarTabelasInventario();
    
    // Inicializa as tabelas de fornecedores e encomendas
    await inicializarFornecedorEncomenda();
    
    // Inicializa a tabela de configurações
    await inicializarConfiguracoes();
    
    // Inicializa o sistema de crediário
    await inicializarSistemaCrediario();
    
    return true;
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

module.exports = inicializarBancoDados;