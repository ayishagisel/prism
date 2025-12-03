interface OpportunityMetadataProps {
  opportunity: any;
}

export default function OpportunityMetadata({ opportunity }: OpportunityMetadataProps) {
  const hasAnyTags =
    (opportunity.category_tags && opportunity.category_tags.length > 0) ||
    (opportunity.topic_tags && opportunity.topic_tags.length > 0) ||
    (opportunity.industry_tags && opportunity.industry_tags.length > 0);

  if (!hasAnyTags) {
    return null;
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags & Metadata</h3>

      {opportunity.category_tags && opportunity.category_tags.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2 font-medium">Category Tags</p>
          <div className="flex flex-wrap gap-2">
            {opportunity.category_tags.map((tag: string, idx: number) => (
              <span
                key={idx}
                className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {opportunity.topic_tags && opportunity.topic_tags.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2 font-medium">Topic Tags</p>
          <div className="flex flex-wrap gap-2">
            {opportunity.topic_tags.map((tag: string, idx: number) => (
              <span
                key={idx}
                className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {opportunity.industry_tags && opportunity.industry_tags.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2 font-medium">Industry Tags</p>
          <div className="flex flex-wrap gap-2">
            {opportunity.industry_tags.map((tag: string, idx: number) => (
              <span
                key={idx}
                className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
