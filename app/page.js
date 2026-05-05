'use client';

import Sidebar, { useSidebar } from './components/Sidebar';
import Header from './components/Header';
import MetricCard, { MetricCardSkeleton } from './components/MetricCard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from './context/ThemeContext';
import { getBaseUrl } from './lib/utils';

export default function Dashboard() {
  const { isExpanded } = useSidebar();
  const [timeFilter, setTimeFilter] = useState('all_time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { isDark } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper to prepare request body based on timeFilter
  function getTimeFilterBody() {
    switch (timeFilter) {
      case 'today':
        return { time_filter: 'today' };
      case 'last_7_days':
        return { time_filter: 'last_7_days' };
      case 'last_30_days':
        return { time_filter: 'last_30_days' };
      case 'all_time':
        return { time_filter: 'all_time' };
      case 'custom':
        return { 
          time_filter: 'custom',
          start_date: customStartDate,
          end_date: customEndDate
        };
      default:
        return { time_filter: 'last_30_days' };
    }
  }

  useEffect(() => {
    if (typeof document !== 'undefined' && !document.cookie.includes('jwt=')) {
      router.replace('/login');
    }
  }, [router]);

  // Fetch dashboard metrics for selected range.
  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      setError(null);
      try {
        const requestBody = getTimeFilterBody();
        const res = await fetch(`${getBaseUrl()}/dashboard-kpi-comprehensive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        if (!res.ok) throw new Error('Failed to fetch metrics');
        const data = await res.json();
        
        // Use the comprehensive KPI response structure
        const kpis = data.kpis || {};
        const transformedMetrics = {
          // Table counts KPI
          table_counts: kpis.table_counts || {},
          
          // Appointment metrics
          appointment_metrics: kpis.appointment_metrics || {},
          
          // Lead metrics
          lead_metrics: kpis.lead_metrics || {},
          
          // Call metrics
          call_metrics: kpis.call_metrics || {},
          
          // Business metrics
          business_metrics: kpis.business_metrics || {},
          
          // Trends
          trends: kpis.trends || {},
          
          // Time period info
          time_period: data.time_period,
          date_range: data.date_range,
          
          // Additional compatibility with existing UI
          total_leads: {
            count: kpis.table_counts?.leads || kpis.lead_metrics?.total_leads || 0,
            percent: kpis.trends?.lead_growth_percentage || 12
          },
          total_inbound_calls_received: {
            count: kpis.call_metrics?.total_calls || 0,
            percent: 8
          },
          total_voicemail_sent: {
            count: kpis.business_metrics?.voicemails_sent || 0,
            percent: 12
          },
          total_email_sent: {
            count: kpis.business_metrics?.sms_follow_ups_sent || 0,
            percent: 0
          },
          total_qualified_leads: {
            count: kpis.lead_metrics?.qualified_leads || 0,
            percent: kpis.lead_metrics?.qualification_rate || 0
          },
          qualification_rate: kpis.lead_metrics?.qualification_rate || 0,
          total_quotes: kpis.appointment_metrics?.total_appointments || 0,
          total_assistant_calls: {
            count: kpis.call_metrics?.total_calls || 0,
            percent: 15
          },
          call_success_rate: kpis.call_metrics?.call_success_rate || 0,
          total_successful_calls: kpis.call_metrics?.successful_calls || 0,
          avg_call_time: kpis.call_metrics?.average_call_duration || '0m 0s',
          
          // For existing components compatibility
          sentiment_distribution: {},
          total_service_requests: 0,
          service_requests_by_status: {},
          quote_related_calls: 0,
          service_related_calls: 0,
          total_chat_messages: 0,
          chat_messages_by_type: {},
          avg_qualification_score: 0,
          engagement_percent: 'Leads stay on the line for 100% of the call.',
          top_three_objections: []
        };
        
        setMetrics(transformedMetrics);
      } catch (err) {
        setError(err.message || 'Error fetching metrics');
        // Fallback to default values if API fails (matching the design)
        setMetrics({
          total_leads: { count: 88632, percent: 12 },
          total_inbound_calls_received: { count: 35625, percent: 8 },
          total_voicemail_sent: { count: 6328, percent: 5 },
          total_email_sent: { count: 2547, percent: 15 },
          avg_call_time: '4m 32s',
          engagement_percent: 'Leads stay on the line for 100% of the call.',
          top_three_objections: []
        });
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [timeFilter, customStartDate, customEndDate]);

  // Keep KPI cards fresh without manual reload.
  useEffect(() => {
    const intervalId = setInterval(() => {
      async function refreshMetrics() {
        try {
          const requestBody = getTimeFilterBody();
          const res = await fetch(`${getBaseUrl()}/dashboard-kpi-comprehensive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          if (!res.ok) return;
          const data = await res.json();
          const kpis = data.kpis || {};
          setMetrics((prev) => ({
            ...(prev || {}),
            table_counts: kpis.table_counts || {},
            appointment_metrics: kpis.appointment_metrics || {},
            lead_metrics: kpis.lead_metrics || {},
            call_metrics: kpis.call_metrics || {},
            business_metrics: kpis.business_metrics || {},
            trends: kpis.trends || {},
            time_period: data.time_period,
            date_range: data.date_range,
            total_leads: {
              count: kpis.table_counts?.leads || kpis.lead_metrics?.total_leads || 0,
              percent: kpis.trends?.lead_growth_percentage || 12
            },
            total_inbound_calls_received: {
              count: kpis.call_metrics?.total_calls || 0,
              percent: 8
            },
            total_voicemail_sent: {
              count: kpis.business_metrics?.voicemails_sent || 0,
              percent: 12
            },
            total_email_sent: {
              count: kpis.business_metrics?.sms_follow_ups_sent || 0,
              percent: 0
            },
            total_qualified_leads: {
              count: kpis.lead_metrics?.qualified_leads || 0,
              percent: kpis.lead_metrics?.qualification_rate || 0
            },
            qualification_rate: kpis.lead_metrics?.qualification_rate || 0,
            total_quotes: kpis.appointment_metrics?.total_appointments || 0,
            total_assistant_calls: {
              count: kpis.call_metrics?.total_calls || 0,
              percent: 15
            },
            call_success_rate: kpis.call_metrics?.call_success_rate || 0,
            total_successful_calls: kpis.call_metrics?.successful_calls || 0,
            avg_call_time: kpis.call_metrics?.average_call_duration || '0m 0s',
          }));
        } catch (_err) {
          // Silent refresh failure; keep existing metrics until next tick.
        }
      }
      refreshMetrics();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [timeFilter, customStartDate, customEndDate]);



  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/10 to-purple-500/10 blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-gradient-to-tr from-pink-400/10 to-blue-500/10 blur-3xl"></div>
        <div className="absolute -bottom-32 right-1/4 w-80 h-80 rounded-full bg-gradient-to-tl from-green-400/10 to-cyan-500/10 blur-3xl"></div>
      </div>

      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isExpanded ? 'lg:ml-64' : 'lg:ml-12'} ml-0`}>
        <Header />
        
        {/* Main Dashboard Content */}
        <main className="px-6 lg:px-8 py-6 space-y-8">
          {/* Filters Section */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex gap-3">
                <select
                  className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="all_time">All Time</option>
                  <option value="custom">Custom Range</option>
                </select>
                
                {timeFilter === 'custom' && (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      placeholder="Start Date"
                    />
                    <input
                      type="date"
                      className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      placeholder="End Date"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Primary Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <MetricCardSkeleton key={i} />
              ))
            ) : error ? (
              <div className="col-span-4 text-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            ) : metrics ? (
              <>
                <MetricCard
                  title="Total Leads"
                  value={metrics.table_counts?.leads || 0}
                  change={`+${metrics.trends?.lead_growth_percentage || 0}%`}
                  trend="up"
                />
                <MetricCard
                  title="Appointments"
                  value={metrics.table_counts?.appointments || 0}
                  change={`+${metrics.appointment_metrics?.success_rate || 0}%`}
                  trend="up"
                />
                <MetricCard
                  title="Call Success Rate"
                  value={`${metrics.call_metrics?.call_success_rate || 0}%`}
                  change={`${metrics.call_metrics?.successful_calls || 0} successful`}
                  trend="up"
                />
                <MetricCard
                  title="Total Calls"
                  value={metrics.table_counts?.call_analyzed || 0}
                  change={`${metrics.call_metrics?.average_call_duration || '0m 0s'} avg`}
                  trend="up"
                />
              </>
            ) : (
              <div className="col-span-4 text-center p-8">
                <p className="text-gray-500 dark:text-gray-400">No metrics available</p>
              </div>
            )}
          </div>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
            {metrics && (
              <>
                <div className="modern-card p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.lead_metrics?.total_leads || 0}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Leads</div>
                    <div className="text-xs text-green-600 dark:text-green-400">{metrics.lead_metrics?.qualification_rate || 0}% qualified</div>
                  </div>
                </div>
                <div className="modern-card p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{metrics.lead_metrics?.qualified_leads || 0}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Qualified Leads</div>
                    <div className="text-xs text-green-600 dark:text-green-400">{metrics.lead_metrics?.disqualified_leads || 0} disqualified</div>
                  </div>
                </div>
                <div className="modern-card p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{metrics.appointment_metrics?.total_appointments || 0}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Appointments</div>
                    <div className="text-xs text-green-600 dark:text-green-400">{metrics.appointment_metrics?.success_rate || 0}% success</div>
                  </div>
                </div>
                <div className="modern-card p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{metrics.lead_metrics?.leads_with_appointments || 0}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Leads with Appointments</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">{metrics.lead_metrics?.appointment_conversion_rate || 0}% conversion</div>
                  </div>
                </div>
                <div className="modern-card p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{metrics.call_metrics?.average_call_duration || '0m 0s'}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Avg Call Duration</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{metrics.call_metrics?.successful_calls || 0} successful</div>
                  </div>
                </div>
                <div className="modern-card p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{metrics.business_metrics?.total_follow_ups || 0}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Follow-ups</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{metrics.business_metrics?.average_follow_ups_per_lead || 0} avg/lead</div>
                  </div>
                </div>
              </>
            )}
          </div>



          {/* Additional KPI Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Appointment Details */}
            <div className="modern-card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                Appointment Details
              </h3>
              {metrics?.appointment_metrics && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Successful Appointments</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{metrics.appointment_metrics?.successful_appointments || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Failed Appointments</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">{metrics.appointment_metrics?.failed_appointments || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{metrics.appointment_metrics?.success_rate || 0}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Business Metrics */}
            <div className="modern-card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                Business Metrics
              </h3>
              {metrics?.business_metrics && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Follow-ups</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{metrics.business_metrics?.total_follow_ups || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Voicemails Sent</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{metrics.business_metrics?.voicemails_sent || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">SMS Follow-ups Sent</span>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">{metrics.business_metrics?.sms_follow_ups_sent || 0}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trends */}
            <div className="modern-card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                Lead Growth Trends
              </h3>
              {metrics?.trends && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Previous Period Leads</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">{metrics.trends?.previous_period_leads || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Current Period Leads</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{metrics.trends?.current_period_leads || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Growth Rate</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{metrics.trends?.lead_growth_percentage || 0}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Call Metrics Details */}
            <div className="modern-card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                Call Performance
              </h3>
              {metrics?.call_metrics && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Calls</span>
                    <span className="font-semibold text-cyan-600 dark:text-cyan-400">{metrics.call_metrics?.total_calls || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Successful Calls</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{metrics.call_metrics?.successful_calls || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{metrics.call_metrics?.average_call_duration || '0m 0s'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>


        </main>
      </div>
    </div>
  );
}
