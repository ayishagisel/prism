'use client';

import React, { useState } from 'react';
import { useTasks } from '@/lib/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusChip } from '@/components/common/StatusChip';
import { AddTaskModal } from '@/components/agency/AddTaskModal';
import { formatDistanceToNow } from 'date-fns';

export default function TasksPage() {
  const { tasks, loading } = useTasks();
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return <LoadingSpinner />;
  }

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const handleTaskSelect = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = (taskList: any[]) => {
    const newSelected = new Set(selectedTasks);
    taskList.forEach((task) => {
      newSelected.add(task.id);
    });
    setSelectedTasks(newSelected);
  };

  const handleExportReport = () => {
    // Prepare export data
    const exportData = {
      exportDate: new Date().toLocaleDateString(),
      summary: {
        pending: pendingTasks.length,
        inProgress: inProgressTasks.length,
        completed: completedTasks.length,
        total: tasks.length,
      },
      selectedCount: selectedTasks.size,
      tasks: tasks
        .filter((t) => selectedTasks.size === 0 || selectedTasks.has(t.id))
        .map((t) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.due_at ? new Date(t.due_at).toLocaleDateString() : 'No due date',
          description: t.description,
        })),
    };

    // Create CSV
    const headers = ['Task', 'Status', 'Priority', 'Due Date', 'Description'];
    const rows = exportData.tasks.map((t) => [
      t.title,
      t.status,
      t.priority || 'medium',
      t.dueDate,
      t.description || '',
    ]);

    const csvContent = [
      headers.join(','),
      `Export Date: ${exportData.exportDate}`,
      `Total Tasks: ${exportData.summary.total} | Pending: ${exportData.summary.pending} | In Progress: ${exportData.summary.inProgress} | Completed: ${exportData.summary.completed}`,
      '',
      ...rows.map((r) => r.map((v) => `"${v}"`).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-report-${new Date().getTime()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Follow-Up Tasks</h1>
          <p className="text-gray-600">Track and manage PR tasks</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={handleExportReport}
            className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition text-sm whitespace-nowrap"
          >
            📥 Export Report
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-red-700 transition text-sm whitespace-nowrap"
          >
            + Add Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="card">
          <p className="text-gray-600 text-sm font-medium">Pending</p>
          <p className="text-3xl font-bold text-primary mt-2">{pendingTasks.length}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm font-medium">In Progress</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{inProgressTasks.length}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm font-medium">Completed</p>
          <p className="text-3xl font-bold text-success mt-2">{completedTasks.length}</p>
        </div>
      </div>

      <TaskList
        title="Pending"
        tasks={pendingTasks}
        selectedTasks={selectedTasks}
        onTaskSelect={handleTaskSelect}
        onSelectAll={() => handleSelectAll(pendingTasks)}
      />
      <TaskList
        title="In Progress"
        tasks={inProgressTasks}
        selectedTasks={selectedTasks}
        onTaskSelect={handleTaskSelect}
        onSelectAll={() => handleSelectAll(inProgressTasks)}
      />
      {showCompleted && (
        <TaskList
          title="Completed"
          tasks={completedTasks}
          selectedTasks={selectedTasks}
          onTaskSelect={handleTaskSelect}
          onSelectAll={() => handleSelectAll(completedTasks)}
        />
      )}
      {completedTasks.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            {showCompleted ? '✕ Hide' : '+ Show'} Completed Tasks ({completedTasks.length})
          </button>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />
      )}
    </div>
  );
}

interface TaskListProps {
  title: string;
  tasks: any[];
  selectedTasks: Set<string>;
  onTaskSelect: (taskId: string) => void;
  onSelectAll: () => void;
}

function TaskList({ title, tasks, selectedTasks, onTaskSelect, onSelectAll }: TaskListProps) {
  if (tasks.length === 0) {
    return null;
  }

  const allSelected = tasks.length > 0 && tasks.every((t) => selectedTasks.has(t.id));

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {tasks.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onSelectAll}
              className="w-4 h-4 rounded cursor-pointer"
            />
            Select all
          </label>
        )}
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="card p-4 hover:shadow-md transition flex items-start gap-3">
            <input
              type="checkbox"
              checked={selectedTasks.has(task.id)}
              onChange={() => onTaskSelect(task.id)}
              className="w-4 h-4 mt-1 rounded cursor-pointer flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-4">
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
          </div>
        ))}
      </div>
    </div>
  );
}
