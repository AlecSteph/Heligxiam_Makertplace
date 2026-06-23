/** Politique mot de passe alignée frontend / backend */
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

const PASSWORD_HINT =
  'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre (underscore et symboles autorisés).';

function validatePassword(password) {
  if (typeof password !== 'string') return false;
  const len = password.length;
  if (len < MIN_LENGTH || len > MAX_LENGTH) return false;
  return /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

module.exports = {
  MIN_LENGTH,
  MAX_LENGTH,
  PASSWORD_HINT,
  validatePassword
};
