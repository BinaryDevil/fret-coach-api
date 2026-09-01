import { OAuth2Client } from 'google-auth-library';
import { AuthService } from './auth.service';

describe('AuthService Google sign-in', () => {
  afterEach(() => jest.restoreAllMocks());

  it('verifies the Google ID token and links a verified email to an existing account', async () => {
    jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'google-subject-1',
        email: 'learner@example.com',
        email_verified: true,
        name: 'Learner',
      }),
    } as never);
    const linkedUser = {
      id: 'user-1',
      email: 'learner@example.com',
      passwordHash: 'hash',
      googleSubject: 'google-subject-1',
      displayName: 'Learner',
      handedness: 'RIGHT',
      tuning: 'E2,A2,D3,G3,B3,E4',
      timezone: 'UTC',
      refreshTokenHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const update = jest.fn().mockResolvedValue(linkedUser);
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ ...linkedUser, googleSubject: null }),
        update,
      },
    };
    const jwt = {
      signAsync: jest.fn().mockResolvedValueOnce('access').mockResolvedValueOnce('refresh'),
    };
    const config = {
      get: jest.fn().mockReturnValue('client-id.apps.googleusercontent.com'),
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_ACCESS_TTL: '15m',
          JWT_REFRESH_TTL: '30d',
        };
        return values[key];
      }),
    };
    const service = new AuthService(prisma as never, jwt as never, config as never);

    await expect(service.loginWithGoogle('valid-google-id-token')).resolves.toMatchObject({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: { id: 'user-1', email: 'learner@example.com' },
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ googleSubject: 'google-subject-1' }),
      }),
    );
  });
});
