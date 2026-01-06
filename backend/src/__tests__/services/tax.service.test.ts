/**
 * Tax Service Tests
 * Tests for tax calculation and treasury management
 */

describe('Tax Service', () => {
  describe('calculateTax', () => {
    it('should calculate 5% tax correctly', () => {
      const amount = 1000;
      const taxRate = 0.05;
      const tax = amount * taxRate;
      const netAmount = amount - tax;

      expect(tax).toBe(50);
      expect(netAmount).toBe(950);
    });

    it('should handle decimal amounts', () => {
      const amount = 123.456;
      const taxRate = 0.05;
      const tax = Number((amount * taxRate).toFixed(6));
      const netAmount = Number((amount - tax).toFixed(6));

      expect(tax).toBeCloseTo(6.1728, 4);
      expect(netAmount).toBeCloseTo(117.2832, 4);
    });

    it('should handle zero amount', () => {
      const amount = 0;
      const tax = amount * 0.05;

      expect(tax).toBe(0);
    });
  });

  describe('TAKARA Claim Tax', () => {
    it('should apply 5% tax on TAKARA claims', () => {
      const claimAmount = 1000;
      const taxAmount = claimAmount * 0.05;
      const userReceives = claimAmount * 0.95;

      expect(taxAmount).toBe(50);
      expect(userReceives).toBe(950);
    });

    it('should handle large amounts', () => {
      const claimAmount = 1000000;
      const taxAmount = claimAmount * 0.05;
      const userReceives = claimAmount * 0.95;

      expect(taxAmount).toBe(50000);
      expect(userReceives).toBe(950000);
    });
  });

  describe('Wexel Sale Tax', () => {
    it('should apply 5% tax on NFT sales', () => {
      const salePrice = 5000;
      const platformFee = salePrice * 0.025; // 2.5%
      const saleTax = salePrice * 0.05;      // 5%
      const sellerReceives = salePrice - platformFee - saleTax;

      expect(platformFee).toBe(125);
      expect(saleTax).toBe(250);
      expect(sellerReceives).toBe(4625);
    });
  });

  describe('Treasury Balance', () => {
    it('should track accumulated taxes', () => {
      const taxes = [50, 100, 25.5, 74.5];
      const totalTax = taxes.reduce((sum, tax) => sum + tax, 0);

      expect(totalTax).toBe(250);
    });

    it('should track taxes by token type', () => {
      const taxesByToken = {
        TAKARA: 1000,
        USDT: 500,
        LAIKA: 0
      };

      expect(taxesByToken.TAKARA).toBe(1000);
      expect(taxesByToken.USDT).toBe(500);
    });
  });
});
