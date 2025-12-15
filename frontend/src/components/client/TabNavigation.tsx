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
  const tabs: { id: TabType; label: string; badgeColor: string }[] = [
    { id: 'new', label: 'New', badgeColor: 'bg-[#D32F2F] text-white' },
    { id: 'interested', label: 'Interested', badgeColor: 'bg-blue-500 text-white' },
    { id: 'accepted', label: 'Accepted', badgeColor: 'bg-[#3BB253] text-white' },
    { id: 'declined', label: 'Declined', badgeColor: 'bg-gray-500 text-white' },
  ];

  return (
    <div className="w-full grid grid-cols-4 mb-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = counts[tab.id];

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all duration-200
              ${isActive
                ? 'bg-gradient-to-r from-gray-50 to-white text-gray-900 border-b-2 border-[#D32F2F]'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            {tab.label}
            <span
              className={`
                inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
                rounded-full text-xs font-bold
                ${tab.badgeColor}
              `}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default TabNavigation;
