import React, { useState } from 'react';
import { apiClient } from '@/lib/api';
import { MEDIA_TYPES, OPPORTUNITY_TYPES } from '@/lib/constants';

interface NewOpportunityFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const NewOpportunityForm: React.FC<NewOpportunityFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    media_type: 'feature_article',
    outlet_name: '',
    opportunity_type: 'PR',
    deadline_at: '',
    category_tags: '',
    topic_tags: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        category_tags: formData.category_tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        topic_tags: formData.topic_tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const res = await apiClient.createOpportunity(payload);

      if (res.success) {
        setFormData({
          title: '',
          summary: '',
          media_type: 'feature_article',
          outlet_name: '',
          opportunity_type: 'PR',
          deadline_at: '',
          category_tags: '',
          topic_tags: '',
        });
        onSuccess?.();
      } else {
        setError(res.error || 'Failed to create opportunity');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating opportunity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl">
      <h2 className="text-xl font-bold mb-6 text-gray-900">New Opportunity</h2>

      {error && <div className="bg-red-100 text-red-800 p-4 rounded mb-4 text-sm">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
          <textarea
            name="summary"
            value={formData.summary}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, summary: e.target.value }))
            }
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Media Type <span className="text-red-500">*</span>
            </label>
            <select
              name="media_type"
              value={formData.media_type}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {MEDIA_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opportunity Type <span className="text-red-500">*</span>
            </label>
            <select
              name="opportunity_type"
              value={formData.opportunity_type}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {OPPORTUNITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Name</label>
          <input
            type="text"
            name="outlet_name"
            value={formData.outlet_name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
          <input
            type="datetime-local"
            name="deadline_at"
            value={formData.deadline_at}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Tags (comma-separated)
            </label>
            <input
              type="text"
              name="category_tags"
              value={formData.category_tags}
              onChange={handleChange}
              placeholder="e.g., founder, women-led, tech"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic Tags (comma-separated)
            </label>
            <input
              type="text"
              name="topic_tags"
              value={formData.topic_tags}
              onChange={handleChange}
              placeholder="e.g., scaling, fundraising"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Opportunity'}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
};
