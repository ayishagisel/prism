'use client';

import React, { useState } from 'react';
import { useTasks } from '@/lib/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusChip } from '@/components/common/StatusChip';
import { AddTaskModal } from '@/components/agency/AddTaskModal';
import { EditTaskModal } from '@/components/agency/EditTaskModal';
import { apiClient } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function TasksPage() {
  const { tasks, loading } = useTasks();
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
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

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await apiClient.deleteTask(taskId);
      if (res.success) {
        window.dispatchEvent(new Event('storage'));
        setRefreshKey((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await apiClient.updateTask(taskId, { status: newStatus });
      if (res.success) {
        window.dispatchEvent(new Event('storage'));
        setRefreshKey((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#D32F2F] to-[#C62828] bg-clip-text text-transparent mb-2">
              Follow-Up Automation
            </h1>
            <p className="text-gray-600">System-generated reminders for accepted opportunities</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={handleExportReport}
              className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Report
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-[#D32F2F] to-[#C62828] hover:from-[#C62828] hover:to-[#B71C1C] text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{pendingTasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{completedTasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#3BB253]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Opportunities</p>
                <p className="text-3xl font-bold text-gray-900">{inProgressTasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Task Lists */}
        <TaskList
          title="In Progress"
          tasks={inProgressTasks}
          selectedTasks={selectedTasks}
          onTaskSelect={handleTaskSelect}
          onSelectAll={() => handleSelectAll(inProgressTasks)}
          onEdit={setEditingTask}
          onDelete={handleDeleteTask}
          onStatusChange={handleStatusChange}
        />
        <TaskList
          title="Pending"
          tasks={pendingTasks}
          selectedTasks={selectedTasks}
          onTaskSelect={handleTaskSelect}
          onSelectAll={() => handleSelectAll(pendingTasks)}
          onEdit={setEditingTask}
          onDelete={handleDeleteTask}
          onStatusChange={handleStatusChange}
        />
        {showCompleted && (
          <TaskList
            title="Completed"
            tasks={completedTasks}
            selectedTasks={selectedTasks}
            onTaskSelect={handleTaskSelect}
            onSelectAll={() => handleSelectAll(completedTasks)}
            onEdit={setEditingTask}
            onDelete={handleDeleteTask}
            onStatusChange={handleStatusChange}
          />
        )}
        {completedTasks.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              {showCompleted ? '- Hide' : '+ Show'} Completed Tasks ({completedTasks.length})
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

        {/* Edit Task Modal */}
        {editingTask && (
          <EditTaskModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSuccess={() => setRefreshKey((prev) => prev + 1)}
          />
        )}
      </div>
    </div>
  );
}

interface TaskListProps {
  title: string;
  tasks: any[];
  selectedTasks: Set<string>;
  onTaskSelect: (taskId: string) => void;
  onSelectAll: () => void;
  onEdit: (task: any) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

function TaskList({ title, tasks, selectedTasks, onTaskSelect, onSelectAll, onEdit, onDelete, onStatusChange }: TaskListProps) {
  if (tasks.length === 0) {
    return null;
  }

  const allSelected = tasks.length > 0 && tasks.every((t) => selectedTasks.has(t.id));

  const getNextStatus = (currentStatus: string) => {
    if (currentStatus === 'pending') return 'in_progress';
    if (currentStatus === 'in_progress') return 'completed';
    return 'pending';
  };

  const getStatusButtonLabel = (currentStatus: string) => {
    if (currentStatus === 'pending') return 'Start';
    if (currentStatus === 'in_progress') return 'Complete';
    return 'Reopen';
  };

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
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-gray-500">
                  {task.due_at ? (
                    <span>Due {formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}</span>
                  ) : (
                    <span>No due date</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onStatusChange(task.id, getNextStatus(task.status))}
                    className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition"
                  >
                    {getStatusButtonLabel(task.status)}
                  </button>
                  <button
                    onClick={() => onEdit(task)}
                    className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(task.id)}
                    className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
