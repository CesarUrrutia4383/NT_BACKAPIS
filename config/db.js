const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

let pool;

try {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER_INV,
    password: process.env.DB_PASSWORD_INV,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: true
    } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Verificar la conexión
  pool.getConnection()
    .then(connection => {
      console.log('Database connection successful');
      connection.release();
    })
    .catch(err => {
      console.error('Error connecting to the database:', err);
    });

} catch (error) {
  console.error('Error creating database pool:', error);
  pool = null;
}

module.exports = { 
  pool,
  isConnected: () => pool !== null
};