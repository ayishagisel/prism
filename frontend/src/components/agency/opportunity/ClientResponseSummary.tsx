interface ClientResponseSummaryProps {
  summary: any;
}

interface SummaryCard {
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

export default function ClientResponseSummary({ summary }: ClientResponseSummaryProps) {
  if (!summary) {
    return null;
  }

  const cards: SummaryCard[] = [
    {
      label: 'Total Clients',
      value: summary.total || 0,
      color: 'text-gray-800',
      bgColor: 'bg-gray-100',
    },
    {
      label: 'Pending',
      value: summary.pending || 0,
      color: 'text-gray-800',
      bgColor: 'bg-gray-100',
    },
    {
      label: 'Interested',
      value: summary.interested || 0,
      color: 'text-blue-800',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Accepted',
      value: summary.accepted || 0,
      color: 'text-green-800',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Declined',
      value: summary.declined || 0,
      color: 'text-red-800',
      bgColor: 'bg-red-100',
    },
    {
      label: 'No Response',
      value: summary.no_response || 0,
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-100',
    },
  ];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Response Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className={`${card.bgColor} rounded-lg p-4 text-center`}>
            <p className="text-sm text-gray-600 mb-2 font-medium">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
