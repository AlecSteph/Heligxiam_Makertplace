const mysql = require('mysql2/promise');

let pool = null;

/**
 * Pool MySQL optionnel : activé si MYSQL_HOST est défini.
 * Utilisé pour persister documents KYC et messagerie tickets vendeur.
 */
function getMysqlPool() {
  if (!process.env.MYSQL_HOST) {
    return null;
  }
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'heligxiam_marketplace',
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false
    });
  }
  return pool;
}

function isMysqlEnabled() {
  return !!process.env.MYSQL_HOST;
}

module.exports = { getMysqlPool, isMysqlEnabled };
