import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Opportunity } from '@/lib/types';
import { StatusChip } from '../common/StatusChip';
import { MediaTypeBadge } from '../common/MediaTypeBadge';

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  onEdit?: (id: string) => void;
}

export const OpportunitiesTable: React.FC<OpportunitiesTableProps> = ({
  opportunities,
  onEdit,
}) => {
  if (opportunities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No opportunities found</h3>
        <p className="text-gray-500 text-sm">Create your first opportunity to get started!</p>
      </div>
    );
  }

  // Check if deadline is in the past
  const isExpired = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Title</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Outlet</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Type</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Deadline</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {opportunities.map((opp) => (
              <tr key={opp.id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="py-4 px-4">
                  <div>
                    <p className="font-medium text-gray-900">{opp.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opp.opportunity_type}</p>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-gray-600 text-sm">{opp.outlet_name || '—'}</span>
                </td>
                <td className="py-4 px-4">
                  <MediaTypeBadge mediaType={opp.media_type} />
                </td>
                <td className="py-4 px-4">
                  {opp.deadline_at ? (
                    <div className="flex items-center gap-1.5">
                      {isExpired(opp.deadline_at) && (
                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`text-sm ${isExpired(opp.deadline_at) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {format(new Date(opp.deadline_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">No deadline</span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <StatusChip status={opp.status} />
                </td>
                <td className="py-4 px-4">
                  <Link
                    href={`/agency/opportunities/${opp.id}`}
                    className="inline-flex items-center gap-1.5 text-[#D32F2F] hover:text-[#C62828] text-sm font-medium transition-colors"
                  >
                    View
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
