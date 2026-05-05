"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Search, Filter, Download, Eye, Phone, Mail, Calendar, MapPin, Users, DollarSign, Clock, TrendingUp, X, ChevronDown, AudioLines, CheckCircle, XCircle, AlertCircle, Star, FileText, Target } from 'lucide-react';
import { getBaseUrl } from '../lib/utils';
import ExportModal from './ExportModal';

const AgentPerformanceTable = forwardRef(({ defaultRowsPerPage = 10 }, ref) => {
  const [open, setOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextPageAvailable, setNextPageAvailable] = useState(false);
  const [latestCall, setLatestCall] = useState(null);
  const [callLoading, setCallLoading] = useState(false);
  const [callError, setCallError] = useState(null);
  const [filters, setFilters] = useState({
    inboundCallReceived: 'yes',
    voicemailSent: 'all',
    emailSent: 'all',
    qualified: 'all',
    qualificationScoreMin: '',
    qualificationScoreMax: '',
    callSummarySearch: '',
    startDate: '',
    endDate: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    openExportModal: () => {
      setShowExportModal(true);
    },
    scrollIntoView: (options) => {
      if (ref && ref.current) {
        ref.current.scrollIntoView(options);
      }
    }
  }));

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters, searchTerm]);

  // Fetch leads from API with server-side filtering
  useEffect(() => {
    async function fetchLeads() {
      setLoading(true);
      setError(null);
      try {
        // Build request body with pagination and filter parameters
        const requestBody = {
          page: page + 1,
          page_size: rowsPerPage,
          // Backend filter parameters
          inbound_call_received: filters.inboundCallReceived !== 'all' ? filters.inboundCallReceived : null,
          voicemail_sent: filters.voicemailSent !== 'all' ? filters.voicemailSent : null,
          email_sent: filters.emailSent !== 'all' ? filters.emailSent : null,
          start_date: filters.startDate || null,
          end_date: filters.endDate || null,
          sort_by: filters.sortBy || 'created_at',
          sort_order: filters.sortOrder || 'desc',
          qualified: filters.qualified !== 'all' ? filters.qualified : null,
          qualification_score_min: filters.qualificationScoreMin !== '' ? Number(filters.qualificationScoreMin) : null,
          qualification_score_max: filters.qualificationScoreMax !== '' ? Number(filters.qualificationScoreMax) : null,
          call_summary_search: filters.callSummarySearch || null,
        };

        // Add search term if present
        if (searchTerm) {
          requestBody.search_term = searchTerm;
        }
          
        const res = await fetch(`${getBaseUrl()}/leads/get-leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        if (!res.ok) throw new Error('Failed to fetch leads');
        const data = await res.json();
        setLeads(data.leads || []);
        setTotalCount(data.total_count || 0);
        setNextPageAvailable(!!data.next_page_available);
      } catch (err) {
        setError(err.message || 'Error fetching leads');
        setLeads([]);
        setTotalCount(0);
        setNextPageAvailable(false);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLeads();
  }, [page, rowsPerPage, filters, searchTerm]);

  // Normalize agent data to ensure all fields are present
  const normalizeAgentData = (data) =>
    data.map(agent => ({
      name: agent.owner_last_name || agent.full_legal_name || agent.name || '',
      email: agent.email || '',
      voicemail_sent: agent.voicemail_sent || '',
      email_sent: agent.email_sent || '',
      inbound_call_received: agent.inbound_call_received || '',
      qualified: agent.qualified || '',
      qualification_score: agent.qualification_score !== undefined ? agent.qualification_score : '',
      booked: agent.booked || '',
      full_name: agent.owner_last_name || agent.full_legal_name || agent.name || '',
      call_summary: agent.call_summary || '',
      call_transcription: agent.call_transcription || '',
      smoker_status: agent.smoker_status || '',
      beneficiary_age: agent.beneficiary_age || '',
      beneficiary_name: agent.beneficiary_name || '',
      state_of_residence: agent.state_of_residence || '',
      call_duration: agent.call_duration || '',
      user_sentiment: agent.user_sentiment || '',
      call_successful: agent.call_successful || '',
      combined_cost: agent.combined_cost || '',
      disconnect_reason: agent.disconnect_reason || '',
      phone_number: agent.phone_number || '',
      uuid: agent.uuid || '',
      created_at: agent.created_at || '',
      scheduled_at: agent.scheduled_at || '',
      call_ids: agent.call_ids || [],
      first_name: agent.first_name || '',
      last_name: agent.last_name || '',
      owner_last_name: agent.owner_last_name || '',
      owner_first_name: agent.owner_first_name || '',
      date_of_death: agent.date_of_death || null,
      recording_id: agent.recording_id || '',
      forwarding_number: agent.forwarding_number || '',
      input_property_address: agent.input_property_address || '',
      input_property_city: agent.input_property_city || '',
      input_property_state: agent.input_property_state || '',
      input_property_zip: agent.input_property_zip || '',
    }));

  const normalizedAgentData = normalizeAgentData(leads);

  // Data is already filtered by backend, so just use normalized data
  const filteredData = normalizedAgentData;

  // Pagination controls - backend handles filtering, so use server totalCount
  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const currentPageStart = page * rowsPerPage + 1;
  const currentPageEnd = Math.min((page + 1) * rowsPerPage, totalCount);
  
  // Use the data directly since backend handles both filtering and pagination
  const paginatedData = filteredData;

  const handleRowClick = async (agent) => {
    setSelectedAgent(agent);
    setOpen(true);
    setLatestCall(null);
    setCallLoading(true);
    setCallError(null);
    try {
      const res = await fetch(`${getBaseUrl()}/leads/lead-latest-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: agent.uuid })
      });
      if (!res.ok) throw new Error('Failed to fetch latest call');
      const data = await res.json();
      setLatestCall(data.latest_call || null);
    } catch (err) {
      setCallError(err.message || 'Error fetching latest call');
      setLatestCall(null);
    } finally {
      setCallLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedAgent(null);
  };

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const InfoCard = ({ label, value, color = "default", icon: Icon }) => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={16} className="text-gray-500 dark:text-gray-400" />}
        <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">{label}</div>
      </div>
      <div className={`font-semibold text-lg ${
        color === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
        color === 'error' ? 'text-red-500 dark:text-red-400' :
        color === 'warning' ? 'text-amber-600 dark:text-amber-400' :
        'text-gray-900 dark:text-white'
      }`}>
        {value || 'N/A'}
      </div>
    </div>
  );

  // Helper for chips
  const Chip = ({ label, color }) => (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>
  );

  // Helper for avatar with gradient
  const Avatar = ({ name }) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-purple-600',
      'bg-gradient-to-br from-emerald-500 to-teal-600',
      'bg-gradient-to-br from-orange-500 to-red-600',
      'bg-gradient-to-br from-pink-500 to-rose-600',
      'bg-gradient-to-br from-indigo-500 to-purple-600',
    ];
    const colorIndex = name.length % colors.length;
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0]?.toUpperCase() || '')
      .join('');
    return (
      <div className={`w-10 h-10 ${colors[colorIndex]} text-white flex items-center justify-center rounded-full font-semibold text-sm shadow-lg`}>
        {initials}
      </div>
    );
  };

  // Helper for modal with backdrop blur
  const Modal = ({ open, onClose, children }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-2xl shadow-2xl m-4 relative max-h-[90vh] overflow-hidden">
          <button
            className="absolute top-4 right-4 z-10 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow transition-all duration-200"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <div className="overflow-y-auto max-h-[90vh]">
            {children}
          </div>
        </div>
      </div>
    );
  };

  // Helper for accordion with smooth animation
  const Accordion = ({ title, children, icon: Icon }) => {
    const [expanded, setExpanded] = useState(false);
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl mb-4 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon size={20} className="text-gray-600 dark:text-gray-400" />}
            <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
          </div>
          <ChevronDown size={20} className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
            {children}
          </div>
        </div>
      </div>
    );
  };

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d)) return 'N/A';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get qualification color and status
  const getQualificationChip = (qualified) => {
    switch(qualified) {
      case 'qualified':
        return { color: 'bg-emerald-100 text-emerald-800', label: 'Qualified' };
      case 'unqualified':
        return { color: 'bg-red-100 text-red-800', label: 'Unqualified' };
      case 'rescheduled':
        return { color: 'bg-blue-100 text-blue-800', label: 'Rescheduled' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: qualified };
    }
  };

  const getBookedChip = (booked) => {
    return booked === 'Yes' 
      ? { color: 'bg-emerald-100 text-emerald-800', label: 'Booked' }
      : { color: 'bg-red-100 text-red-800', label: 'Not Booked' };
  };

  // Helper to format cost as dollars
  const formatDollars = (value) => {
    if (value === undefined || value === null || value === '' || isNaN(Number(value))) return 'N/A';
    return `$${(Number(value) / 100).toFixed(2)}`;
  };

  // Skeleton loader for InfoCard in modal
  const InfoCardSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded" />
        <div className="w-20 h-3 bg-gray-200 dark:bg-gray-600 rounded" />
      </div>
      <div className="w-16 h-6 bg-gray-200 dark:bg-gray-600 rounded" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Main Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Leads</h2>
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                  {totalCount}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search leads..."
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(0);
                    }}
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 dark:text-gray-300"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {Object.values(filters).some(f => f !== 'all' && f !== '') && (
                    <span className="bg-blue-500 text-white text-xs rounded-full w-2 h-2"></span>
                  )}
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors duration-200 font-medium shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Inbound Call Received</label>
                  <select
                    value={filters.inboundCallReceived}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, inboundCallReceived: e.target.value }));
                      setPage(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  >
                    <option value="all">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Sent</label>
                  <select
                    value={filters.emailSent}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, emailSent: e.target.value }));
                      setPage(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  >
                    <option value="all">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Qualified</label>
                  <select
                    value={filters.qualified}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, qualified: e.target.value }));
                      setPage(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  >
                    <option value="all">All</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Score Min</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.qualificationScoreMin}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, qualificationScoreMin: e.target.value }));
                      setPage(0);
                    }}
                    placeholder="e.g. 0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Score Max</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.qualificationScoreMax}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, qualificationScoreMax: e.target.value }));
                      setPage(0);
                    }}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, startDate: e.target.value }));
                      setPage(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, endDate: e.target.value }));
                      setPage(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Call Summary Search</label>
                  <input
                    type="text"
                    value={filters.callSummarySearch}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, callSummarySearch: e.target.value }));
                      setPage(0);
                    }}
                    placeholder="Search keywords in call summary"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, sortBy: e.target.value }));
                      setPage(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  >
                    <option value="created_at">Created At</option>
                    <option value="qualification_score">Qualification Score</option>
                    <option value="updated_at">Updated At</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort Order</label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, sortOrder: e.target.value }));
                      setPage(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setFilters({
                      inboundCallReceived: 'yes',
                      voicemailSent: 'all',
                      emailSent: 'all',
                      qualified: 'all',
                      qualificationScoreMin: '',
                      qualificationScoreMax: '',
                      callSummarySearch: '',
                      startDate: '',
                      endDate: '',
                      sortBy: 'created_at',
                      sortOrder: 'desc',
                    });
                    setPage(0);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="p-8 text-center text-blue-600 dark:text-blue-400 font-semibold">Loading leads...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 dark:text-red-400 font-semibold">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Phone</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Qualified</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedData.map((agent, index) => {
                    const qualificationChip = getQualificationChip(agent.qualified);
                    const bookedChip = getBookedChip(agent.booked);
                    return (
                      <tr
                        key={agent.uuid || index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors duration-200"
                        onClick={() => handleRowClick(agent)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {agent.owner_first_name && agent.owner_last_name
                                  ? `${agent.owner_first_name} ${agent.owner_last_name}`
                                  : (agent.owner_last_name || agent.name || 'N/A')}
                              </div>
                              {agent.qualification_score !== '' && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Score: {agent.qualification_score}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white truncate max-w-xs">
                            {agent.email || 'N/A'}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {agent.phone_number || 'N/A'}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              agent.voicemail_sent === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              VM
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              agent.email_sent === 'Yes' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              E
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              agent.inbound_call_received === 'Yes' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              C
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            agent.qualified === 'Yes' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {agent.qualified || 'No'}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200">
                            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">Show</span>
                <select
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm text-black dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={rowsPerPage}
                  onChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                >
                  {[5, 10, 20, 25, 50].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-700 dark:text-gray-300">entries</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {totalCount > 0 ? currentPageStart : 0} to {currentPageEnd} of {totalCount.toLocaleString()} entries
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {page + 1} of {totalPages.toLocaleString()}
                  </span>
                  <button
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    onClick={() => setPage(page + 1)}
                    disabled={!nextPageAvailable}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Modal */}
      <Modal open={open} onClose={handleClose}>
        {selectedAgent && (
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center rounded-full font-semibold text-sm shadow-lg">
                  <Mail size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {callLoading ? (
                      <div className="w-40 h-6 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                    ) : latestCall && latestCall.custom_analysis_data ? JSON.parse(latestCall.custom_analysis_data).full_name : (selectedAgent.owner_last_name || selectedAgent.name || selectedAgent.email)}
                  </h2>
                  <div className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <Mail size={16} />
                    {callLoading ? (
                      <div className="w-32 h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                    ) : (() => {
                      if (latestCall && latestCall.custom_analysis_data) {
                        const val = JSON.parse(latestCall.custom_analysis_data).email_address;
                        if (val && val !== 'null') return val;
                      }
                      if (latestCall && latestCall.retell_llm_dynamic_variables) {
                        try {
                          const retell = JSON.parse(latestCall.retell_llm_dynamic_variables);
                          if (retell.lead_email) return retell.lead_email;
                        } catch {}
                      }
                      return selectedAgent.email || 'N/A';
                    })()}
                  </div>
                </div>
              </div>
              {/* Chips for qualification and booking status */}
              <div className="flex items-center gap-2">
                {callLoading ? (
                  <div className="w-20 h-6 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                ) : (
                  <>
                    <Chip
                      label={latestCall && latestCall.custom_analysis_data ? (JSON.parse(latestCall.custom_analysis_data).qualified === 'Yes' ? 'Qualified' : 'Unqualified') : getQualificationChip(selectedAgent.qualified).label}
                      color={latestCall && latestCall.custom_analysis_data ? (JSON.parse(latestCall.custom_analysis_data).qualified === 'Yes' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200') : getQualificationChip(selectedAgent.qualified).color}
                    />
                    <Chip
                      label={latestCall && latestCall.custom_analysis_data ? (JSON.parse(latestCall.custom_analysis_data).call_booked === 'Yes' ? 'Booked' : 'Not Booked') : getBookedChip(selectedAgent.booked).label}
                      color={latestCall && latestCall.custom_analysis_data ? (JSON.parse(latestCall.custom_analysis_data).call_booked === 'Yes' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200') : getBookedChip(selectedAgent.booked).color}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Lead Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lead Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {callLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <InfoCardSkeleton key={i} />)
                ) : (
                  <>
                    <InfoCard 
                      label="Owner Name"
                      value={selectedAgent.owner_last_name || selectedAgent.name || 'N/A'}
                      icon={Users}
                    />
                    <InfoCard 
                      label="Phone Number" 
                      value={(() => {
                        if (latestCall && latestCall.custom_analysis_data) {
                          const val = JSON.parse(latestCall.custom_analysis_data).phone_number;
                          if (val && val !== 'null') return val;
                        }
                        if (latestCall && latestCall.retell_llm_dynamic_variables) {
                          try {
                            const retell = JSON.parse(latestCall.retell_llm_dynamic_variables);
                            if (retell.lead_phone) return retell.lead_phone;
                          } catch {}
                        }
                        return selectedAgent.phone_number || 'N/A';
                      })()}
                      icon={Phone}
                    />
                    <InfoCard 
                      label="Email Address" 
                      value={selectedAgent.email || 'N/A'}
                      icon={Mail}
                    />
                    <InfoCard 
                      label="Email Sent" 
                      value={selectedAgent.email_sent || 'No'}
                      color={selectedAgent.email_sent === 'Yes' ? 'success' : 'default'}
                    />
                    <InfoCard 
                      label="Inbound Call Received" 
                      value={selectedAgent.inbound_call_received || 'No'}
                      color={selectedAgent.inbound_call_received === 'Yes' ? 'success' : 'default'}
                    />
                    <InfoCard 
                      label="Created At" 
                      value={selectedAgent.created_at ? formatDate(selectedAgent.created_at) : 'N/A'}
                      icon={Calendar}
                    />
                    <InfoCard 
                      label="Voicemail Recording ID" 
                      value={selectedAgent.recording_id || 'N/A'}
                      icon={AudioLines}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Call Analytics */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Call Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {callLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <InfoCardSkeleton key={i} />)
                ) : (
                  <>
                    <InfoCard 
                      label="Qualified" 
                      value={latestCall && latestCall.custom_analysis_data ? (JSON.parse(latestCall.custom_analysis_data).qualified || 'N/A') : (selectedAgent.qualified || 'N/A')}
                    />
                    <InfoCard 
                      label="Qualification Score" 
                      value={latestCall && latestCall.custom_analysis_data ? (JSON.parse(latestCall.custom_analysis_data).qualification_score || 'N/A') : 'N/A'}
                    />
                    <InfoCard 
                      label="AI Cost" 
                      value={latestCall && latestCall.combined_cost !== undefined ? formatDollars(latestCall.combined_cost) : (selectedAgent.combined_cost ? formatDollars(selectedAgent.combined_cost) : 'N/A')} 
                      icon={DollarSign}
                      color="success"
                    />
                    <InfoCard 
                      label="Call Duration" 
                      value={latestCall && latestCall.total_duration_seconds ? `${latestCall.total_duration_seconds} sec` : (selectedAgent.call_duration || 'N/A')} 
                      icon={Clock}
                    />
                    <InfoCard 
                      label="User Sentiment" 
                      value={latestCall && latestCall.user_sentiment ? latestCall.user_sentiment : 'N/A'} 
                      icon={TrendingUp}
                    />
                    <InfoCard 
                      label="Call Successful" 
                      value={latestCall && latestCall.call_successful !== undefined ? (latestCall.call_successful ? 'Yes' : 'No') : 'N/A'} 
                      icon={CheckCircle}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Call Summary */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Call Summary</h3>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                {callLoading ? (
                  <div className="w-full h-6 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                ) : (
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    {latestCall && latestCall.custom_analysis_data ? JSON.parse(latestCall.custom_analysis_data).call_summary : (selectedAgent.call_summary || 'No call summary available.')}
                  </p>
                )}
              </div>
            </div>

            {/* Recording Section */}
            {latestCall && latestCall.recording_url && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Call Recording</h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Audio Recording</span>
                    <a
                      href={latestCall.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <AudioLines size={16} />
                      Play Recording
                    </a>
                  </div>
                  <audio controls className="w-full">
                    <source src={latestCall.recording_url} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            )}

            {/* Additional Call Data */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Additional Call Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {latestCall && (
                  <>
                    <InfoCard 
                      label="Agent ID" 
                      value={latestCall.agent_id || 'N/A'} 
                    />
                    <InfoCard 
                      label="Lead UUID" 
                      value={latestCall.lead_uuid || 'N/A'} 
                    />
                    <InfoCard 
                      label="Created At" 
                      value={latestCall.created_at ? formatDate(latestCall.created_at) : 'N/A'}
                      icon={Calendar}
                    />
                    <InfoCard 
                      label="Total Cost" 
                      value={latestCall.combined_cost ? formatDollars(latestCall.combined_cost) : 'N/A'}
                      icon={DollarSign}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Call Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Additional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {callLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <InfoCardSkeleton key={i} />)
                ) : (
                  <>
                    <InfoCard 
                      label="Disconnect Reason" 
                      value={latestCall && latestCall.disconnection_reason ? latestCall.disconnection_reason : (selectedAgent.disconnect_reason || 'N/A')} 
                    />
                    <InfoCard 
                      label="Combined Cost" 
                      value={latestCall && latestCall.combined_cost !== undefined ? formatDollars(latestCall.combined_cost) : (selectedAgent.combined_cost ? formatDollars(selectedAgent.combined_cost) : 'N/A')} 
                      icon={DollarSign}
                      color="success"
                    />
                    {latestCall && latestCall.custom_analysis_data && (
                      <>
                        <InfoCard 
                          label="Property Address" 
                          value={JSON.parse(latestCall.custom_analysis_data).property_address || 'N/A'} 
                          icon={MapPin}
                        />
                        <InfoCard 
                          label="Policy Renewal Date" 
                          value={JSON.parse(latestCall.custom_analysis_data).policy_renewal_date || 'None'} 
                          icon={Calendar}
                        />
                        <InfoCard 
                          label="Full Name" 
                          value={JSON.parse(latestCall.custom_analysis_data).full_name || 'N/A'} 
                          icon={Users}
                        />
                        <InfoCard 
                          label="Email Address" 
                          value={JSON.parse(latestCall.custom_analysis_data).email_address || 'N/A'} 
                          icon={Mail}
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Call Transcription */}
            <Accordion title="Call Transcription" icon={Phone}>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                {callLoading ? (
                  <div className="w-full h-24 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                ) : (
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line font-mono leading-relaxed">
                    {latestCall && latestCall.transcript ? latestCall.transcript : (selectedAgent.call_transcription || 'No transcription available.')}
                  </div>
                )}
              </div>
            </Accordion>

                        {/* Objection Tags Dropdown */}
                        <Accordion title="Objection Tags" icon={Users}>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                {callLoading ? (
                  <div className="w-full h-6 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                ) : (
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line font-mono leading-relaxed">
                    {latestCall && latestCall.custom_analysis_data ? (JSON.parse(latestCall.custom_analysis_data).objection_tags || 'No objection tags available.') : 'No objection tags available.'}
                  </div>
                )}
              </div>
            </Accordion>

          </div>
        )}
      </Modal>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        filters={filters}
        searchTerm={searchTerm}
      />
    </div>
  );
});

AgentPerformanceTable.displayName = 'AgentPerformanceTable';

export default AgentPerformanceTable;