'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Client } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { StatusChip } from '../common/StatusChip';

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose }) => {
  const router = useRouter();
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

  const handleOpportunityClick = (opportunityId: string) => {
    onClose();
    router.push(`/agency/opportunities/${opportunityId}`);
  };

  // Parse tags if they come as a string
  const parseTags = (tags: any): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      try {
        return JSON.parse(tags);
      } catch {
        return [];
      }
    }
    return [];
  };

  const clientTags = parseTags(client.tags);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
            <p className="text-gray-500 text-sm mt-1">{client.industry || 'No industry specified'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6 bg-white">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-[#D32F2F] text-[#D32F2F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'opportunities'
                  ? 'border-[#D32F2F] text-[#D32F2F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Opportunities
              {opportunities.length > 0 && (
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {opportunities.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Primary Contact</label>
                    <p className="text-gray-900 text-sm">{client.primary_contact_name || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                    <p className="text-gray-900 text-sm">{client.primary_contact_email || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Client Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Client Details
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Industry</label>
                    <p className="text-gray-900 text-sm">{client.industry || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                    <StatusChip status={client.status || 'active'} />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {clientTags.length > 0 ? (
                    clientTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">No tags assigned</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'opportunities' && (
            <div className="space-y-3">
              {loadingOpps ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D32F2F]"></div>
                </div>
              ) : opportunities.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No opportunities assigned yet</p>
                </div>
              ) : (
                opportunities.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => status.opportunity?.id && handleOpportunityClick(status.opportunity.id)}
                    className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 group-hover:text-[#D32F2F] transition-colors flex items-center gap-2">
                          {status.opportunity?.title || 'Opportunity'}
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-[#D32F2F] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {status.opportunity?.outlet_name && `${status.opportunity.outlet_name} • `}
                          {status.opportunity?.media_type?.replace(/_/g, ' ') || 'PR'}
                        </p>
                      </div>
                      <StatusChip status={status.response_state || 'pending'} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Added {new Date(status.created_at).toLocaleDateString()}
                      </span>
                      {status.responded_at && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Responded {new Date(status.responded_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
