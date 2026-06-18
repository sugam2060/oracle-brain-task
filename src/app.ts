import express from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/error.middleware';
import { rateLimiter } from './middlewares/rateLimiter.middleware';
import authRoutes from './routes/auth.routes';
import leadRoutes from './routes/lead.routes';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(rateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

app.use('/auth', authRoutes);
app.use('/leads', leadRoutes);

app.use(errorHandler);

export default app;
