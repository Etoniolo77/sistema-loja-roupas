const db = require('../database');
const fs = require('fs');
const path = require('path');

/**
 * Inicializa as tabelas de inventário no banco de dados
 */
async function inicializarTabelasInventario() {
  try {
    console.log('Verificando tabelas de inventário...');
    
    // Verifica se a tabela inventarios já existe
    const tabelaExiste = await db.promiseGet(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='inventarios'"
    );
    
    if (!tabelaExiste) {
      console.log('Criando tabelas de inventário...');
      
      // Lê o arquivo SQL com o schema das tabelas de inventário
      const schemaSQL = fs.readFileSync(
        path.join(__dirname, '..', 'db', 'inventory-schema.sql'),
        'utf8'
      );
      
      // Divide o arquivo em comandos SQL individuais e executa cada um
      const comandos = schemaSQL
        .split(';')
        .filter(cmd => cmd.trim() !== '');
      
      for (const comando of comandos) {
        await db.promiseRun(comando);
      }
      
      console.log('✓ Tabelas de inventário criadas com sucesso!');
    } else {
      console.log('✓ Tabelas de inventário já existem.');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao inicializar tabelas de inventário:', error);
    throw error;
  }
}

module.exports = inicializarTabelasInventario;