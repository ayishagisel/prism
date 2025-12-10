'use client';

import { useState } from 'react';
import ViewToggle from '@/components/demo/ViewToggle';
import { demoOpportunities, demoClients, demoStats, demoTasks } from '@/lib/demoData';

type ViewType = 'agency' | 'client';

export default function DemoPage() {
  const [currentView, setCurrentView] = useState<ViewType>('agency');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PRISM</h1>
                <p className="text-sm text-gray-500">Public Relations Intelligence System for Media</p>
              </div>
            </div>
            <ViewToggle currentView={currentView} onViewChange={setCurrentView} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'agency' ? <AgencyView /> : <ClientView />}
      </main>
    </div>
  );
}

function AgencyView() {
  const newOpps = demoOpportunities.filter(o => o.responseState === 'pending');
  const interestedOpps = demoOpportunities.filter(o => o.responseState === 'interested');
  const acceptedOpps = demoOpportunities.filter(o => o.responseState === 'accepted');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-red-600 mb-2">PR Team Dashboard</h2>
        <p className="text-gray-600">✨ Real-time monitoring powered by PRISM AI</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Opportunities</p>
              <p className="text-3xl font-bold text-gray-900">{demoStats.activeOpportunities}</p>
              <p className="text-xs text-red-600 mt-1">↗ +3 this week</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-xl">⚡</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Response Time</p>
              <p className="text-3xl font-bold text-gray-900">{demoStats.avgResponseTime} days</p>
              <p className="text-xs text-blue-600 mt-1">↗ 15% faster</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-xl">⏱️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Accepted</p>
              <p className="text-3xl font-bold text-gray-900">{demoStats.accepted}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-xl">✓</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Interested</p>
              <p className="text-3xl font-bold text-gray-900">{demoStats.interested}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-xl">💜</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Response Rate */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl">📊</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">Overall Response Rate</p>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full"
                  style={{ width: `${demoStats.overallResponseRate}%` }}
                ></div>
              </div>
              <span className="text-2xl font-bold text-gray-900">{demoStats.overallResponseRate}%</span>
              <span className="text-sm text-gray-500">of total opportunities</span>
            </div>
          </div>
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">All Active Opportunities</h3>
          <p className="text-sm text-gray-500">Monitoring {demoOpportunities.length} media placements</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Media Opportunity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deadline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client Response
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {demoOpportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{opp.title}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {opp.opportunityType}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {opp.mediaType}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{opp.clientName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{new Date(opp.deadline).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {opp.responseState === 'pending' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⏳ Pending
                      </span>
                    )}
                    {opp.responseState === 'interested' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        💙 Interested
                      </span>
                    )}
                    {opp.responseState === 'accepted' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Accepted
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Follow-Up Tasks</h3>
          <p className="text-sm text-gray-500">{demoTasks.length} active tasks</p>
        </div>
        <div className="p-6 space-y-4">
          {demoTasks.map((task) => (
            <div key={task.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
              <input type="checkbox" className="mt-1" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{task.title}</p>
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>Assigned to: {task.assignedTo}</span>
                  <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {task.status === 'pending' ? 'Pending' : 'In Progress'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClientView() {
  const newOpps = demoOpportunities.filter(o => o.responseState === 'pending');
  const interestedOpps = demoOpportunities.filter(o => o.responseState === 'interested');
  const acceptedOpps = demoOpportunities.filter(o => o.responseState === 'accepted');
  const declinedOpps = demoOpportunities.filter(o => o.responseState === 'declined');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-red-600 mb-2">Your Media Opportunities</h2>
        <p className="text-gray-600">Notifications via email or PRISM app • Use "Interested" or "Accept" buttons</p>
      </div>

      {/* Alert Banner */}
      {newOpps.length > 0 && (
        <div className="bg-red-500 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-bold">You have {newOpps.length} new opportunit{newOpps.length === 1 ? 'y' : 'ies'}!</p>
              <p className="text-sm">Review and respond before the deadlines to secure your placement.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b border-gray-200">
          <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300">
            New <span className="ml-2 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs">{newOpps.length}</span>
          </button>
          <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300">
            Interested <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">{interestedOpps.length}</span>
          </button>
          <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300">
            Accepted <span className="ml-2 bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">{acceptedOpps.length}</span>
          </button>
          <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300">
            Declined <span className="ml-2 bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs">{declinedOpps.length}</span>
          </button>
        </div>

        {/* Opportunity Cards Preview */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 italic">
            📝 Opportunity cards will be rendered here (being built in parallel by Instance 3)
          </p>

          {/* Sample Card Placeholders */}
          {interestedOpps.slice(0, 2).map((opp) => (
            <div key={opp.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{opp.title}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      {opp.opportunityType}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Interested
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mb-4">{opp.summary}</p>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span>Media Type: {opp.mediaType}</span>
                <span>Deadline: {new Date(opp.deadline).toLocaleDateString()}</span>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm text-blue-800">
                  💙 You've expressed interest in this opportunity. Ask questions or accept when ready.
                </p>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600">
                  ✓ Accept Now
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                  💬 Q&A Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note about parallel build */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Demo Note:</strong> This client view is being actively developed in parallel.
          The full dashboard with all 4 tabs (New/Interested/Accepted/Declined) is being built
          by Instance 2, and detailed opportunity cards are being built by Instance 3.
        </p>
      </div>
    </div>
  );
}
