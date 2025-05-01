const db = require('../database');
const fs = require('fs');
const path = require('path');

/**
 * Inicializa as tabelas de devoluções e créditos
 */
async function initReturnsSystem() {
  try {
    console.log('Inicializando sistema de devoluções e créditos...');
    
    // Lê o arquivo SQL com as definições das tabelas
    const returnsSchemaPath = path.join(__dirname, '..', 'db', 'returns-schema.sql');
    const returnsSchemaSql = fs.readFileSync(returnsSchemaPath, 'utf8');
    
    // Divide o arquivo em comandos SQL individuais
    // Método mais simples e robusto para dividir os comandos SQL
    const sqlCommands = [];
    let currentCommand = '';
    let inTrigger = false;
    
    // Divide o arquivo linha por linha
    const lines = returnsSchemaSql.split('\n');
    
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
    const finalCommands = sqlCommands.filter(cmd => cmd.trim() !== '');
    
    console.log(`Executando ${finalCommands.length} comandos SQL do schema de devoluções...`);
    
    // Executa cada comando SQL
    for (const cmd of finalCommands) {
      try {
        await db.promiseRun(cmd + ';');
      } catch (cmdError) {
        console.error('Erro ao executar comando SQL de devoluções:', cmdError);
        console.error('Comando problemático:', cmd);
        throw cmdError;
      }
    }
    
    console.log('✓ Sistema de devoluções e créditos inicializado com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar sistema de devoluções:', error);
    throw error;
  }
}

module.exports = initReturnsSystem;