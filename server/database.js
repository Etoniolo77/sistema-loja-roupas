const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Caminho para o arquivo do banco de dados
const dbPath = path.resolve(__dirname, 'database.sqlite');

// Verifica se o banco de dados já existe
const dbExists = fs.existsSync(dbPath);

// Cria uma nova instância do banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
    process.exit(1);
  }
  console.log('Conectado ao banco de dados SQLite');
});

// Configuração do banco de dados para usar promises
db.promiseGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function(err, result) {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

db.promiseRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
};

db.promiseAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function(err, result) {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

// Adiciona suporte a transações
db.beginTransaction = () => {
  return db.promiseRun('BEGIN TRANSACTION');
};

db.commit = () => {
  return db.promiseRun('COMMIT');
};

db.rollback = () => {
  return db.promiseRun('ROLLBACK');
};

// Habilita as foreign keys
db.run('PRAGMA foreign_keys = ON');

module.exports = db;