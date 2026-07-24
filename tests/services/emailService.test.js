const { buildStockAlertHtml } = require('../../src/services/emailService');

describe('emailService', () => {
  describe('buildStockAlertHtml', () => {
    it('should generate HTML table with alert data', () => {
      const alerts = [
        { product: { name: 'Tomate', stock: 2, minStock: 5 }, type: 'stock_bajo', storeName: 'Test Store' }
      ];
      const html = buildStockAlertHtml(alerts);
      expect(html).toContain('Test Store');
      expect(html).toContain('Tomate');
      expect(html).toContain('2');
      expect(html).toContain('5');
      expect(html).toContain('BAJO');
    });

    it('should mark sin_stock as AGOTADO', () => {
      const alerts = [
        { product: { name: 'Cebolla', stock: 0, minStock: 3 }, type: 'sin_stock', storeName: 'Test' }
      ];
      const html = buildStockAlertHtml(alerts);
      expect(html).toContain('AGOTADO');
    });

    it('should handle empty product gracefully', () => {
      const alerts = [
        { product: null, type: 'stock_bajo', storeName: 'Test' }
      ];
      const html = buildStockAlertHtml(alerts);
      expect(html).toContain('N/A');
    });
  });
});
