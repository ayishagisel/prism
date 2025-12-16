'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

interface Client {
  id: string;
  name: string;
  industry?: string;
}

interface AssignClientsModalProps {
  opportunityId: string;
  clients: Client[];
  assignedClientIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignClientsModal({
  opportunityId,
  clients,
  assignedClientIds,
  onClose,
  onSuccess,
}: AssignClientsModalProps) {
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out already assigned clients
  const availableClients = clients.filter(
    (client) => !assignedClientIds.includes(client.id)
  );

  const handleClientToggle = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSubmit = async () => {
    if (selectedClientIds.length === 0) {
      setError('Please select at least one client');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiClient.assignClientsToOpportunity(opportunityId, selectedClientIds);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to assign clients');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign clients');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Assign Clients</h2>
          <p className="text-sm text-gray-500 mt-1">
            Select clients to assign to this opportunity
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {availableClients.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              All clients have already been assigned to this opportunity.
            </p>
          ) : (
            <div className="space-y-2">
              {availableClients.map((client) => (
                <label
                  key={client.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedClientIds.includes(client.id)}
                    onChange={() => handleClientToggle(client.id)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{client.name}</p>
                    {client.industry && (
                      <p className="text-xs text-gray-500">{client.industry}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || availableClients.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Assigning...' : `Assign ${selectedClientIds.length > 0 ? `(${selectedClientIds.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
