'use client';

import React, { useState } from 'react';
import { Client } from '@/lib/types';
import { apiClient } from '@/lib/api';

interface EditClientModalProps {
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditClientModal: React.FC<EditClientModalProps> = ({ client, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: client.name,
    company_name: client.company_name || '',
    industry: client.industry || '',
    primary_contact_email: client.primary_contact_email || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Build update payload - only include fields that changed or are required
      const updateData = {
        name: formData.name,
        company_name: formData.company_name,
        industry: formData.industry,
        primary_contact_email: formData.primary_contact_email,
      };

      const res = await apiClient.updateClient(client.id, updateData);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to update client');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Client</h2>
            <p className="text-gray-600 text-sm mt-1">Update client information</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-800 text-sm rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              name="company_name"
              placeholder="e.g., Acme Inc."
              value={formData.company_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <input
              type="text"
              name="industry"
              placeholder="e.g., Tech Startup"
              value={formData.industry}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Contact Email
            </label>
            <input
              type="email"
              name="primary_contact_email"
              placeholder="client@example.com"
              value={formData.primary_contact_email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
