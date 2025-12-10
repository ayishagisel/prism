'use client';

import React from 'react';
import { StatusChip } from '../common/StatusChip';

interface ResponseSummary {
  pending: number;
  interested: number;
  accepted: number;
  declined: number;
  no_response: number;
  total: number;
}

interface ClientResponsesSummaryProps {
  summary: ResponseSummary;
  responseRate: number;
  onFilterChange?: (status: string) => void;
  selectedFilter?: string;
}

/**
 * ClientResponsesSummary Component
 *
 * Displays a breakdown of client responses to opportunities:
 * - Pending (yellow)
 * - Interested (blue)
 * - Accepted (green)
 * - Declined (red)
 * - No Response (gray)
 *
 * Shows response rate percentage and allows filtering by clicking on cards.
 */
export function ClientResponsesSummary({
  summary,
  responseRate,
  onFilterChange,
  selectedFilter = '',
}: ClientResponsesSummaryProps) {
  const responseCards = [
    {
      status: 'pending',
      label: 'Pending',
      count: summary.pending,
      icon: '⏳',
      color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
      textColor: 'text-yellow-700',
      badgeColor: 'bg-yellow-500',
    },
    {
      status: 'interested',
      label: 'Interested',
      count: summary.interested,
      icon: '💡',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      textColor: 'text-blue-700',
      badgeColor: 'bg-blue-500',
    },
    {
      status: 'accepted',
      label: 'Accepted',
      count: summary.accepted,
      icon: '✅',
      color: 'bg-green-50 border-green-200 hover:bg-green-100',
      textColor: 'text-green-700',
      badgeColor: 'bg-green-500',
    },
    {
      status: 'declined',
      label: 'Declined',
      count: summary.declined,
      icon: '❌',
      color: 'bg-red-50 border-red-200 hover:bg-red-100',
      textColor: 'text-red-700',
      badgeColor: 'bg-red-500',
    },
    {
      status: 'no_response',
      label: 'No Response',
      count: summary.no_response,
      icon: '⚪',
      color: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
      textColor: 'text-gray-700',
      badgeColor: 'bg-gray-500',
    },
  ];

  const handleCardClick = (status: string) => {
    if (onFilterChange) {
      // Toggle filter: if clicking the same status, clear the filter
      onFilterChange(selectedFilter === status ? '' : status);
    }
  };

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Client Responses</h2>
          <p className="text-sm text-gray-600">
            Overview of client responses to shared opportunities
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-primary">{responseRate}%</div>
          <div className="text-sm text-gray-600">Response Rate</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {responseCards.map((card) => (
          <button
            key={card.status}
            onClick={() => handleCardClick(card.status)}
            className={`
              ${card.color}
              ${selectedFilter === card.status ? 'ring-2 ring-offset-2 ring-primary' : ''}
              border-2 rounded-lg p-4 text-left transition-all cursor-pointer
              transform hover:scale-105 hover:shadow-md
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
              {selectedFilter === card.status && (
                <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                  Filtered
                </span>
              )}
            </div>
            <div className={`text-3xl font-bold mb-1 ${card.textColor}`}>
              {card.count}
            </div>
            <div className={`text-sm font-medium ${card.textColor}`}>
              {card.label}
            </div>
          </button>
        ))}
      </div>

      {selectedFilter && (
        <div className="mt-4 flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-4 py-2">
          <span className="text-sm text-gray-700">
            Filtering opportunities by:{' '}
            <strong>
              {responseCards.find((c) => c.status === selectedFilter)?.label}
            </strong>
          </span>
          <button
            onClick={() => onFilterChange?.('')}
            className="text-sm text-primary hover:text-red-700 font-medium"
          >
            Clear Filter
          </button>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <strong>{summary.total}</strong> total opportunities shared with clients
        </div>
      </div>
    </div>
  );
}
