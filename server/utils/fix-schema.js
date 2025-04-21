const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

// Connect to the database
const db = new sqlite3.Database(path.join(__dirname, '../database.sqlite'));

console.log('Starting database schema fix...');

// Function to run SQL as a promise
function runSQL(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

// Function to check if vendas table has the correct status constraint
async function checkVendasTable() {
  return new Promise((resolve, reject) => {
    db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='vendas'", (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!row) {
        reject(new Error('Vendas table not found'));
        return;
      }
      
      const sql = row.sql;
      console.log('Current vendas table definition:', sql);
      
      // Check if the status constraint includes 'pendente'
      const hasPendente = sql.includes("status IN ('pendente'") || 
                         sql.includes("status IN ('concluida', 'cancelada', 'pendente'") || 
                         sql.includes("status IN ('pendente', 'concluida', 'cancelada'");
      
      resolve(hasPendente);
    });
  });
}

// Function to fix the vendas table schema
async function fixVendasTable() {
  try {
    // Check if the table needs fixing
    const hasPendente = await checkVendasTable();
    
    if (hasPendente) {
      console.log('Vendas table already has correct status constraint. No fix needed.');
      return;
    }
    
    console.log('Fixing vendas table schema to include "pendente" status...');
    
    // Create a new table with the correct schema
    await runSQL(`
      PRAGMA foreign_keys = OFF;
      
      BEGIN TRANSACTION;
      
      -- Create new table with correct schema
      CREATE TABLE vendas_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        subtotal REAL NOT NULL DEFAULT 0,
        desconto_percentual REAL DEFAULT 0,
        desconto_valor REAL DEFAULT 0,
        valor_total REAL NOT NULL,
        forma_pagamento TEXT NOT NULL DEFAULT 'especie' CHECK (forma_pagamento IN ('credito', 'debito', 'pix', 'crediario', 'cheque', 'especie')),
        status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida', 'cancelada')),
        usuario_id INTEGER NOT NULL,
        observacoes TEXT,
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      );
      
      -- Copy data from old table to new table
      INSERT INTO vendas_new SELECT * FROM vendas;
      
      -- Drop old table
      DROP TABLE vendas;
      
      -- Rename new table to original name
      ALTER TABLE vendas_new RENAME TO vendas;
      
      COMMIT;
      
      PRAGMA foreign_keys = ON;
    `);
    
    console.log('Vendas table schema successfully updated to include "pendente" status!');
  } catch (error) {
    console.error('Error fixing vendas table:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    await fixVendasTable();
    console.log('Database schema fix completed successfully!');
  } catch (error) {
    console.error('Error during database schema fix:', error);
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the main function
main();