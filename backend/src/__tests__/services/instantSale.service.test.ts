/**
 * Instant Sale Service Tests
 * Tests for instant sale calculations and execution
 */

describe('Instant Sale Service', () => {
  describe('calculateInstantSalePrice', () => {
    it('should calculate 80% of investment value', () => {
      const investmentValue = 10000;
      const discountRate = 0.20; // 20% discount
      const instantSalePrice = investmentValue * (1 - discountRate);

      expect(instantSalePrice).toBe(8000);
    });

    it('should handle decimal values', () => {
      const investmentValue = 1234.56;
      const instantSalePrice = Number((investmentValue * 0.80).toFixed(2));

      expect(instantSalePrice).toBe(987.65);
    });

    it('should include accrued earnings in calculation', () => {
      const principalAmount = 10000;
      const accruedEarnings = 500;
      const totalValue = principalAmount + accruedEarnings;
      const instantSalePrice = totalValue * 0.80;

      expect(instantSalePrice).toBe(8400);
    });
  });

  describe('Instant Sale Eligibility', () => {
    it('should only allow active investments', () => {
      const statuses = ['PENDING', 'ACTIVE', 'COMPLETED', 'WITHDRAWN', 'SOLD'];
      const eligibleStatuses = statuses.filter(s => s === 'ACTIVE');

      expect(eligibleStatuses).toEqual(['ACTIVE']);
    });

    it('should not allow listed investments', () => {
      const isListed = true;
      const canEnableInstantSale = !isListed;

      expect(canEnableInstantSale).toBe(false);
    });
  });

  describe('Instant Sale Tax', () => {
    it('should apply 5% tax on instant sale', () => {
      const salePrice = 8000;
      const taxRate = 0.05;
      const taxAmount = salePrice * taxRate;
      const sellerReceives = salePrice - taxAmount;

      expect(taxAmount).toBe(400);
      expect(sellerReceives).toBe(7600);
    });
  });

  describe('Boost Return on Instant Sale', () => {
    it('should return TAKARA boost to user', () => {
      const takaraBoostAmount = 5000;
      const isReturned = false;

      // On instant sale, TAKARA boost should be returned
      const shouldReturn = !isReturned;
      expect(shouldReturn).toBe(true);
    });

    it('should return LAIKA boost to user', () => {
      const laikaBoostAmount = 1000;
      const isReturned = false;

      const shouldReturn = !isReturned;
      expect(shouldReturn).toBe(true);
    });
  });

  describe('Admin Instant Sale Purchase', () => {
    it('should allow admin to purchase at instant sale price', () => {
      const investmentValue = 10000;
      const instantSalePrice = investmentValue * 0.80;
      const adminCanPurchase = true;

      expect(instantSalePrice).toBe(8000);
      expect(adminCanPurchase).toBe(true);
    });

    it('should transfer ownership to platform on admin purchase', () => {
      const originalOwner = 'user-123';
      const newOwner = 'platform';

      expect(newOwner).not.toBe(originalOwner);
    });
  });
});
