import express from 'express';
import { createCheckoutSession } from '../controllers/paymentController.js';
import authUser from '../middlewares/authUser.js';

const paymentRouter = express.Router();

// Route to create the GCash link
paymentRouter.post('/create-checkout-session', authUser, createCheckoutSession);

export default paymentRouter;
