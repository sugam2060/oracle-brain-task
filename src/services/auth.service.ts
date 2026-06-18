import bcrypt from 'bcrypt';
import prisma from '../prisma/prisma.client';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.util';

export class AuthService {
  static async register(data: any) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw { status: 409, message: 'Email already in use' };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw { status: 401, message: 'Invalid credentials' };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw { status: 401, message: 'Invalid credentials' };
    }

    // Delete existing expired tokens for clean up
    await prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    });

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken, refreshToken };
  }

  static async logout(refreshToken: string) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }
  }

  static async refresh(oldRefreshToken: string) {
    if (!oldRefreshToken) {
      throw { status: 401, message: 'Refresh token missing' };
    }

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      if (tokenRecord) {
        await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      }
      throw { status: 401, message: 'Invalid or expired refresh token' };
    }

    // verify token stateless
    try {
      verifyRefreshToken(oldRefreshToken);
    } catch {
      await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      throw { status: 401, message: 'Invalid or expired refresh token' };
    }

    // Delete old token
    await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });

    // Generate new tokens
    const accessToken = generateAccessToken(tokenRecord.user.id, tokenRecord.user.role);
    const newRefreshToken = generateRefreshToken(tokenRecord.user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: tokenRecord.user.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }
}
