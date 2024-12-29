import express from 'express';
import {
  toggleFollow,
  getSuggestedUsers,
  getFollowers,
  getFollowing,
  getUserById,
  deleteUser,
  updateUser,
  patchUser,
  getAllUsers,
} from '../../controllers/user.controller';
import { authentication } from '../../middlewares/auth';
import { upload } from '../../middlewares/upload-file';
const router = express.Router();

router.post('/users/:userId/follow', authentication, toggleFollow);
router.get('/users/:userId/suggest-users', authentication, getSuggestedUsers);
router.get('/users/:userId/followers', authentication, getFollowers);
router.get('/users/:userId/following', authentication, getFollowing);
router.get('/users', authentication, getAllUsers);
router.get('/users/:userId', authentication, getUserById);
router.put(
  '/users/:userId',
  authentication,
  upload.single('profile_pictures'),
  updateUser,
);
router.patch('/users/:userId', authentication, patchUser);
router.delete('/users/:userId', authentication, deleteUser);
export default router;
