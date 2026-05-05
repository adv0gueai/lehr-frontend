import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const LeadSources = ({ leadSourceData }) => (
  <div className="bg-white rounded-2xl shadow-none p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-6">Lead Sources</h2>
    <div className="h-52 mb-6">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={leadSourceData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {leadSourceData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${value}%`, 'Percentage']}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
    <div>
      {leadSourceData.map((source, index) => (
        <div key={index} className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
            <span className="text-gray-500 text-sm">{source.name}</span>
          </div>
          <span className="font-semibold text-sm">{source.value}%</span>
        </div>
      ))}
    </div>
  </div>
);

export default LeadSources; 