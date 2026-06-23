/**
 * Supprime tous les comptes vendeur / boutiques de test en base MySQL.
 * Usage : node scripts/purge-test-vendors.js
 * (depuis auth-service/, avec .env configuré)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getMysqlPool } = require('../lib/mysqlPool');

const VENDOR_TABLES = [
  'messages_operateur_vendeur',
  'conversations_operateur_vendeur',
  'messages_ticket_support_vendeur',
  'tickets_support_vendeur',
  'notifications_vendeur',
  'lignes_commande_boutique',
  'historique_statut_commande',
  'demandes_retour_boutique',
  'commandes_boutique',
  'file_moderation_produits',
  'images_produit',
  'variantes_produit',
  'produits',
  'documents_conformite_boutique',
  'etapes_onboarding_boutique',
  'validations_onboarding_manuelles',
  'sante_compte_courant',
  'comptes_bancaires_boutique',
  'profils_livraison_boutique',
  'imports_catalogue_boutique',
  'campagnes_promotion_boutique',
  'historique_relectures_profil',
  'profils_vendeur',
  'boutiques',
  'comptes_vendeur'
];

async function main() {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();

  try {
    const [before] = await conn.query(
      'SELECT COUNT(*) AS c FROM comptes_vendeur'
    );
    console.log(`Vendeurs en base avant purge : ${before[0].c}`);

    await conn.beginTransaction();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of VENDOR_TABLES) {
      try {
        const [res] = await conn.query(`DELETE FROM \`${table}\``);
        if (res.affectedRows > 0) {
          console.log(`  ${table} : ${res.affectedRows} ligne(s) supprimée(s)`);
        }
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
          continue;
        }
        throw err;
      }
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.commit();

    const [after] = await conn.query('SELECT COUNT(*) AS c FROM comptes_vendeur');
    console.log(`Vendeurs restants : ${after[0].c}`);
    console.log('Purge terminée.');
  } catch (err) {
    await conn.rollback();
    console.error('Échec purge :', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
