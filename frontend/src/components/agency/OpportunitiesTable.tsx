import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
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
      <div className="card text-center py-12">
        <p className="text-gray-500">No opportunities yet. Create your first opportunity!</p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-gray-200">
          <tr>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Title</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Outlet</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Deadline</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Action</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp) => (
            <tr key={opp.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium text-gray-900">{opp.title}</p>
                  <p className="text-xs text-gray-500">{opp.opportunity_type}</p>
                </div>
              </td>
              <td className="py-3 px-4 text-gray-600 text-sm">{opp.outlet_name || 'N/A'}</td>
              <td className="py-3 px-4">
                <MediaTypeBadge mediaType={opp.media_type} />
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {opp.deadline_at
                  ? formatDistanceToNow(new Date(opp.deadline_at), { addSuffix: true })
                  : 'No deadline'}
              </td>
              <td className="py-3 px-4">
                <StatusChip status={opp.status} />
              </td>
              <td className="py-3 px-4">
                <Link
                  href={`/agency/opportunities/${opp.id}`}
                  className="text-primary hover:text-red-700 text-sm font-medium"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
