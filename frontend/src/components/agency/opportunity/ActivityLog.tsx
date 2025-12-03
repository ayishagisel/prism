import { formatDistanceToNow } from 'date-fns';

interface ActivityLogProps {
  activities: any[];
}

export default function ActivityLog({ activities }: ActivityLogProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h3>
        <p className="text-gray-500 text-center py-8">No activity recorded yet for this opportunity.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Activity Log</h3>
      <div className="space-y-6">
        {activities.map((activity, idx) => (
          <div key={activity.id || idx} className="flex gap-4">
            {/* Timeline dot */}
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-red-600 rounded-full mt-1.5" />
              {idx !== activities.length - 1 && <div className="w-0.5 h-12 bg-gray-200 mt-2" />}
            </div>

            {/* Activity content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {activity.action && activity.action.replace('_', ' ').charAt(0).toUpperCase() + activity.action.slice(1)}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.metadata?.details ||
                      activity.metadata?.notes ||
                      `${activity.entity_type} was ${activity.action}`}
                  </p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
              </div>
              {activity.actor_user_id && (
                <p className="text-xs text-gray-500 mt-2">by User {activity.actor_user_id}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
