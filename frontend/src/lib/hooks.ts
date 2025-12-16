import { useEffect, useState } from 'react';
import { apiClient } from './api';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await apiClient.getMe();
        if (res.success) {
          setUser(res.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auth error');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (err) {
      // Even if logout fails, we still want to clear local user state
      console.warn('Logout API error (continuing with local logout)', err);
    } finally {
      // Always clear user state and tokens on logout
      setUser(null);
      setError(null);
    }
  };

  return { user, loading, error, logout };
}

export function useOpportunities(refreshTrigger?: number) {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalTrigger, setInternalTrigger] = useState(0);

  const refetch = () => {
    setInternalTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await apiClient.getOpportunities();
        if (res.success) {
          setOpportunities(res.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [refreshTrigger, internalTrigger]);

  return { opportunities, loading, error, refetch };
}

export function useClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.getClients();
        if (res.success) {
          setClients(res.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  return { clients, loading, error };
}

export function useTasks(refreshTrigger?: number) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.getTasks();
        if (res.success) {
          setTasks(res.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [refreshTrigger]);

  return { tasks, loading, error };
}

export function useOpportunityDetail(opportunityId: string) {
  const [opportunity, setOpportunity] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all data in parallel for performance
        const [oppRes, summaryRes, statusesRes, tasksRes] = await Promise.all([
          apiClient.getOpportunity(opportunityId),
          apiClient.getOpportunitySummary(opportunityId),
          apiClient.getClientOpportunityStatuses(opportunityId),
          apiClient.getTasksByOpportunity(opportunityId),
        ]);

        if (oppRes.success) {
          setOpportunity(oppRes.data);
        }

        if (summaryRes.success) {
          setSummary(summaryRes.data);
        }

        if (statusesRes.success) {
          setStatuses(statusesRes.data || []);
        }

        if (tasksRes.success) {
          setTasks(tasksRes.data || []);
        }

        // TODO: Fetch activities/audit log when endpoint is available
        // For now, we'll leave activities as empty array
        setActivities([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch opportunity details');
        console.error('useOpportunityDetail error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (opportunityId) {
      fetch();
    }
  }, [opportunityId]);

  return { opportunity, summary, statuses, tasks, activities, loading, error };
}
