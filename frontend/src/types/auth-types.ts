/**
 * Authentication types for SnowRail MVP
 */

export type AuthUser = {
  id: string;
  email: string;
  companyId: string;
};

export type Company = {
  id: string;
  legalName: string;
  tradeName?: string;
  country: string;
  kybLevel: number;
  kybStatus: string;
  railStatus: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
  company: Company;
};

export type SignupRequest = {
  email: string;
  password: string;
  companyLegalName: string;
  country?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};
