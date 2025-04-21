const db = require('../database');
const fs = require('fs');
const path = require('path');

/**
 * Inicializa as tabelas do sistema de crediário
 */
async function inicializarSistemaCrediario() {
  try {
    console.log('Inicializando sistema de crediário...');
    
    // Criar a tabela parcelas_crediario diretamente
    try {
      await db.promiseRun(`CREATE TABLE IF NOT EXISTS parcelas_crediario (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venda_id INTEGER NOT NULL,
        numero_parcela INTEGER NOT NULL,
        valor REAL NOT NULL,
        data_vencimento DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga', 'cancelada')),
        pagamento_id INTEGER,
        data_pagamento TIMESTAMP,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (venda_id) REFERENCES vendas(id),
        FOREIGN KEY (pagamento_id) REFERENCES pagamentos(id)
      )`);
      console.log('Tabela parcelas_crediario criada ou já existente');
    } catch (error) {
      console.error('Erro ao criar tabela parcelas_crediario:', error);
      throw error;
    }
    
    // Verificar e adicionar coluna numero_parcelas à tabela vendas
    try {
      const checkNumeroParcelasResult = await db.promiseGet("SELECT COUNT(*) AS column_exists FROM pragma_table_info('vendas') WHERE name='numero_parcelas'");
      if (checkNumeroParcelasResult.column_exists === 0) {
        await db.promiseRun("ALTER TABLE vendas ADD COLUMN numero_parcelas INTEGER DEFAULT 0");
        console.log('Coluna numero_parcelas adicionada à tabela vendas');
      } else {
        console.log('Coluna numero_parcelas já existe na tabela vendas');
      }
    } catch (error) {
      console.error('Erro ao verificar/adicionar coluna numero_parcelas:', error);
      throw error;
    }
    
    // Verificar e adicionar coluna data_primeira_parcela à tabela vendas
    try {
      const checkDataPrimeiraParcelaResult = await db.promiseGet("SELECT COUNT(*) AS column_exists FROM pragma_table_info('vendas') WHERE name='data_primeira_parcela'");
      if (checkDataPrimeiraParcelaResult.column_exists === 0) {
        await db.promiseRun("ALTER TABLE vendas ADD COLUMN data_primeira_parcela DATE");
        console.log('Coluna data_primeira_parcela adicionada à tabela vendas');
      } else {
        console.log('Coluna data_primeira_parcela já existe na tabela vendas');
      }
    } catch (error) {
      console.error('Erro ao verificar/adicionar coluna data_primeira_parcela:', error);
      throw error;
    }
    
    console.log('Sistema de crediário inicializado com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao inicializar sistema de crediário:', error);
    throw error;
  }
}

module.exports = inicializarSistemaCrediario;