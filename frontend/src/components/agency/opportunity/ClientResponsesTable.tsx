'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { StatusChip } from '@/components/common/StatusChip';

interface ClientResponsesTableProps {
  statuses: any[];
  opportunityId: string;
  onStatusChange: (clientId: string, newStatus: string, notes?: string) => Promise<void>;
  onRefresh: () => void;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['interested', 'declined', 'no_response'],
  interested: ['accepted', 'declined'],
  accepted: [],
  declined: [],
  no_response: [],
};

export default function ClientResponsesTable({
  statuses,
  opportunityId,
  onStatusChange,
  onRefresh,
}: ClientResponsesTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>('');
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditClick = (status: any) => {
    setEditingId(status.id);
    setEditingStatus(status.response_state);
    setEditingNotes(status.notes_for_agency || '');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingStatus('');
    setEditingNotes('');
  };

  const handleSave = async (clientId: string) => {
    setIsSubmitting(true);
    try {
      await onStatusChange(clientId, editingStatus, editingNotes);
      setEditingId(null);
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (statuses.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Responses</h3>
        <p className="text-gray-500 text-center py-8">No client responses yet. This opportunity hasn't been assigned to clients.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Responses</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Client</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Responded</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Notes</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((status) => (
              <tr key={status.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <p className="font-medium text-gray-900">{status.client?.name || 'Unknown Client'}</p>
                </td>
                <td className="py-4 px-4">
                  {editingId === status.id ? (
                    <select
                      value={editingStatus}
                      onChange={(e) => setEditingStatus(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value={status.response_state}>{status.response_state}</option>
                      {VALID_TRANSITIONS[status.response_state]?.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <StatusChip status={status.response_state} />
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">
                  {status.responded_at
                    ? formatDistanceToNow(new Date(status.responded_at), { addSuffix: true })
                    : 'No response'}
                </td>
                <td className="py-4 px-4">
                  {editingId === status.id ? (
                    <textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="Add notes for the agency..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{status.notes_for_agency || '—'}</p>
                  )}
                </td>
                <td className="py-4 px-4">
                  {editingId === status.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(status.client_id)}
                        disabled={isSubmitting}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditClick(status)}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-lg hover:bg-blue-200"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
