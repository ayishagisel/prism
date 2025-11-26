'use client';

import React, { useState, useEffect } from 'react';
import { Client } from '@/lib/types';
import { apiClient } from '@/lib/api';

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'opportunities'>('details');
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(false);

  useEffect(() => {
    const fetchOpportunities = async () => {
      setLoadingOpps(true);
      try {
        const res = await apiClient.getClientOpportunities(client.id);
        if (res.success) {
          setOpportunities(res.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch opportunities:', err);
      } finally {
        setLoadingOpps(false);
      }
    };

    if (activeTab === 'opportunities') {
      fetchOpportunities();
    }
  }, [activeTab, client.id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Client Profile: {client.name}</h2>
            <p className="text-gray-600 text-sm mt-1">
              View and edit client details and opportunity history
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 px-1 font-medium text-sm border-b-2 transition ${
                activeTab === 'details'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`py-3 px-1 font-medium text-sm border-b-2 transition ${
                activeTab === 'opportunities'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Opportunity History
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <p className="text-gray-900">{client.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <p className="text-gray-900">{client.industry || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900">{client.primary_contact_email || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <p className="text-gray-900">{client.status || '-'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {client.tags && client.tags.length > 0 ? (
                    client.tags.map((tag) => (
                      <span key={tag} className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No tags</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'opportunities' && (
            <div className="space-y-3">
              {loadingOpps ? (
                <p className="text-gray-600">Loading opportunities...</p>
              ) : opportunities.length === 0 ? (
                <p className="text-gray-600">No opportunities yet</p>
              ) : (
                opportunities.map((opp) => (
                  <div key={opp.id} className="p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{opp.title}</h4>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                          opp.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : opp.status === 'interested'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {opp.status?.charAt(0).toUpperCase() + opp.status?.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(opp.created_at).toLocaleDateString()} • {opp.opportunity_type}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded font-medium hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
