'use client';

import React from 'react';
import { useTasks } from '@/lib/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusChip } from '@/components/common/StatusChip';
import { formatDistanceToNow } from 'date-fns';

export default function TasksPage() {
  const { tasks, loading } = useTasks();

  if (loading) {
    return <LoadingSpinner />;
  }

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Follow-Up Tasks</h1>
        <p className="text-gray-600">Track and manage PR tasks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm font-medium">Pending</p>
          <p className="text-3xl font-bold text-primary mt-2">{pendingTasks.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm font-medium">In Progress</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{inProgressTasks.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm font-medium">Completed</p>
          <p className="text-3xl font-bold text-success mt-2">{completedTasks.length}</p>
        </div>
      </div>

      <TaskList title="Pending" tasks={pendingTasks} />
      <TaskList title="In Progress" tasks={inProgressTasks} />
      <TaskList title="Completed" tasks={completedTasks} />
    </div>
  );
}

interface TaskListProps {
  title: string;
  tasks: any[];
}

function TaskList({ title, tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="card p-4 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{task.title}</p>
                {task.description && (
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                )}
              </div>
              <div className="ml-4 text-right flex-shrink-0">
                <StatusChip status={task.status} />
                <p className="text-xs text-gray-500 mt-2">
                  {task.priority?.toUpperCase()} Priority
                </p>
              </div>
            </div>
            {task.due_at && (
              <p className="text-xs text-gray-500 mt-3">
                Due {formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
