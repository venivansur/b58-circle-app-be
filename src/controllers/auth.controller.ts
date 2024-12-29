import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient';
import { authentication } from '../middlewares/auth';
import { profile } from 'console';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { emailOrUsername, password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
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
        user: userWithoutPassword,
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
