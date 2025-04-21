const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/database.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Error querying database:', err);
    process.exit(1);
  }
  
  console.log('Tables in database:');
  tables.forEach(table => console.log(table.name));
  
  // Check specifically for returns system tables
  const returnsTables = ['devolucoes', 'devolucao_itens', 'creditos_cliente', 'uso_creditos'];
  const missingTables = returnsTables.filter(tableName => 
    !tables.some(table => table.name === tableName)
  );
  
  if (missingTables.length > 0) {
    console.log('\nMissing returns system tables:', missingTables.join(', '));
  } else {
    console.log('\nAll returns system tables are present.');
  }
  
  db.close();
});