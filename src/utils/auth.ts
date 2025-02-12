import { User } from '@/types/auth';

export async function fetchUser(): Promise<User> {
    const response = await fetch('/api/auth/me');
    if (!response.ok) throw new Error('Unauthorized');
    return response.json();
} 