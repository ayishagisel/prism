import React from 'react';

interface MediaTypeBadgeProps {
  mediaType: string;
}

export const MediaTypeBadge: React.FC<MediaTypeBadgeProps> = ({ mediaType }) => {
  const getLabel = (type: string) => {
    const labels: Record<string, string> = {
      feature_article: 'Article',
      news_brief: 'News',
      panel: 'Panel',
      podcast: 'Podcast',
      tv_appearance: 'TV',
      speaking_engagement: 'Speaking',
      event: 'Event',
      other: 'Other',
    };
    return labels[type] || type;
  };

  return <span className="media-badge">{getLabel(mediaType)}</span>;
};
