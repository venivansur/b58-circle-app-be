import express from 'express';
import loginUser from '../../controllers/auth.controller';
import registerUser from '../../controllers/auth.controller';
import getMe from '../../controllers/auth.controller';
import { authentication } from '../../middlewares/auth';
const router = express.Router();

router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/me', authentication, getMe);
export default router;
