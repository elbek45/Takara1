/**
 * Investment Routes
 */

import { Router } from 'express';
import * as investmentController from '../controllers/investment.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// All investment routes require authentication
router.use(authenticateUser);

router.post('/', investmentController.createInvestment);
router.get('/my', investmentController.getMyInvestments);
router.get('/:id', investmentController.getInvestmentById);
router.post('/:id/claim-yield', investmentController.claimYield);
router.post('/:id/claim-takara', investmentController.claimTakara);

export default router;
