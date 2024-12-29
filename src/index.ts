import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/v1/auth.route';
import userRoutes from './routes/v1/user.route';
import threadRoutes from './routes/v1/thread.route';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cors());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/', userRoutes);
app.use('/api/v1/', threadRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
