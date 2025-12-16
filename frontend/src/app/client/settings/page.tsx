'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ClientSettingsPage() {
  const [notifications, setNotifications] = useState({
    email_new_opportunities: true,
    email_deadline_reminders: true,
    email_status_updates: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    setMessage({ type: 'success', text: 'Settings saved successfully' });
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link
        href="/client/dashboard"
        className="inline-flex items-center text-red-600 hover:text-red-700 mb-6"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {message && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">New Opportunity Alerts</p>
              <p className="text-sm text-gray-500">Get notified when new opportunities are assigned to you</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('email_new_opportunities')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications.email_new_opportunities ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications.email_new_opportunities ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Deadline Reminders</p>
              <p className="text-sm text-gray-500">Receive reminders before opportunity deadlines</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('email_deadline_reminders')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications.email_deadline_reminders ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications.email_deadline_reminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Status Updates</p>
              <p className="text-sm text-gray-500">Get notified when your response status changes</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('email_status_updates')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications.email_status_updates ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications.email_status_updates ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
        <div className="space-y-4">
          <Link
            href="/client/profile"
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900">Edit Profile</p>
              <p className="text-sm text-gray-500">Update your name and contact information</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/reset-password"
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900">Change Password</p>
              <p className="text-sm text-gray-500">Update your account password</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
