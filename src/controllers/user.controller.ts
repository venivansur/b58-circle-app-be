import { Request, Response } from 'express';
import prisma from '../prismaClient';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        profilePicture: true,
        profile: {
          select: {
            bio: true,
          },
        },
      },
    });

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
export const getUserById = async (req: Request, res: Response) => {
  const { userId } = req.params;

  const userIdInt = parseInt(userId, 10);

  if (isNaN(userIdInt)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userIdInt,
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        profilePicture: true,
        followers: true,
        following: true,
        email: true,
        profile: {
          select: {
            bio: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { bio, fullName, username, profilePicture } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId, 10) },
      data: {
        fullName: fullName,
        username: username,
        profilePicture: profilePicture,
        profile: {
          upsert: {
            create: {
              bio: bio,
            },
            update: {
              bio: bio,
            },
          },
        },
      },
      include: { profile: true },
    });

    res.status(200).json({
      message: 'User updated successfully',
      updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const patchUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const data = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data,
    });

    res.status(200).json({ message: 'User updated successfully', updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const deletedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isDeleted: true },
    });

    res.status(200).json({ message: 'User deleted successfully', deletedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const toggleFollow = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const currentUserId = (req as any).user.id;
  if (!userId || isNaN(Number(userId))) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  if (Number(userId) === currentUserId) {
    return res
      .status(400)
      .json({ success: false, message: 'You cannot follow/unfollow yourself' });
  }

  try {
    const userExists = await prisma.user.findUnique({
      where: { id: parseInt(userId, 10) },
    });

    if (!userExists) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    const existingFollow = await prisma.follower.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: parseInt(userId, 10),
        },
      },
    });

    if (existingFollow) {
      await prisma.follower.delete({
        where: { id: existingFollow.id },
      });
      return res.status(200).json({
        success: true,
        message: 'Unfollowed successfully',
      });
    } else {
      const follow = await prisma.follower.create({
        data: {
          followerId: currentUserId,
          followingId: parseInt(userId, 10),
        },
      });
      return res.status(201).json({
        success: true,
        message: 'Followed successfully',
        data: follow,
      });
    }
  } catch (error) {
    console.error('Error in toggleFollow:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
    });
  }
};

export const getFollowing = async (req: Request, res: Response) => {
  const { userId } = req.params;

  const userIdInt = parseInt(userId);
  if (isNaN(userIdInt)) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  try {
    const following = await prisma.follower.findMany({
      where: { followerId: userIdInt },
      include: {
        following: true,
      },
    });

    if (following.length === 0) {
      return res.status(200).json([]);
    }

    const followingData = following.map((f) => f.following);

    return res.status(200).json(followingData);
  } catch (error) {
    console.error('Error fetching following:', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const getFollowers = async (req: Request, res: Response) => {
  const { userId } = req.params;

  const userIdInt = parseInt(userId);
  if (isNaN(userIdInt)) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  try {
    const followers = await prisma.follower.findMany({
      where: { followingId: userIdInt },
      include: {
        follower: true,
      },
    });

    if (followers.length === 0) {
      return res.status(200).json([]);
    }

    const followersData = followers.map((f) => f.follower);

    return res.status(200).json(followersData);
  } catch (error) {
    console.error('Error fetching followers:', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const getSuggestedUsers = async (req: Request, res: Response) => {
  const currentUserId = parseInt((req as any).user.id);

  try {
    const followersOfCurrentUser = await prisma.follower.findMany({
      where: { followingId: currentUserId },
      select: { followerId: true },
    });

    const usersFollowedByCurrentUser = await prisma.follower.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });

    const followersIds = followersOfCurrentUser.map((f) => f.followerId);
    const followingIds = usersFollowedByCurrentUser.map((f) => f.followingId);

    const suggestedUsers = await prisma.user.findMany({
      where: {
        id: {
          notIn: [currentUserId, ...followingIds],
        },
        isDeleted: false,
      },
    });

    const sortedSuggestedUsers = suggestedUsers.sort((a, b) => {
      const aFollowsCurrentUser = followersIds.includes(a.id);
      const bFollowsCurrentUser = followersIds.includes(b.id);

      if (aFollowsCurrentUser && !bFollowsCurrentUser) return -1;
      if (!aFollowsCurrentUser && bFollowsCurrentUser) return 1;
      return 0;
    });

    res.status(200).json(sortedSuggestedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};
