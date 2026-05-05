import React from 'react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="mb-2 font-semibold text-sm text-gray-900">{label}</div>
        {payload.map((entry, index) => (
          <div key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default CustomTooltip; 