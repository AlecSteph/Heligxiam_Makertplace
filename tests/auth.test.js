const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const database = require('../config/database');
const { ProofOfWork, validatePassword, getPasswordStrength } = require('../utils/security');

describe('Auth Service', () => {
  let testUser;
  let adminUser;
  let testApp;

  beforeAll(async () => {
    // Connexion à la base de données de test
    await database.testConnection();

    // Créer des utilisateurs de test
    testUser = await User.create({
      nom: 'Test',
      prenom: 'User',
      email: 'test@example.com',
      password: 'TestPassword123!',
      role: 'client'
    });

    adminUser = await User.create({
      nom: 'Admin',
      prenom: 'User',
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      role: 'admin'
    });

    testApp = request(app);
  });

  afterAll(async () => {
    // Nettoyer les utilisateurs de test
    if (testUser) await User.delete(testUser.id_user);
    if (adminUser) await User.delete(adminUser.id_user);

    // Fermer la connexion à la base de données
    await database.close();
  });

  describe('Health Check', () => {
    test('GET /health should return service health', async () => {
      const response = await testApp.get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Auth service is healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Proof of Work', () => {
    test('GET /api/auth/challenge should return a challenge', async () => {
      const response = await testApp.get('/api/auth/challenge');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('challenge');
      expect(response.body).toHaveProperty('difficulty');
      expect(typeof response.body.challenge).toBe('string');
      expect(response.body.difficulty).toBeGreaterThan(0);
    });

    test('ProofOfWork class should generate and verify challenges', () => {
      const pow = new ProofOfWork(2);
      const challenge = pow.generateChallenge();

      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(0);

      // Trouver un nonce valide
      let nonce = 0;
      let found = false;
      while (!found && nonce < 10000) {
        if (pow.verifyProof(challenge, nonce.toString())) {
          found = true;
        }
        nonce++;
      }

      expect(found).toBe(true);
    });
  });

  describe('Password Validation', () => {
    test('validatePassword should accept strong passwords', () => {
      expect(validatePassword('StrongPass123!')).toBe(true);
      expect(validatePassword('AnotherValid9$')).toBe(true);
    });

    test('validatePassword should reject weak passwords', () => {
      expect(validatePassword('weak')).toBe(false);
      expect(validatePassword('12345678')).toBe(false);
      expect(validatePassword('password')).toBe(false);
      expect(validatePassword('PASSWORD123')).toBe(false);
    });

    test('getPasswordStrength should return correct strength', () => {
      expect(getPasswordStrength('Weak')).toBe('faible');
      expect(getPasswordStrength('Medium123')).toBe('moyen');
      expect(getPasswordStrength('StrongPassword123!@#')).toBe('fort');
    });

    test('password hashing should include pepper', async () => {
      // Temporarily set pepper
      process.env.PEPPER = 'pepper123';
      const raw = 'MySecret!';
      const user = await User.create({
        nom: 'Pepper',
        prenom: 'Test',
        email: 'pepper@example.com',
        password: raw,
        role: 'client'
      });
      const hashWithPepper = user.password_hash;

      // Changing pepper should break comparison
      process.env.PEPPER = 'other';
      const checkWrong = await user.checkPassword(raw);
      expect(checkWrong).toBe(false);

      // restore correct pepper
      process.env.PEPPER = 'pepper123';
      const checkRight = await user.checkPassword(raw);
      expect(checkRight).toBe(true);

      await User.delete(user.id_user);
    });
  });

  describe('User Registration', () => {
    test('POST /api/auth/register should create a new user', async () => {
      const pow = new ProofOfWork(2);
      const challenge = pow.generateChallenge();

      // Trouver un nonce valide
      let nonce = 0;
      while (!pow.verifyProof(challenge, nonce.toString()) && nonce < 10000) {
        nonce++;
      }

      const userData = {
        nom: 'New',
        prenom: 'User',
        email: 'newuser@example.com',
        password: 'NewPassword123!',
        role: 'client',
        challenge,
        nonce: nonce.toString()
      };

      const response = await testApp
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Utilisateur créé avec succès');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('passwordStrength');

      // Nettoyer l'utilisateur créé
      if (response.body.data.user.id_user) {
        await User.delete(response.body.data.user.id_user);
      }
    });

    test('POST /api/auth/register should reject invalid proof of work', async () => {
      const userData = {
        nom: 'Test',
        prenom: 'User',
        email: 'invalid@example.com',
        password: 'TestPassword123!',
        challenge: 'invalid_challenge',
        nonce: '0'
      };

      const response = await testApp
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Preuve de travail invalide');
    });

    test('POST /api/auth/register should reject duplicate email', async () => {
      const pow = new ProofOfWork(2);
      const challenge = pow.generateChallenge();

      let nonce = 0;
      while (!pow.verifyProof(challenge, nonce.toString()) && nonce < 10000) {
        nonce++;
      }

      const userData = {
        nom: 'Duplicate',
        prenom: 'User',
        email: 'test@example.com', // Email déjà utilisé
        password: 'DuplicatePassword123!',
        challenge,
        nonce: nonce.toString()
      };

      const response = await testApp
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cet email est déjà utilisé');
    });
  });

  describe('User Login', () => {
    test('POST /api/auth/login should authenticate valid user', async () => {
      const pow = new ProofOfWork(2);
      const challenge = pow.generateChallenge();

      let nonce = 0;
      while (!pow.verifyProof(challenge, nonce.toString()) && nonce < 10000) {
        nonce++;
      }

      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        challenge,
        nonce: nonce.toString()
      };

      const response = await testApp
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Connexion réussie');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    test('POST /api/auth/login should reject invalid credentials', async () => {
      const pow = new ProofOfWork(2);
      const challenge = pow.generateChallenge();

      let nonce = 0;
      while (!pow.verifyProof(challenge, nonce.toString()) && nonce < 10000) {
        nonce++;
      }

      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
        challenge,
        nonce: nonce.toString()
      };

      const response = await testApp
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email ou mot de passe incorrect');
    });
  });

  describe('Protected Routes', () => {
    let userToken;
    let adminToken;

    beforeAll(async () => {
      // Générer des tokens pour les tests
      userToken = jwt.sign(
        { userId: testUser.id_user, role: testUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      adminToken = jwt.sign(
        { userId: adminUser.id_user, role: adminUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('GET /api/auth/profile should return user profile', async () => {
      const response = await testApp
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id_user', testUser.id_user);
      expect(response.body.data).toHaveProperty('email', testUser.email);
    });

    test('GET /api/auth/profile should reject invalid token', async () => {
      const response = await testApp
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('PUT /api/auth/profile should update user profile', async () => {
      const updateData = {
        nom: 'Updated',
        prenom: 'Name'
      };

      const response = await testApp
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nom).toBe('Updated');
      expect(response.body.data.prenom).toBe('Name');
    });

    test('PUT /api/auth/change-password should change password', async () => {
      const changeData = {
        currentPassword: 'TestPassword123!',
        newPassword: 'NewTestPassword123!'
      };

      const response = await testApp
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(changeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mot de passe changé avec succès');

      // Vérifier que le nouveau mot de passe fonctionne
      const user = await User.findById(testUser.id_user);
      const isValid = await user.checkPassword('NewTestPassword123!');
      expect(isValid).toBe(true);
    });
  });

  describe('Admin Routes', () => {
    let adminToken;

    beforeAll(async () => {
      adminToken = jwt.sign(
        { userId: adminUser.id_user, role: adminUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('GET /api/auth/users should return users list for admin', async () => {
      const response = await testApp
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    test('GET /api/auth/users should reject non-admin access', async () => {
      const userToken = jwt.sign(
        { userId: testUser.id_user, role: testUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await testApp
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should handle rate limiting for auth endpoints', async () => {
      const pow = new ProofOfWork(2);
      const challenge = pow.generateChallenge();

      let nonce = 0;
      while (!pow.verifyProof(challenge, nonce.toString()) && nonce < 10000) {
        nonce++;
      }

      // Faire plusieurs tentatives de connexion avec de mauvais credentials
      const attempts = [];
      for (let i = 0; i < 6; i++) {
        attempts.push(
          testApp
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'WrongPassword',
              challenge,
              nonce: nonce.toString()
            })
        );
      }

      const responses = await Promise.all(attempts);

      // Au moins une des réponses devrait être un rate limit
      const rateLimitedResponse = responses.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown routes', async () => {
      const response = await testApp.get('/api/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Route non trouvée');
    });

    test('should handle malformed JSON', async () => {
      const response = await testApp
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });
});