import { authConfig } from '@/config/auth';

export async function login(identifier: string, password: string) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  if (
    identifier === authConfig.demoUser.identifier &&
    password === authConfig.demoUser.password
  ) {
    return {
      user: {
        id: '1',
        name: 'Demo User',
        email: identifier,
      },
    };
  }

  throw new Error('Invalid credentials');
}
