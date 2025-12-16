'use client';

import React, { useState, useEffect } from 'react';
import { Client } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { StatusChip } from '../common/StatusChip';

interface ClientCardProps {
  client: Client;
  onViewDetails: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  onViewDetails,
  onEdit,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);

  // Fetch opportunities for this client on mount
  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        const res = await apiClient.getClientOpportunities(client.id);
        if (res.success) {
          setOpportunities(res.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch opportunities:', err);
      }
    };
    fetchOpportunities();
  }, [client.id]);

  // Generate avatar background color based on first letter
  const getAvatarColor = (name: string) => {
    const colors = ['#D32F2F', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    const charCode = name.charCodeAt(0);
    return colors[charCode % colors.length];
  };

  const initials = client.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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

  // Count responses by status from actual opportunities
  const totalResponses = opportunities.length;
  const acceptedResponses = opportunities.filter((o) => o.response_state === 'accepted').length;
  const interestedResponses = opportunities.filter((o) => o.response_state === 'interested').length;
  const pendingResponses = opportunities.filter((o) => o.response_state === 'pending').length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      {/* Header with avatar and basic info */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              style={{ backgroundColor: getAvatarColor(client.name) }}
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
            >
              {initials}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{client.name}</h3>
              {client.company_name && (
                <p className="text-sm text-gray-700 font-medium">{client.company_name}</p>
              )}
              <p className="text-sm text-gray-500">{client.industry || 'No industry specified'}</p>
            </div>
          </div>
          <StatusChip status={client.status || 'active'} />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {clientTags.length > 0 ? (
            clientTags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400">No tags</span>
          )}
          {clientTags.length > 4 && (
            <span className="text-xs text-gray-400">+{clientTags.length - 4} more</span>
          )}
        </div>
      </div>

      {/* Contact info */}
      <div className="px-6 py-3 bg-gray-50 border-t border-b border-gray-100">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {client.primary_contact_email && (
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="truncate max-w-[180px]">{client.primary_contact_email}</span>
            </div>
          )}
          {client.created_at && (
            <div className="flex items-center gap-1.5 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{new Date(client.created_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Response stats */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-gray-50">
            <div className="font-bold text-lg text-gray-900">{totalResponses}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="p-2 rounded-lg bg-green-50">
            <div className="font-bold text-lg text-green-600">{acceptedResponses}</div>
            <div className="text-xs text-gray-500">Accepted</div>
          </div>
          <div className="p-2 rounded-lg bg-blue-50">
            <div className="font-bold text-lg text-blue-600">{interestedResponses}</div>
            <div className="text-xs text-gray-500">Interested</div>
          </div>
          <div className="p-2 rounded-lg bg-yellow-50">
            <div className="font-bold text-lg text-yellow-600">{pendingResponses}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6">
        <div className="flex gap-2">
          <button
            onClick={() => onViewDetails(client)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View
          </button>
          <button
            onClick={() => onEdit(client)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 mb-2">Delete "{client.name}"?</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onDelete(client.id);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
