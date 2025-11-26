'use client';

import React, { useState } from 'react';
import { useOpportunities } from '@/lib/hooks';
import { OpportunitiesTable } from '@/components/agency/OpportunitiesTable';
import { NewOpportunityForm } from '@/components/agency/NewOpportunityForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function OpportunitiesPage() {
  const { opportunities, loading } = useOpportunities();
  const [showForm, setShowForm] = useState(false);
  const [showCSV, setShowCSV] = useState(false);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Opportunities</h1>
          <p className="text-gray-600">Manage and track all PR opportunities</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowCSV(!showCSV)}
            className="btn btn-secondary"
            data-testid="csv-upload-btn"
          >
            📤 CSV Import
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
            data-testid="new-opportunity-btn"
          >
            + New Opportunity
          </button>
        </div>
      </div>

      {showForm && (
        <NewOpportunityForm onCancel={() => setShowForm(false)} onSuccess={() => setShowForm(false)} />
      )}

      {showCSV && <CSVUploadForm onCancel={() => setShowCSV(false)} />}

      <OpportunitiesTable opportunities={opportunities} data-testid="opportunities-table" />
    </div>
  );
}

function CSVUploadForm({ onCancel }: { onCancel: () => void }) {
  const [csvContent, setCSVContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Implement CSV import via API
    setMessage('CSV import coming in Phase 2');
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl mb-6">
      <h2 className="text-xl font-bold mb-4">Import from CSV</h2>
      {message && <div className="bg-blue-100 text-blue-800 p-3 rounded mb-4 text-sm">{message}</div>}
      <textarea
        value={csvContent}
        onChange={(e) => setCSVContent(e.target.value)}
        placeholder="Paste CSV content here..."
        rows={6}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mb-4"
      />
      <div className="flex gap-4">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Importing...' : 'Import'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
