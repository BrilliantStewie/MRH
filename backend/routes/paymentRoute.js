import express from 'express';
import { createCheckoutSession } from '../controllers/paymentController.js';
// Assuming you have an auth middleware, if not, remove 'authUser'
// import authUser from '../middleware/auth.js'; 

const paymentRouter = express.Router();

// Route to create the GCash link
// If you have middleware: paymentRouter.post('/create-checkout-session', authUser, createCheckoutSession);
paymentRouter.post('/create-checkout-session', createCheckoutSession);

export default paymentRouter;