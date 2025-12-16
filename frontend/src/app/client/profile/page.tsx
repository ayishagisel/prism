'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

export default function ClientProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiClient.getMe();
        if (res.success && res.data) {
          setUser(res.data);
          setFormData({
            name: res.data.name || '',
            email: res.data.email || '',
            phone: res.data.metadata?.phone || '',
            title: res.data.metadata?.title || '',
          });
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    // Simulate API call - in production this would update the user profile
    await new Promise((resolve) => setTimeout(resolve, 500));

    setMessage({ type: 'success', text: 'Profile updated successfully' });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link
        href="/client/settings"
        className="inline-flex items-center text-red-600 hover:text-red-700 mb-6"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Settings
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h1>

      {message && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-red-600">
                {formData.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{formData.name || 'User'}</p>
              <p className="text-sm text-gray-500">{formData.email}</p>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Form Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Contact your agency to change your email address</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title / Role</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., CEO, Founder, Marketing Director"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
