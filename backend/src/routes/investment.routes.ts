/**
 * Investment Routes
 */

import { Router } from 'express';
import * as investmentController from '../controllers/investment.controller';
import * as investment2StepController from '../controllers/investment-2step.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// All investment routes require authentication
router.use(authenticateUser);

// 2-Step Investment Process (New Flow)
router.post('/step1-usdt', investment2StepController.step1CreateInvestmentUSDT);
router.post('/:id/step2-tokens', investment2StepController.step2DepositTokens);
router.get('/:id/step-status', investment2StepController.getStepStatus);

// Legacy single-step investment (kept for compatibility)
router.post('/', investmentController.createInvestment);

// Investment management
router.get('/my', investmentController.getMyInvestments);
router.get('/:id', investmentController.getInvestmentById);
router.post('/:id/claim-yield', investmentController.claimYield);
router.post('/:id/claim-takara', investmentController.claimTakara);

// TAKARA Boost (v2.2)
router.post('/:id/boost/takara', investmentController.applyTakaraBoost);
router.get('/:id/boost/takara', investmentController.getTakaraBoost);

// Instant Sale (v2.2)
router.put('/:id/instant-sale', investmentController.toggleInstantSale);
router.post('/:id/instant-sale/execute', investmentController.executeInstantSale);
router.get('/:id/instant-sale/price', investmentController.getInstantSalePrice);

export default router;
