import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient';
import { authentication } from '../middlewares/auth';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
const router = express.Router();

router.post('/login', async (req, res) => {
  const { emailOrUsername, password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
      include: {
        followers: true,
        following: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const threads = await prisma.thread.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        likes: {
          select: {
            userId: true,
          },
        },
        replies: {
          select: {
            id: true,
            content: true,
            userId: true,
            createdAt: true,
          },
        },
      },
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' },
    );

    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: 'Login successful',
      data: {
        token,
        user: {
          ...userWithoutPassword,
          followersCount: user.followers.length,
          followingCount: user.following.length,
        },
        threads: threads.map((thread) => ({
          ...thread,
          likeCount: thread.likes.length,
          replyCount: thread.replies.length,
        })),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/register', async (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
      },
    });

    res.status(201).json({ message: 'User registered', user });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!password || password.length < 6) {
    return res
      .status(400)
      .json({ message: 'Password harus lebih dari 6 karakter.' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: { not: null },
        resetPasswordExpires: { gte: new Date() },
      },
    });

    if (user && user.resetPasswordToken) {
      const isTokenValid = await bcrypt.compare(token, user.resetPasswordToken);
      if (!isTokenValid) {
        return res.status(400).json({ message: 'Token tidak valid.' });
      }
    } else {
      return res
        .status(400)
        .json({ message: 'Token tidak valid atau telah kedaluwarsa.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    res.status(200).json({ message: 'Password berhasil diubah.' });
  } catch (error) {
    console.error('Error saat mereset password:', error);
    res.status(500).json({ message: 'Terjadi kesalahan. Coba lagi nanti.' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { emailOrUsername } = req.body;

  if (!emailOrUsername) {
    return res
      .status(400)
      .json({ message: 'Email atau username harus diisi.' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    });

    if (!user) {
      return res.status(200).json({
        message: 'Jika akun ditemukan, email reset password akan dikirim.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 3600000),
      },
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetURL = `https://b58-circle-app-fe.vercel.app/reset-password?token=${resetToken}`;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Reset Password',
        html: `
          <h1>Reset Password</h1>
          <p>Klik tautan berikut untuk mereset password Anda:</p>
          <a href="${resetURL}">Reset Password</a>
          <p>Link berlaku selama 1 jam.</p>
        `,
      });
      console.log('Email berhasil dikirim ke', user.email);
      res.status(200).json({
        message: 'Jika akun ditemukan, email reset password akan dikirim.',
      });
    } catch (error) {
      console.error('Gagal mengirim email:', error);
      res
        .status(500)
        .json({ message: 'Terjadi kesalahan saat mengirim email.' });
    }
  } catch (error) {
    console.error('Error saat mengirim email:', error);
    res.status(500).json({ message: 'Terjadi kesalahan. Coba lagi nanti.' });
  }
});

router.get('/me', authentication, async (req, res) => {
  const user = res.locals.user;

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({
    message: 'User data retrieved successfully',
    data: user,
  });
});

export default router;
