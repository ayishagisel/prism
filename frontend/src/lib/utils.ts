/**
 * Get client name by client ID from a list of clients
 * @param clientId - The client ID to look up
 * @param clients - Array of client objects with id and name properties
 * @returns The client name or 'Unknown Client' if not found
 */
export function getClientName(clientId: string, clients: { id: string; name: string }[]): string {
  const client = clients.find((c) => c.id === clientId);
  return client?.name || 'Unknown Client';
}
