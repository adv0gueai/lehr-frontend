import React from 'react';

const AnalyzeModal = ({ open, onClose, objections, avgCallTime, avgEngagement, loading }) => {
  if (!open) return null;
  // Calculate total for percentage breakdown
  const total = objections.reduce((sum, obj) => sum + obj.count, 0);
  // Sort objections by count descending
  const sortedObjections = [...objections].sort((a, b) => b.count - a.count).slice(0, 3);

  // Skeleton shimmer for objections and engagement
  const SkeletonRow = () => (
    <div className="flex items-center mb-2 animate-pulse">
      <span className="bg-gray-200 rounded-full px-2 py-0.5 mr-2 text-xs font-bold w-8 h-5" />
      <span className="flex-1 h-4 bg-gray-200 rounded" />
      <span className="ml-2 w-10 h-4 bg-gray-200 rounded" />
    </div>
  );
  const SkeletonText = ({ width }) => (
    <div className={`h-4 bg-gray-200 rounded mb-1 animate-pulse`} style={{ width }} />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8 relative">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className="font-bold text-lg mb-4 flex items-center gap-2">
          <span role="img" aria-label="objections">🔹</span> Top 3 objections encountered (AI-tagged from call transcripts):
        </div>
        <div className="mb-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
            : sortedObjections.map((obj, idx) => (
                <div key={obj.label} className="flex items-center mb-2">
                  <span className="bg-blue-500 text-white rounded-full px-2 py-0.5 mr-2 text-xs font-bold">#{idx + 1}</span>
                  <span className="flex-1 text-gray-900">{obj.label}</span>
                  <span className="text-gray-500 text-xs ml-2">
                    {total > 0 ? `${((obj.count / total) * 100).toFixed(1)}%` : '0%'}
                  </span>
                </div>
              ))}
        </div>
        <div className="border-t border-gray-200 my-4" />
        <div className="font-bold text-lg mb-2 flex items-center gap-2">
          <span role="img" aria-label="heatmap">🔹</span>Engagement Heatmap
        </div>
        <div className="text-sm text-gray-700 mb-1">
          <strong>Average call time:</strong> {loading ? <SkeletonText width="80px" /> : avgCallTime}
        </div>
        <div className="text-sm text-gray-700 mb-4">
          <strong>Engagement:</strong> {loading ? <SkeletonText width="120px" /> : avgEngagement}
        </div>
        {/* Placeholder for heatmap visualization */}
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg mt-2"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AnalyzeModal; 