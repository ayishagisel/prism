'use client';

import React from 'react';

type TabType = 'new' | 'interested' | 'accepted' | 'declined';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: {
    new: number;
    interested: number;
    accepted: number;
    declined: number;
  };
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, counts }) => {
  const tabs: { id: TabType; label: string; color: string; bgColor: string; borderColor: string }[] = [
    {
      id: 'new',
      label: 'New',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500'
    },
    {
      id: 'interested',
      label: 'Interested',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500'
    },
    {
      id: 'accepted',
      label: 'Accepted',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500'
    },
    {
      id: 'declined',
      label: 'Declined',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-500'
    },
  ];

  return (
    <div className="border-b border-gray-200">
      <div className="flex space-x-8">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative pb-4 px-1 text-sm font-medium transition-colors
                ${isActive
                  ? `${tab.color} border-b-2 ${tab.borderColor}`
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                <span
                  className={`
                    inline-flex items-center justify-center min-w-[24px] h-6 px-2
                    rounded-full text-xs font-semibold
                    ${isActive
                      ? `${tab.bgColor} ${tab.color}`
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}
                >
                  {counts[tab.id]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabNavigation;
