import React from 'react';

const MetricCard = ({ title, value, change, icon: Icon, trend, color, gradientFrom, gradientTo }) => {
  // Define gradient classes based on card type
  const getGradientClass = () => {
    if (gradientFrom && gradientTo) {
      return `bg-gradient-to-br from-${gradientFrom} to-${gradientTo}`;
    }
    
    // Default gradients based on title or color
    switch (title) {
      case 'Total Leads':
        return 'bg-gradient-to-br from-blue-500 to-blue-600';
      case 'Inbound Calls Received':
        return 'bg-gradient-to-br from-purple-500 to-purple-600';
      case 'Email Sent':
        return 'bg-gradient-to-br from-orange-500 to-orange-600';
      default:
        return 'bg-gradient-to-br from-indigo-500 to-indigo-600';
    }
  };

  // Define icons based on title if none provided
  const getIcon = () => {
    if (Icon) return <Icon className="w-6 h-6 text-white" />;
    
    switch (title) {
      case 'Total Leads':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'Inbound Calls Received':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      case 'Voicemail Sent':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        );
      case 'Email Sent':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
    }
  };

  return (
    <div className={`
      relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 transform cursor-pointer
      ${getGradientClass()}
    `}>
      {/* Background decoration */}
      <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Decorative circles */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
      <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-white/10 rounded-full"></div>
      
      <div className="relative p-6">
        {/* Header with icon and trend */}
        <div className="flex items-start justify-between mb-6">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            {getIcon()}
          </div>
          {change && (
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 backdrop-blur-sm">
              {trend === 'up' ? (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V8m0 9h-9" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7l9.2 9.2M17 7v9m0-9h-9" />
                </svg>
              )}
              <span className="text-white font-semibold text-sm">{change}</span>
            </div>
          )}
        </div>
        
        {/* Value */}
        <div className="mb-2">
          <span className="text-3xl font-bold text-white">{value?.toLocaleString?.() || value}</span>
        </div>
        
        {/* Title */}
        <div>
          <span className="text-white/90 text-sm font-medium">{title}</span>
        </div>
      </div>
    </div>
  );
};

// Skeleton loader for MetricCard
export const MetricCardSkeleton = () => (
  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse">
    <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
    <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-white/10 rounded-full"></div>
    
    <div className="relative p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="w-12 h-12 bg-white/30 rounded-xl"></div>
        <div className="w-16 h-6 bg-white/30 rounded-full"></div>
      </div>
      
      <div className="mb-2">
        <div className="w-20 h-8 bg-white/30 rounded"></div>
      </div>
      
      <div>
        <div className="w-24 h-4 bg-white/30 rounded"></div>
      </div>
    </div>
  </div>
);

export default MetricCard;