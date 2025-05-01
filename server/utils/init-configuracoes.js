const db = require('../database');

/**
 * Inicializa a tabela de configurações do sistema
 */
async function inicializarConfiguracoes() {
  try {
    console.log('Inicializando tabela de configurações...');
    
    // Criar a tabela configuracoes se não existir
    try {
      await db.promiseRun(`CREATE TABLE IF NOT EXISTS configuracoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_loja TEXT DEFAULT 'Dalô Modas',
        endereco TEXT DEFAULT 'Rua Exemplo, 123',
        telefone TEXT DEFAULT '(11) 99999-9999',
        email TEXT DEFAULT 'contato@dalomodas.com',
        instagram TEXT DEFAULT '@dalomodas',
        whatsapp TEXT DEFAULT '(11) 99999-9999',
        tema_cor_primaria TEXT DEFAULT '#3f51b5',
        tema_cor_secundaria TEXT DEFAULT '#f50057',
        mostrar_estoque_baixo INTEGER DEFAULT 1,
        limite_estoque_baixo INTEGER DEFAULT 5,
        permitir_venda_sem_estoque INTEGER DEFAULT 0,
        dias_vencimento_crediario INTEGER DEFAULT 30,
        markup REAL DEFAULT 2.0,
        tema TEXT DEFAULT 'padrão',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      console.log('Tabela configuracoes criada ou já existente');
      
      // Verificar se já existem configurações
      const configExistente = await db.promiseGet('SELECT COUNT(*) as count FROM configuracoes');
      
      // Se não existir nenhuma configuração, insere a configuração padrão
      if (!configExistente || configExistente.count === 0) {
        await db.promiseRun(`INSERT INTO configuracoes (
          nome_loja, endereco, telefone, email, instagram, whatsapp,
          tema_cor_primaria, tema_cor_secundaria, mostrar_estoque_baixo,
          limite_estoque_baixo, permitir_venda_sem_estoque, dias_vencimento_crediario,
          markup, tema
        ) VALUES (
          'Dalô Modas', 'Rua Exemplo, 123', '(11) 99999-9999', 'contato@dalomodas.com',
          '@dalomodas', '(11) 99999-9999', '#3f51b5', '#f50057', 1, 5, 0, 30, 2.0, 'padrão'
        )`);
        console.log('Configurações padrão inseridas com sucesso');
      } else {
        console.log('Configurações já existem no banco de dados');
      }
    } catch (error) {
      console.error('Erro ao criar tabela configuracoes:', error);
      throw error;
    }
    
    console.log('Inicialização da tabela de configurações concluída com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao inicializar tabela de configurações:', error);
    throw error;
  }
}

module.exports = inicializarConfiguracoes;