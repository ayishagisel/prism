import { csvImportService } from '../src/modules/csv/csv.service';

describe('OpportunityService', () => {
  describe('CSV Import', () => {
    it('should parse CSV content correctly', () => {
      const csvContent = `Title,Outlet,Type,Deadline,Client
Forbes Feature,Forbes,feature_article,2025-12-15,Throne Society
TechCrunch Panel,TechCrunch,panel,2025-12-20,Glow Up`;

      const rows = csvImportService.parseCSV(csvContent);

      expect(rows).toBeDefined();
      expect(rows.length).toBe(2);
      expect(rows[0].Title).toBe('Forbes Feature');
      expect(rows[1].Client).toBe('Glow Up');
    });

    it('should normalize CSV row to opportunity format', () => {
      const row = {
        Title: 'Forbes Women Founders',
        Description: 'Feature for women founders',
        Type: 'feature_article',
        Outlet: 'Forbes',
        Deadline: '2025-12-15',
        Client: 'Throne Society',
      };

      const normalized = csvImportService.normalizeRow(row);

      expect(normalized.title).toBe('Forbes Women Founders');
      expect(normalized.media_type).toBe('feature_article');
      expect(normalized.outlet_name).toBe('Forbes');
      expect(normalized.client_name).toBe('Throne Society');
    });

    it('should map media types correctly', () => {
      const testCases = [
        { input: 'article', expected: 'feature_article' },
        { input: 'podcast', expected: 'podcast' },
        { input: 'panel', expected: 'panel' },
        { input: 'news', expected: 'news_brief' },
        { input: 'tv', expected: 'tv_appearance' },
        { input: 'speaking', expected: 'speaking_engagement' },
        { input: 'unknown', expected: 'other' },
      ];

      testCases.forEach(({ input, expected }) => {
        const normalized = csvImportService.normalizeRow({ Type: input });
        expect(normalized.media_type).toBe(expected);
      });
    });

    it('should handle missing fields gracefully', () => {
      const row = {
        Title: 'Forbes Feature',
        // Missing other fields
      };

      const normalized = csvImportService.normalizeRow(row);

      expect(normalized.title).toBe('Forbes Feature');
      expect(normalized.media_type).toBe('other');
      expect(normalized.outlet_name).toBeUndefined();
    });

    it('should parse date strings correctly', () => {
      const row = {
        Title: 'Test',
        Deadline: '2025-12-25',
      };

      const normalized = csvImportService.normalizeRow(row);

      expect(normalized.deadline_at).toBeDefined();
      expect(normalized.deadline_at).toContain('2025-12-25');
    });
  });
});
