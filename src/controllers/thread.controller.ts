import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { uploadToCloudinary } from '../controllers/upload.controller';
import cloudinary from '../claudinaryConfig';

export const createThread = async (req: Request, res: Response) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const userId = res.locals.user.userId;

    let fileUrl = null;
    let fileName = null;

    if (req.file) {
      const { url, fileName: name } = await uploadToCloudinary(
        req.file,
        'thread_pictures',
      );
      fileUrl = url;
      fileName = name;
    }

    const thread = await prisma.thread.create({
      data: {
        userId,
        content,
        fileUrl,
        fileName,
      },
    });

    res.status(201).json({ message: 'Thread created successfully', thread });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};
export const getAllThreads = async (req: Request, res: Response) => {
  const { userId } = req.query;

  try {
    if (userId && isNaN(Number(userId))) {
      return res.status(400).json({ error: 'Parameter userId tidak valid' });
    }

    const whereClause = userId
      ? { userId: parseInt(userId as string, 10) }
      : {};

    const threads = await prisma.thread.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            profilePicture: true,
          },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profilePicture: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!threads || threads.length === 0) {
      return res.status(200).json({ threads: [] });
    }

    res.status(200).json({ threads });
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

export const getThreadById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      console.log(`Invalid thread ID: ${id}`);
      return res.status(400).json({ message: 'Invalid thread ID' });
    }

    const thread = await prisma.thread.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        replies: true,
        user: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true,
          },
        },
      },
    });

    if (!thread) {
      console.log('Thread not found:', id);
      return res.status(404).json({ message: 'Thread not found' });
    }

    return res.status(200).json({ thread });
  } catch (error: any) {
    console.error('Error fetching thread:', {
      message: error.message,
      stack: error.stack,
    });

    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

export const deleteImage = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Delete Result:', result);
    return result;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Error deleting image');
  }
};

export const updateThread = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  const file = req.file;

  if (!content && !file) {
    return res.status(400).json({ error: 'Content or image is required' });
  }

  try {
    const thread = await prisma.thread.findUnique({
      where: { id: parseInt(id) },
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const updateData: any = {};
    if (content) updateData.content = content;

    if (thread.fileUrl) {
      const publicId = thread.fileUrl.split('/').pop()?.split('.')[0];
      if (publicId) {
        const fullPublicId = `thread_pictures/${publicId}`;
        console.log('Deleting image with publicId:', fullPublicId);

        const deleteResult = await cloudinary.uploader.destroy(fullPublicId);

        if (deleteResult.result === 'not found') {
          console.error('Image not found or could not be deleted');
        } else {
          console.log('Image deleted successfully');
        }
      }
    }

    if (file) {
      const cloudinaryResult = await uploadToCloudinary(
        file,
        'thread_pictures',
      );
      updateData.fileUrl = cloudinaryResult.url;
    }

    const updatedThread = await prisma.thread.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res
      .status(200)
      .json({ message: 'Thread updated successfully', thread: updatedThread });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

export const deleteThread = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.id;

  try {
    const thread = await prisma.thread.findUnique({
      where: { id: parseInt(id) },
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (thread.userId !== userId) {
      return res
        .status(403)
        .json({ error: 'You are not authorized to delete this thread' });
    }

    await prisma.thread.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Error deleting thread:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};
export const toggleLike = async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const userId = (req as any).user.id;

  try {
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_threadId: {
          userId,
          threadId: parseInt(threadId),
        },
      },
    });

    let updatedThread;

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
    } else {
      await prisma.like.create({
        data: {
          userId,
          threadId: parseInt(threadId),
        },
      });
    }

    updatedThread = await prisma.thread.findUnique({
      where: { id: parseInt(threadId) },
      include: {
        user: { select: { id: true, fullName: true, profilePicture: true } },
        _count: { select: { likes: true } },
      },
    });

    const message = existingLike
      ? 'Unliked successfully'
      : 'Liked successfully';
    return res.status(200).json({ message, thread: updatedThread });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

export const createReply = async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const { content } = req.body;
  const userId = (req as any).user.id;

  if (!content && !req.file) {
    return res.status(400).json({ error: 'Content or file is required' });
  }

  try {
    const existingThread = await prisma.thread.findUnique({
      where: { id: parseInt(threadId) },
    });

    if (!existingThread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    let fileUrl = null;
    let fileName = null;
    if (req.file) {
      const { url, fileName: name } = await uploadToCloudinary(
        req.file,
        'replies_pictures',
      );
      fileUrl = url;
      fileName = name;
    }

    const reply = await prisma.reply.create({
      data: {
        content,
        fileUrl,
        fileName,
        userId,
        threadId: parseInt(threadId),
      },
    });

    res.status(201).json({ message: 'Reply created successfully', reply });
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

export const deleteReply = async (req: Request, res: Response) => {
  const { threadId, replyId } = req.params;
  const userId = (req as any).user.id;

  try {
    const thread = await prisma.thread.findUnique({
      where: { id: parseInt(threadId) },
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const reply = await prisma.reply.findUnique({
      where: { id: parseInt(replyId) },
    });

    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    if (thread.userId !== userId && reply.userId !== userId) {
      return res
        .status(403)
        .json({ error: 'You are not authorized to delete this reply' });
    }

    await prisma.reply.delete({
      where: { id: parseInt(replyId) },
    });

    res.status(200).json({ message: 'Reply deleted successfully' });
  } catch (error) {
    console.error('Error deleting reply:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

export const getRepliesByThreadId = async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const replies = await prisma.reply.findMany({
      where: {
        threadId: parseInt(threadId, 10),
      },
      include: {
        user: true,
      },
    });

    return res.status(200).json({ replies: replies || [] });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};
