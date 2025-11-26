'use client';

import React, { useState } from 'react';
import { Client } from '@/lib/types';

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

  // Generate avatar background color based on first letter
  const getAvatarColor = (name: string) => {
    const colors = ['#DC2626', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    const charCode = name.charCodeAt(0);
    return colors[charCode % colors.length];
  };

  const initials = client.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Count responses by status (mock data based on seed)
  const totalResponses = 3;
  const acceptedResponses = 1;
  const interestedResponses = 1;
  const pendingResponses = 1;

  return (
    <div className="card p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div
            style={{ backgroundColor: getAvatarColor(client.name) }}
            className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-lg"
          >
            {initials}
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">{client.name}</h3>
            <p className="text-sm text-gray-600">{client.type || 'Client'}</p>
            <div className="flex gap-2 mt-2">
              {client.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
            Active
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
        {client.contact_email && (
          <div className="flex items-center gap-2">
            <span>📧</span>
            <span>{client.contact_email}</span>
          </div>
        )}
        {client.contact_phone && (
          <div className="flex items-center gap-2">
            <span>📞</span>
            <span>{client.contact_phone}</span>
          </div>
        )}
        {client.created_at && (
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>Joined {new Date(client.created_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4 text-center text-sm">
        <div>
          <div className="font-bold text-gray-900">{totalResponses}</div>
          <div className="text-xs text-gray-600">Total</div>
        </div>
        <div>
          <div className="font-bold text-green-600">{acceptedResponses}</div>
          <div className="text-xs text-gray-600">Accepted</div>
        </div>
        <div>
          <div className="font-bold text-blue-600">{interestedResponses}</div>
          <div className="text-xs text-gray-600">Interested</div>
        </div>
        <div>
          <div className="font-bold text-yellow-600">{pendingResponses}</div>
          <div className="text-xs text-gray-600">Pending</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onViewDetails(client)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-gray-900 bg-gray-100 hover:bg-gray-200 rounded font-medium text-sm transition"
        >
          👁️ View
        </button>
        <button
          onClick={() => onEdit(client)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-gray-900 bg-gray-100 hover:bg-gray-200 rounded font-medium text-sm transition"
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded font-medium text-sm transition"
        >
          🗑️
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800 mb-2">Delete "{client.name}"?</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onDelete(client.id);
                setShowDeleteConfirm(false);
              }}
              className="flex-1 px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
