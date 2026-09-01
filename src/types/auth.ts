export interface AuthUser {
  id: string;
  name: string;
  username?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
