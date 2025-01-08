import express from 'express';
import loginUser from '../../controllers/auth.controller';
import registerUser from '../../controllers/auth.controller';
import forgotUser from '../../controllers/auth.controller';
import resetUser from '../../controllers/auth.controller';
import getMe from '../../controllers/auth.controller';

import { authentication } from '../../middlewares/auth';
const router = express.Router();

router.post('/login', loginUser);
router.post('/reset-password', resetUser);
router.post('/register', registerUser);
router.post('/forgot-password', forgotUser);
router.get('/me', authentication, getMe);
export default router;
