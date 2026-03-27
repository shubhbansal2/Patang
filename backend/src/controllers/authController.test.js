import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRes } from '../test/helpers.js';

const {
  userFindOneMock,
  userCreateMock,
  sendEmailMock,
  generateTokenMock,
} = vi.hoisted(() => ({
  userFindOneMock: vi.fn(),
  userCreateMock: vi.fn(),
  sendEmailMock: vi.fn(),
  generateTokenMock: vi.fn(() => 'jwt-token'),
}));

vi.mock('../models/User.js', () => ({
  default: {
    findOne: userFindOneMock,
    create: userCreateMock,
  },
}));

vi.mock('../utils/sendEmail.js', () => ({
  default: sendEmailMock,
}));

vi.mock('../utils/generateToken.js', () => ({
  default: generateTokenMock,
}));

import {
  forgotPassword,
  loginUser,
  registerUser,
  resetPassword,
  verifyOtp,
} from './authController.js';

describe('authController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects registration for non-IITK emails', async () => {
    const req = {
      body: {
        name: 'Aarya',
        email: 'aarya@gmail.com',
        password: 'password123',
        confirmPassword: 'password123',
      },
    };
    const res = createMockRes();

    await registerUser(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid domain. Institute email (@iitk.ac.in) required.' });
    expect(userFindOneMock).not.toHaveBeenCalled();
  });

  it('registers a new user and sends an activation email', async () => {
    userFindOneMock.mockResolvedValueOnce(null);
    userCreateMock.mockResolvedValueOnce({
      _id: 'user-1',
      email: 'aarya@iitk.ac.in',
    });

    const req = {
      body: {
        name: 'Aarya',
        email: 'aarya@iitk.ac.in',
        password: 'password123',
        confirmPassword: 'password123',
      },
    };
    const res = createMockRes();

    await registerUser(req, res);

    expect(userCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Aarya',
        email: 'aarya@iitk.ac.in',
        password: 'password123',
        otp: expect.any(String),
      })
    );
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'aarya@iitk.ac.in',
        subject: 'Verify Your P.A.T.A.N.G Account',
      })
    );
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      _id: 'user-1',
      email: 'aarya@iitk.ac.in',
      message: 'Activation code sent to aarya@iitk.ac.in successfully',
    });
  });

  it('verifies OTP and returns a token', async () => {
    const saveMock = vi.fn();
    userFindOneMock.mockResolvedValueOnce({
      _id: 'user-1',
      name: 'Aarya',
      email: 'aarya@iitk.ac.in',
      roles: ['student'],
      otp: '123456',
      save: saveMock,
    });

    const req = { body: { email: 'aarya@iitk.ac.in', otp: '123456' } };
    const res = createMockRes();

    await verifyOtp(req, res);

    expect(saveMock).toHaveBeenCalled();
    expect(generateTokenMock).toHaveBeenCalledWith('user-1', ['student']);
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBe('jwt-token');
  });

  it('blocks login when the account is not verified', async () => {
    userFindOneMock.mockResolvedValueOnce({
      matchPassword: vi.fn().mockResolvedValue(true),
      isVerified: false,
    });

    const req = { body: { email: 'aarya@iitk.ac.in', password: 'password123' } };
    const res = createMockRes();

    await loginUser(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: 'Account is not verified' });
  });

  it('resets password when the OTP is valid and unexpired', async () => {
    const saveMock = vi.fn();
    userFindOneMock.mockResolvedValueOnce({
      password: 'old-password',
      save: saveMock,
    });

    const req = {
      body: {
        email: 'aarya@iitk.ac.in',
        otp: '654321',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      },
    };
    const res = createMockRes();

    await resetPassword(req, res);

    expect(userFindOneMock).toHaveBeenCalledWith({
      email: 'aarya@iitk.ac.in',
      resetPasswordOtp: '654321',
      resetPasswordExpires: { $gt: expect.any(Number) },
    });
    expect(saveMock).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: 'Password reset successfully' });
  });

  it('returns 404 when forgot-password is requested for a missing user', async () => {
    userFindOneMock.mockResolvedValueOnce(null);

    const req = { body: { email: 'missing@iitk.ac.in' } };
    const res = createMockRes();

    await forgotPassword(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'User not found' });
  });
});
