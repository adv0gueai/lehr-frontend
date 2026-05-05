import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { getBaseUrl } from '../lib/utils';

const SERIES = {
  leads: { label: 'Leads', color: '#3B82F6' },
  inbound: { label: 'Inbound Calls Received', color: '#8B5CF6' },
  voicemails: { label: 'Voicemails Sent', color: '#10B981' },
  emails: { label: 'Emails Sent', color: '#F59E0B' },
};

const TotalsTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{label}</div>
        <div className="space-y-1">
          {payload.map((p, i) => {
            const key = p.dataKey || p.name; // prefer dataKey for reliable mapping
            const meta = SERIES[key] || {};
            const color = p.stroke || p.color || meta.color || '#3B82F6';
            const labelText = meta.label || key;
            return (
              <div key={i} className="text-sm flex items-center gap-2" style={{ color }}>
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-medium">{labelText}:</span>
                <span>{(p.value ?? 0).toLocaleString?.() ?? p.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const PerformanceOverview = ({ dateType = 'All', agentType = 'property' }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [range, setRange] = useState(null);

  // Helper to get start and end dates based on dateType
  const getDateRange = (type) => {
    const today = new Date();
    let start, end;
    end = new Date(today);

    switch (type) {
      case 'daily':
        start = new Date(today);
        break;
      case 'weekly':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        break;
      case 'monthly':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        break;
      default:
        start = new Date(today);
        start.setDate(today.getDate() - 7); // Default to last 7 days
    }

    const fmt = (d) => d.toISOString().slice(0, 10);
    return { start_date: fmt(start), end_date: fmt(end) };
  };

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { start_date, end_date } = getDateRange(String(dateType || 'All').toLowerCase());
        const res = await fetch(`${getBaseUrl()}/leads/graph-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date_type: String(dateType || 'All').toLowerCase(),
            agent_type: agentType
          }),
        });
        if (!res.ok) throw new Error('Failed to fetch graph data');
        const data = await res.json();
        const totals = data.totals || {};
        const r = data.range || {};
        const startLabel = r.start_date || 'Start';
        const endLabel = r.end_date || 'End';

        const leads = Number(totals.leads ?? 0);
        const inbound = Number(totals.inbound_call_recieved ?? 0);
        const voicemails = Number(totals.voicemails_sent ?? 0);
        const emails = Number(totals.emails_sent ?? 0);

        // Create two points so each metric originates at 0 and reaches the total at the end
        const points = [
          { name: startLabel, leads: 0, inbound: 0, voicemails: 0, emails: 0 },
          { name: endLabel, leads, inbound, voicemails, emails },
        ];

        if (!isMounted) return;
        setChartData(points);
        setRange(r);
      } catch (e) {
        if (!isMounted) return;
        setError(e.message || 'Error loading graph');
        // fallback empty
        setChartData([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [dateType, agentType]);

  return (
    <div className="h-80 relative">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            interval={0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            domain={[0, 'auto']}
            allowDecimals={false}
          />
          <Tooltip content={<TotalsTooltip />} />
          <Line
            type="monotone"
            dataKey="leads"
            name={SERIES.leads.label}
            stroke={SERIES.leads.color}
            strokeWidth={3}
            dot
            activeDot={{ r: 6 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="inbound"
            name={SERIES.inbound.label}
            stroke={SERIES.inbound.color}
            strokeWidth={3}
            dot
            activeDot={{ r: 6 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="voicemails"
            name={SERIES.voicemails.label}
            stroke={SERIES.voicemails.color}
            strokeWidth={3}
            dot
            activeDot={{ r: 6 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="emails"
            name={SERIES.emails.label}
            stroke={SERIES.emails.color}
            strokeWidth={3}
            dot
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      {range && (
        <div className="absolute bottom-2 left-2 text-xs text-gray-500 dark:text-gray-400">
          {range.start_date} – {range.end_date}
        </div>
      )}
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/30 backdrop-blur-[1px] flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">
          Loading...
        </div>
      )}
    </div>
  );
};

export default PerformanceOverview;