import React, { useState } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/hooks';

interface RestoreRequestButtonProps {
  opportunityId: string;
  opportunityTitle: string;
  clientId: string;
  hasDeadlinePassed: boolean;
  existingRestoreRequest?: {
    id: string;
    status: 'pending' | 'approved' | 'denied';
    requested_at: string;
  } | null;
  onRestoreRequested?: () => void;
}

export const RestoreRequestButton: React.FC<RestoreRequestButtonProps> = ({
  opportunityId,
  opportunityTitle,
  clientId,
  hasDeadlinePassed,
  existingRestoreRequest,
  onRestoreRequested,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Don't show button if deadline has passed
  if (hasDeadlinePassed) {
    return (
      <p className="text-sm text-gray-500 italic">
        This opportunity has expired
      </p>
    );
  }

  // Show different UI based on existing restore request status
  if (existingRestoreRequest) {
    if (existingRestoreRequest.status === 'pending') {
      return (
        <button
          disabled
          className="btn btn-secondary opacity-50 cursor-not-allowed"
        >
          Request Pending...
        </button>
      );
    }

    if (existingRestoreRequest.status === 'denied') {
      return (
        <div className="text-sm">
          <p className="text-red-600 font-medium">Request denied</p>
          <p className="text-gray-500 text-xs mt-1">
            Requested on {new Date(existingRestoreRequest.requested_at).toLocaleDateString()}
          </p>
        </div>
      );
    }

    // If approved, the opportunity should already be back in pending state
    // so this component shouldn't render in that case
  }

  const handleRequestRestore = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.createRestoreRequest({
        opportunity_id: opportunityId,
        client_id: clientId,
      });

      setShowModal(false);

      // Callback to refresh data
      if (onRestoreRequested) {
        onRestoreRequested();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit restore request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn btn-secondary"
      >
        Request Restore
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Request Restore</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <p className="text-gray-700 mb-4">
                Request to restore this opportunity?
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Opportunity:</strong> {opportunityTitle}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Your request will be sent to the AOPR team for review. If approved,
                this opportunity will be moved back to your "New" opportunities tab.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleRequestRestore}
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
