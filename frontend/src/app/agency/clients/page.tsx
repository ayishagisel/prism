'use client';

import React, { useState, useMemo } from 'react';
import { useClients } from '@/lib/hooks';
import { ClientCard } from '@/components/agency/ClientCard';
import { ClientDetailModal } from '@/components/agency/ClientDetailModal';
import { AddClientModal } from '@/components/agency/AddClientModal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Client } from '@/lib/types';
import { apiClient } from '@/lib/api';

export default function ClientsPage() {
  const { clients, loading, error } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.type?.toLowerCase().includes(query) ||
        client.company_name?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  // Calculate KPI metrics
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === 'active').length;
  const newThisMonth = clients.filter((c) => {
    const createdDate = new Date(c.created_at);
    const now = new Date();
    return (
      createdDate.getMonth() === now.getMonth() &&
      createdDate.getFullYear() === now.getFullYear()
    );
  }).length;

  const handleDeleteClient = async (clientId: string) => {
    // Delete endpoint would need to be added to backend if not present
    console.log('Delete client:', clientId);
    setRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Management</h1>
          <p className="text-gray-600">Manage your client roster and track engagement</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          + Add New Client
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-gray-600 text-sm font-medium">Total Clients</p>
          <p className="text-3xl font-bold text-primary mt-2">{totalClients}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm font-medium">Active Clients</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{activeClients}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm font-medium">New This Month</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{newThisMonth}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm font-medium">Avg. Response Rate</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">78%</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search clients by name, type, or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Client Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            {searchQuery ? 'No clients match your search' : 'No clients yet. Add your first client!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onViewDetails={setSelectedClient}
              onEdit={(client) => {
                // TODO: Implement edit functionality
                console.log('Edit client:', client);
              }}
              onDelete={handleDeleteClient}
            />
          ))}
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">
          Error loading clients: {error}
        </div>
      )}
    </div>
  );
}
