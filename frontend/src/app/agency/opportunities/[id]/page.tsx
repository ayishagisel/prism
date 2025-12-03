'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useOpportunityDetail } from '@/lib/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import OpportunityDetailHeader from '@/components/agency/opportunity/OpportunityDetailHeader';
import OpportunityMetadata from '@/components/agency/opportunity/OpportunityMetadata';
import ClientResponseSummary from '@/components/agency/opportunity/ClientResponseSummary';
import ClientResponsesTable from '@/components/agency/opportunity/ClientResponsesTable';
import OpportunityTasksSection from '@/components/agency/opportunity/OpportunityTasksSection';
import ActivityLog from '@/components/agency/opportunity/ActivityLog';

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const opportunityId = params.id as string;
  const [refreshKey, setRefreshKey] = useState(0);

  const { opportunity, summary, statuses, tasks, activities, loading, error } = useOpportunityDetail(opportunityId);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleStatusChange = async (clientId: string, newStatus: string, notes?: string) => {
    try {
      // Call API to update status
      const response = await fetch(`/api/statuses/${clientId}/${opportunityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          response_state: newStatus,
          notes_for_agency: notes,
        }),
      });

      if (response.ok) {
        handleRefresh();
        console.log('Status updated successfully');
      } else {
        console.error('Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleTaskAssign = async (taskId: string, assigneeId: string | null) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          assigned_to_user_id: assigneeId,
        }),
      });

      if (response.ok) {
        handleRefresh();
        console.log('Task assigned successfully');
      } else {
        console.error('Failed to assign task');
      }
    } catch (err) {
      console.error('Error assigning task:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="mb-6 text-red-600 hover:text-red-700 font-medium"
        >
          ← Back to Opportunities
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Opportunity Not Found</h2>
          <p className="text-red-700">
            {error || 'This opportunity does not exist or you do not have access to it.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="mb-6 text-red-600 hover:text-red-700 font-medium text-sm"
      >
        ← Back to Opportunities
      </button>

      {/* Header Section */}
      <div className="mb-8">
        <OpportunityDetailHeader opportunity={opportunity} />
      </div>

      {/* Metadata Section */}
      <div className="mb-8">
        <OpportunityMetadata opportunity={opportunity} />
      </div>

      {/* Response Summary */}
      <div className="mb-8">
        <ClientResponseSummary summary={summary} />
      </div>

      {/* Client Responses Table */}
      <div className="mb-8">
        <ClientResponsesTable
          statuses={statuses}
          opportunityId={opportunityId}
          onStatusChange={handleStatusChange}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Tasks Section */}
      <div className="mb-8">
        <OpportunityTasksSection
          tasks={tasks}
          onTaskAssign={handleTaskAssign}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Activity Log */}
      <div className="mb-8">
        <ActivityLog activities={activities} />
      </div>
    </div>
  );
}
