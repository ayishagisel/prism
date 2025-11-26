import React from 'react';

interface StatusChipProps {
  status: string;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, className = '' }) => {
  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'interested':
        return 'status-interested';
      case 'accepted':
        return 'status-accepted';
      case 'declined':
        return 'status-declined';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
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
