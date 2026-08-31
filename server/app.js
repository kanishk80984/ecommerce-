import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './src/config/db.js';
import { errorHandler, notFoundHandler } from './src/middlewares/errorHandler.js';

import authRoutes from './src/routes/authRoutes.js';
import vendorRoutes from './src/routes/vendorRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import superAdminRoutes from './src/routes/superAdminRoutes.js';
import productRoutes from './src/routes/productRoutes.js';
import cartRoutes from './src/routes/cartRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';
import publicRoutes from './src/routes/publicRoutes.js';
import addressRoutes from './src/routes/addressRoutes.js';
import serviceRoutes from './src/routes/serviceRoutes.js';
import hsnSkuRoutes from './src/routes/hsnSkuRoutes.js';
import imageRoutes from './src/routes/imageRoutes.js';
import locationRoutes from './src/routes/locationRoutes.js';
import supportRoutes from './src/routes/supportRoutes.js';
import bankAccountRoutes from './src/routes/bankAccountRoutes.js';
import dispatchFlowRoutes from './src/routes/dispatchFlowRoutes.js';
import returnRoutes from './src/routes/returnRoutes.js';
import reviewRoutes from './src/routes/reviewRoutes.js';
import deliveryIntegrationRoutes from './src/routes/deliveryIntegrationRoutes.js';
import apiDocsRoutes from './src/routes/apiDocsRoutes.js';
import vendorCommunicationRoutes from './src/routes/vendorCommunicationRoutes.js';
import jobRoutes from './src/routes/jobRoutes.js';
import businessNetworkRoutes from './src/routes/businessNetworkRoutes.js';

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 5001,
});

app.use('/api', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

await connectDB();

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running healthily!',
  });
});

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api', hsnSkuRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/delivery', dispatchFlowRoutes);
app.use('/api/delivery', deliveryIntegrationRoutes);
app.use('/api/docs', apiDocsRoutes);
app.use('/api/vendor-communications', vendorCommunicationRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/business-network', businessNetworkRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
