import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import empleadosRoutes from './routes/empleados.routes.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use('/api/v1', empleadosRoutes);
app.use(errorHandler);

export default app;
