'use client';

import React, { useState, useEffect } from 'react';
import { useOpportunities } from '@/lib/hooks';
import { OpportunitiesTable } from '@/components/agency/OpportunitiesTable';
import { NewOpportunityForm } from '@/components/agency/NewOpportunityForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { apiClient } from '@/lib/api';

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
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [clientMapping, setClientMapping] = useState<any>(null);
  const [mappingLoading, setMappingLoading] = useState(true);

  // Fetch client mapping on mount
  useEffect(() => {
    const fetchMapping = async () => {
      try {
        const res = await apiClient.getClientMapping();
        if (res.success) {
          setClientMapping(res.data || {});
        }
      } catch (err) {
        console.error('Failed to fetch client mapping:', err);
      } finally {
        setMappingLoading(false);
      }
    };
    fetchMapping();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!csvContent.trim()) {
        setMessage({ type: 'error', text: 'Please paste CSV content' });
        setLoading(false);
        return;
      }

      const res = await apiClient.importCSV(csvContent, clientMapping);
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Import successful! Created ${res.data?.created || 0} opportunities, skipped ${res.data?.skipped || 0} rows.`,
        });
        setCSVContent('');
        // Trigger refresh of opportunities
        window.dispatchEvent(new Event('storage'));
        setTimeout(() => onCancel(), 2000);
      } else {
        setMessage({ type: 'error', text: res.error || 'Import failed' });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Import failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const messageColors = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl mb-6">
      <h2 className="text-xl font-bold mb-4">Import Opportunities from CSV</h2>
      <p className="text-sm text-gray-600 mb-4">
        Format: Title, Description, Outlet, Type, Category, Deadline, Client
      </p>

      {message && (
        <div className={`${messageColors[message.type]} p-3 rounded mb-4 text-sm`}>{message.text}</div>
      )}

      {mappingLoading ? (
        <div className="text-gray-600 text-sm mb-4">Loading client mapping...</div>
      ) : (
        <div className="bg-gray-50 p-3 rounded mb-4 text-sm text-gray-700">
          <strong>Recognized Clients:</strong> {Object.keys(clientMapping).join(', ') || 'None'}
        </div>
      )}

      <textarea
        value={csvContent}
        onChange={(e) => setCSVContent(e.target.value)}
        placeholder="Paste CSV content here..."
        rows={8}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mb-4 font-mono text-sm"
      />
      <div className="flex gap-4">
        <button type="submit" disabled={loading || mappingLoading} className="btn btn-primary">
          {loading ? 'Importing...' : 'Import CSV'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
