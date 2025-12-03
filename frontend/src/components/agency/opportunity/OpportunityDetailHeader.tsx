import { formatDistanceToNow } from 'date-fns';
import { MediaTypeBadge } from '@/components/common/MediaTypeBadge';

interface OpportunityDetailHeaderProps {
  opportunity: any;
}

export default function OpportunityDetailHeader({ opportunity }: OpportunityDetailHeaderProps) {
  const createdDate = new Date(opportunity.created_at);
  const deadlineDate = opportunity.deadline_at ? new Date(opportunity.deadline_at) : null;

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{opportunity.title}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <MediaTypeBadge mediaType={opportunity.media_type} />
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
              {opportunity.opportunity_type}
            </span>
            <span
              className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${
                opportunity.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : opportunity.status === 'closed'
                  ? 'bg-gray-100 text-gray-800'
                  : opportunity.status === 'paused'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {opportunity.status}
            </span>
          </div>
        </div>
      </div>

      {opportunity.outlet_name && (
        <p className="text-gray-600 mb-4">
          <span className="font-medium">Outlet:</span> {opportunity.outlet_name}
        </p>
      )}

      {opportunity.summary && (
        <p className="text-gray-700 mb-6 leading-relaxed">{opportunity.summary}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-sm text-gray-500 mb-1">Created</p>
          <p className="text-sm font-medium text-gray-900">
            {formatDistanceToNow(createdDate, { addSuffix: true })}
          </p>
          <p className="text-xs text-gray-400">{createdDate.toLocaleDateString()}</p>
        </div>

        {deadlineDate && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Deadline</p>
            <p className="text-sm font-medium text-gray-900">
              {formatDistanceToNow(deadlineDate, { addSuffix: true })}
            </p>
            <p className="text-xs text-gray-400">{deadlineDate.toLocaleDateString()}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-500 mb-1">Visibility</p>
          <p className="text-sm font-medium text-gray-900 capitalize">{opportunity.visibility?.replace('_', ' ')}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-1">Source</p>
          <p className="text-sm font-medium text-gray-900 capitalize">{opportunity.source?.replace('_', ' ')}</p>
        </div>
      </div>
    </div>
  );
}
