require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getMysqlPool } = require('../lib/mysqlPool');
const {
  listProductPromotionsForBoutique,
  listCouponsForBoutique
} = require('../lib/sellerPromotionsMysql');

(async () => {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT b.identifiant FROM boutiques b
     JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
     WHERE c.courriel LIKE 'vendeur.techstore-pro%'
     LIMIT 1`
  );
  const boutiqueId = rows[0].identifiant;
  const coupons = await listCouponsForBoutique(boutiqueId);
  const promos = await listProductPromotionsForBoutique(boutiqueId);
  console.log('OK coupons:', coupons.length, 'promos:', promos.length);
  await pool.end();
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
