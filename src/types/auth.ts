export interface User {
    user_id: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
}

export interface AuthContextType {
    user_id: string | null;
    username: string | null;
    email: string | null;
    role: string | null;
    isAuthenticated: boolean;
    device_id: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh_token: () => Promise<void>;
}
