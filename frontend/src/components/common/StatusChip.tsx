import React from 'react';

interface StatusChipProps {
  status: string;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, className = '' }) => {
  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      // Client response statuses
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'interested':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-gray-100 text-gray-600';
      case 'no_response':
        return 'bg-gray-100 text-gray-500';
      // Opportunity statuses
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-purple-100 text-purple-800';
      case 'paused':
        return 'bg-orange-100 text-orange-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      // Task statuses
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`status-badge ${getStatusClass(status)} ${className}`}>
      {status?.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
};
