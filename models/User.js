const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(data) {
    this.id_user = data.id_user;
    this.nom = data.nom;
    this.prenom = data.prenom;
    this.role = data.role || 'client';
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Créer un nouvel utilisateur
  static async create(userData) {
    const { nom, prenom, email, password, role = 'client' } = userData;

    // Combiner le mot de passe avec le 'pepper' secret avant de hasher.
    // Le pepper est une valeur globale stockée dans l'environnement et
    // jamais enregistrée en base. Il renforce la sécurité en plus du sel
    // unique généré par bcrypt.
    const pepper = process.env.PEPPER || '';
    const toHash = password + pepper;

    // Hash du mot de passe (bcrypt gère le sel internement)
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(toHash, saltRounds);

    const queryText = `
      INSERT INTO "Utilisateur" (nom, prenom, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    try {
      const result = await query(queryText, [nom, prenom, email, password_hash, role]);
      return new User(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Violation de contrainte unique
        throw new Error('Email déjà utilisé');
      }
      throw error;
    }
  }

  // Trouver un utilisateur par email
  static async findByEmail(email) {
    const queryText = `SELECT * FROM "Utilisateur" WHERE email = $1`;
    const result = await query(queryText, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return new User(result.rows[0]);
  }

  // Trouver un utilisateur par ID
  static async findById(id_user) {
    const queryText = `SELECT * FROM "Utilisateur" WHERE id_user = $1`;
    const result = await query(queryText, [id_user]);

    if (result.rows.length === 0) {
      return null;
    }

    return new User(result.rows[0]);
  }

  // Vérifier le mot de passe
  async checkPassword(password) {
    const pepper = process.env.PEPPER || '';
    const toCheck = password + pepper;
    return await bcrypt.compare(toCheck, this.password_hash);
  }

  // Mettre à jour le mot de passe
  static async updatePassword(id_user, newPassword) {
    const pepper = process.env.PEPPER || '';
    const toHash = newPassword + pepper;
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(toHash, saltRounds);

    const queryText = `
      UPDATE "Utilisateur"
      SET password_hash = $1, updated_at = NOW()
      WHERE id_user = $2
      RETURNING *
    `;

    const result = await query(queryText, [password_hash, id_user]);

    if (result.rows.length === 0) {
      throw new Error('Utilisateur non trouvé');
    }

    return new User(result.rows[0]);
  }

  // Obtenir le profil utilisateur avec adresses
  static async getProfile(id_user) {
    const queryText = `
      SELECT
        u.*,
        json_agg(
          json_build_object(
            'id_adresse', a.id_adresse,
            'rue', a.rue,
            'ville', a.ville,
            'code_postal', a.code_postal,
            'pays', a.pays,
            'is_principale', a.is_principale
          )
        ) FILTER (WHERE a.id_adresse IS NOT NULL) as adresses
      FROM "Utilisateur" u
      LEFT JOIN "Adresse" a ON u.id_user = a.id_user
      WHERE u.id_user = $1
      GROUP BY u.id_user
    `;

    const result = await query(queryText, [id_user]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  // Mettre à jour le profil
  static async updateProfile(id_user, updateData) {
    const { nom, prenom, email } = updateData;

    const queryText = `
      UPDATE "Utilisateur"
      SET nom = $1, prenom = $2, email = $3, updated_at = NOW()
      WHERE id_user = $4
      RETURNING *
    `;

    try {
      const result = await query(queryText, [nom, prenom, email, id_user]);

      if (result.rows.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }

      return new User(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('Email déjà utilisé');
      }
      throw error;
    }
  }

  // Supprimer un utilisateur (soft delete si nécessaire)
  static async delete(id_user) {
    const queryText = `DELETE FROM "Utilisateur" WHERE id_user = $1`;
    const result = await query(queryText, [id_user]);
    return result.rowCount > 0;
  }

  // Lister tous les utilisateurs (admin seulement)
  static async findAll(limit = 50, offset = 0) {
    const queryText = `
      SELECT id_user, nom, prenom, email, role, created_at
      FROM "Utilisateur"
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await query(queryText, [limit, offset]);
    return result.rows.map(row => new User(row));
  }

  // Compter le nombre total d'utilisateurs
  static async count() {
    const result = await query('SELECT COUNT(*) as total FROM "Utilisateur"');
    return parseInt(result.rows[0].total);
  }

  // Mettre à jour le rôle d'un utilisateur
  static async updateRole(id_user, role) {
    const queryText = `
      UPDATE "Utilisateur"
      SET role = $1, updated_at = NOW()
      WHERE id_user = $2
      RETURNING *
    `;

    const result = await query(queryText, [role, id_user]);

    if (result.rows.length === 0) {
      throw new Error('Utilisateur non trouvé');
    }

    return new User(result.rows[0]);
  }

  // Méthode toJSON pour la réponse API
  toJSON() {
    return {
      id_user: this.id_user,
      nom: this.nom,
      prenom: this.prenom,
      role: this.role,
      email: this.email,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = User;