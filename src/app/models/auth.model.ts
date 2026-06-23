export interface User {
  id_user: string;
  nom: string;
  prenom: string;
  role: 'client' | 'vendeur' | 'admin';
  email: string;
  created_at: string;
  updated_at: string;
  /** Renseignés pour un vendeur persisté en MySQL (auth-service). */
  identifiant_boutique?: number;
  identifiant_vendeur?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
    refreshToken: string;
    passwordStrength?: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
  recaptchaToken?: string;
}

export interface RegisterRequest {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role?: 'client' | 'vendeur';
  recaptchaToken?: string;
}

export interface ChallengeResponse {
  success: boolean;
  challenge: string;
  difficulty: number;
}

export interface ProfileUpdateRequest {
  nom?: string;
  prenom?: string;
  email?: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
  recaptchaToken?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export enum UserRole {
  CLIENT = 'client',
  VENDEUR = 'vendeur',
  ADMIN = 'admin'
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}
