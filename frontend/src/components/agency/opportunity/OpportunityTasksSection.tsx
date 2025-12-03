'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { StatusChip } from '@/components/common/StatusChip';

interface OpportunityTasksSectionProps {
  tasks: any[];
  onTaskAssign: (taskId: string, assigneeId: string | null) => Promise<void>;
  onRefresh: () => void;
}

export default function OpportunityTasksSection({
  tasks,
  onTaskAssign,
  onRefresh,
}: OpportunityTasksSectionProps) {
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAssign = async (taskId: string, assigneeId: string | null) => {
    setIsSubmitting(true);
    try {
      await onTaskAssign(taskId, assigneeId);
      setReassigningId(null);
    } catch (err) {
      console.error('Error assigning task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow-up Tasks</h3>
        <p className="text-gray-500 text-center py-8">
          No tasks yet. Tasks will be created automatically when clients respond to this opportunity.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow-up Tasks</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Task</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Client</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Due Date</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Priority</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Assigned To</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <p className="font-medium text-gray-900">{task.title}</p>
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">
                  {task.client?.name || 'Unknown Client'}
                </td>
                <td className="py-4 px-4 text-sm text-gray-600 capitalize">
                  {task.task_type?.replace('_', ' ') || 'General'}
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">
                  {task.due_at
                    ? formatDistanceToNow(new Date(task.due_at), { addSuffix: true })
                    : '—'}
                </td>
                <td className="py-4 px-4">
                  <StatusChip status={task.status} />
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      task.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : task.priority === 'low'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {task.priority || 'normal'}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">
                  {task.assigned_to_user_id ? 'Assigned' : 'Unassigned'}
                </td>
                <td className="py-4 px-4">
                  <button
                    onClick={() => setReassigningId(task.id)}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-lg hover:bg-blue-200"
                  >
                    Reassign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
