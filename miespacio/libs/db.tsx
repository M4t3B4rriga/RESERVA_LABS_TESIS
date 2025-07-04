import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'swmiespacio',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 50,
});

export default pool;