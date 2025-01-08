import express from 'express';
import {
  createThread,
  getAllThreads,
  getThreadById,
  updateThread,
  getRepliesByThreadId,
  deleteThread,
  toggleLike,
  createReply,
  deleteReply,
} from '../../controllers/thread.controller';
import { authentication } from '../../middlewares/auth';
import { upload } from '../../middlewares/upload-file';
const router = express.Router();

router.post('/threads', authentication, upload.single('file'), createThread);
router.get('/threads', getAllThreads);
router.get('/threads/:id', authentication, getThreadById);
router.put('/thread/:id', authentication, upload.single('file'), updateThread);
router.delete('/thread/:id', authentication, deleteThread);
router.post('/threads/:threadId/like', authentication, toggleLike);
router.post(
  '/threads/:threadId/replies',
  authentication,
  upload.single('file'),
  createReply,
);
router.get('/threads/:threadId/replies', authentication, getRepliesByThreadId);
router.delete(
  '/threads/:threadId/replies/:replyId',
  authentication,
  deleteReply,
);
export default router;
