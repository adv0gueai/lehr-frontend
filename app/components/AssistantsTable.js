"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Search, Filter, Download, Eye, Phone, Mail, Calendar, MapPin, Users, DollarSign, Clock, TrendingUp, X, ChevronDown, AudioLines, CheckCircle, XCircle, AlertCircle, Star, FileText, Target, MessageSquare } from 'lucide-react';
import { getBaseUrl } from '../lib/utils';
import ExportModal from './ExportModal';

const AssistantsTable = forwardRef(({ defaultRowsPerPage = 10 }, ref) => {
  const [open, setOpen] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [searchTerm, setSearchTerm] = useState('');
  const [assistants, setAssistants] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextPageAvailable, setNextPageAvailable] = useState(false);
  const [filters, setFilters] = useState({
    call_id: '',
    from_number: '',
    user_sentiment: 'all',
    quote_related: 'all',
    service_request: 'all',
    start_date: '',
    end_date: '',
    sort_by: 'created_at',
    sort_order: 'desc',
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

  // Fetch assistants from API with server-side filtering
  useEffect(() => {
    async function fetchAssistants() {
      setLoading(true);
      setError(null);
      try {
        // Build request body with pagination and filter parameters
        const requestBody = {
          page: page + 1,
          page_size: rowsPerPage,
          call_id: filters.call_id || null,
          from_number: filters.from_number || null,
          user_sentiment: filters.user_sentiment !== 'all' ? filters.user_sentiment : null,
          quote_related: filters.quote_related !== 'all' ? filters.quote_related === 'true' : null,
          service_request: filters.service_request !== 'all' ? filters.service_request === 'true' : null,
          start_date: filters.start_date || null,
          end_date: filters.end_date || null,
          sort_by: filters.sort_by || 'created_at',
          sort_order: filters.sort_order || 'desc',
        };

        // Add search term if present
        if (searchTerm) {
          requestBody.search_term = searchTerm;
        }

        const res = await fetch(`${getBaseUrl()}/assistant-data/assistant-calls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        if (!res.ok) throw new Error('Failed to fetch assistant calls');
        const data = await res.json();
        setAssistants(data.assistant_calls || []);
        setTotalCount(data.total_count || 0);
        setNextPageAvailable(!!data.next_page_available);
      } catch (err) {
        setError(err.message || 'Error fetching assistant calls');
        setAssistants([]);
        setTotalCount(0);
        setNextPageAvailable(false);
      } finally {
        setLoading(false);
      }
    }

    fetchAssistants();
  }, [page, rowsPerPage, filters, searchTerm]);

  // Data is already filtered by backend, so just use the data
  const filteredData = assistants;

  // Pagination controls - backend handles filtering, so use server totalCount
  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const currentPageStart = page * rowsPerPage + 1;
  const currentPageEnd = Math.min((page + 1) * rowsPerPage, totalCount);

  // Use the data directly since backend handles both filtering and pagination
  const paginatedData = filteredData;

  const handleRowClick = (assistant) => {
    setSelectedAssistant(assistant);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedAssistant(null);
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
        {typeof value === 'object' ? JSON.stringify(value, null, 2) : (value || 'N/A')}
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

  // Get sentiment color and status
  const getSentimentChip = (sentiment) => {
    switch(sentiment?.toLowerCase()) {
      case 'positive':
        return { color: 'bg-emerald-100 text-emerald-800', label: 'Positive' };
      case 'negative':
        return { color: 'bg-red-100 text-red-800', label: 'Negative' };
      case 'neutral':
        return { color: 'bg-gray-100 text-gray-800', label: 'Neutral' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: sentiment || 'N/A' };
    }
  };

  const getQuoteChip = (quoteRelated) => {
    return quoteRelated
      ? { color: 'bg-emerald-100 text-emerald-800', label: 'Quote Related' }
      : { color: 'bg-gray-100 text-gray-800', label: 'Not Quote Related' };
  };

  const getServiceChip = (serviceRequest) => {
    return serviceRequest
      ? { color: 'bg-blue-100 text-blue-800', label: 'Service Request' }
      : { color: 'bg-gray-100 text-gray-800', label: 'No Service Request' };
  };

  // Helper to extract customer name from service tasks or quotes
  const getCustomerName = (assistant) => {
    // First check service tasks
    if (assistant.related_service_tasks && assistant.related_service_tasks.length > 0) {
      const customerName = assistant.related_service_tasks[0].customer_name;
      if (customerName) return customerName;
    }
    
    // Then check quotes
    if (assistant.related_quotes && assistant.related_quotes.length > 0) {
      const fullName = assistant.related_quotes[0].full_name;
      if (fullName) return fullName;
    }
    
    return 'Unavailable';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Main Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Assistant Calls</h2>
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                  {totalCount}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search calls..."
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
                  {Object.values(filters).some(f => f !== 'all' && f !== '' && f !== null) && (
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Call ID</label>
                  <input
                    type="text"
                    value={filters.call_id}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, call_id: e.target.value }));
                      setPage(0);
                    }}
                    placeholder="Enter call ID"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From Number</label>
                  <input
                    type="text"
                    value={filters.from_number}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, from_number: e.target.value }));
                      setPage(0);
                    }}
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">User Sentiment</label>
                  <select
                    value={filters.user_sentiment}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, user_sentiment: e.target.value }));
                      setPage(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  >
                    <option value="all">All</option>
                    <option value="Positive">Positive</option>
                    <option value="Negative">Negative</option>
                    <option value="Neutral">Neutral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quote Related</label>
                  <select
                    value={filters.quote_related}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, quote_related: e.target.value }));
                      setPage(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  >
                    <option value="all">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service Request</label>
                  <select
                    value={filters.service_request}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, service_request: e.target.value }));
                      setPage(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  >
                    <option value="all">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, start_date: e.target.value }));
                      setPage(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, end_date: e.target.value }));
                      setPage(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
                  <select
                    value={filters.sort_by}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, sort_by: e.target.value }));
                      setPage(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  >
                    <option value="created_at">Created At</option>
                    <option value="updated_at">Updated At</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort Order</label>
                  <select
                    value={filters.sort_order}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, sort_order: e.target.value }));
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
                      call_id: '',
                      from_number: '',
                      user_sentiment: 'all',
                      quote_related: 'all',
                      service_request: 'all',
                      start_date: '',
                      end_date: '',
                      sort_by: 'created_at',
                      sort_order: 'desc',
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
            <div className="p-8 text-center text-blue-600 dark:text-blue-400 font-semibold">Loading assistant calls...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 dark:text-red-400 font-semibold">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Call ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Customer Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">From Number</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Sentiment</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Created</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedData.map((assistant, index) => {
                    const sentimentChip = getSentimentChip(assistant.user_sentiment);
                    const quoteChip = getQuoteChip(assistant.quote_related);
                    const serviceChip = getServiceChip(assistant.service_request);
                    const customerName = getCustomerName(assistant);
                    return (
                      <tr
                        key={assistant.id || index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors duration-200"
                        onClick={() => handleRowClick(assistant)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                            {assistant.call_id || 'N/A'}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${customerName === 'Unavailable' ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-900 dark:text-white font-medium'}`}>
                            {customerName}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {assistant.from_number || 'N/A'}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${sentimentChip.color}`}>
                            {sentimentChip.label}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${quoteChip.color}`}>
                              Q
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${serviceChip.color}`}>
                              S
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {formatDate(assistant.created_at)}
                          </div>
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
        {selectedAssistant && (
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center rounded-full font-semibold text-sm shadow-lg">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedAssistant.call_id || 'Assistant Call'}
                  </h2>
                  <div className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <Phone size={16} />
                    {selectedAssistant.from_number || 'N/A'}
                  </div>
                </div>
              </div>
              {/* Chips for call type and sentiment */}
              <div className="flex items-center gap-2">
                <Chip
                  label={getSentimentChip(selectedAssistant.user_sentiment).label}
                  color={getSentimentChip(selectedAssistant.user_sentiment).color}
                />
                <Chip
                  label={getQuoteChip(selectedAssistant.quote_related).label}
                  color={getQuoteChip(selectedAssistant.quote_related).color}
                />
                <Chip
                  label={getServiceChip(selectedAssistant.service_request).label}
                  color={getServiceChip(selectedAssistant.service_request).color}
                />
              </div>
            </div>

            {/* Call Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Call Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoCard
                  label="Call ID"
                  value={selectedAssistant.call_id || 'N/A'}
                  icon={MessageSquare}
                />
                <InfoCard
                  label="From Number"
                  value={selectedAssistant.from_number || 'N/A'}
                  icon={Phone}
                />
                <InfoCard
                  label="User Sentiment"
                  value={selectedAssistant.user_sentiment || 'N/A'}
                  icon={TrendingUp}
                />
                <InfoCard
                  label="Quote Related"
                  value={selectedAssistant.quote_related ? 'Yes' : 'No'}
                  color={selectedAssistant.quote_related ? 'success' : 'default'}
                />
                <InfoCard
                  label="Service Request"
                  value={selectedAssistant.service_request ? 'Yes' : 'No'}
                  color={selectedAssistant.service_request ? 'success' : 'default'}
                />
                <InfoCard
                  label="Created At"
                  value={formatDate(selectedAssistant.created_at)}
                  icon={Calendar}
                />
              </div>
            </div>

            {/* Call Summary */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Call Summary</h3>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                  {selectedAssistant.call_summary || 'No call summary available.'}
                </p>
              </div>
            </div>

            {/* Recording Section */}
            {selectedAssistant.recording_url && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Call Recording</h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Audio Recording</span>
                    <a
                      href={selectedAssistant.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <AudioLines size={16} />
                      Play Recording
                    </a>
                  </div>
                  <audio controls className="w-full">
                    <source src={selectedAssistant.recording_url} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            )}

            {/* Call Transcription */}
            <Accordion title="Call Transcription" icon={MessageSquare}>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line font-mono leading-relaxed">
                  {selectedAssistant.call_transcription || 'No transcription available.'}
                </div>
              </div>
            </Accordion>

            {/* Related Quotes */}
            {selectedAssistant.related_quotes && selectedAssistant.related_quotes.length > 0 && (
              <Accordion title="Related Quotes" icon={FileText}>
                <div className="space-y-4">
                  {selectedAssistant.related_quotes.map((quote, index) => (
                    <div key={quote.id || index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoCard
                          label="Quote Number"
                          value={quote.quote_number || 'N/A'}
                        />
                        <InfoCard
                          label="Full Name"
                          value={quote.full_name || 'N/A'}
                          icon={Users}
                        />
                        <InfoCard
                          label="Email"
                          value={quote.email_address || 'N/A'}
                          icon={Mail}
                        />
                        <InfoCard
                          label="Property Address"
                          value={quote.property_address || 'N/A'}
                          icon={MapPin}
                        />
                        <InfoCard
                          label="Policy Renewal Date"
                          value={quote.policy_renewal_date || 'N/A'}
                          icon={Calendar}
                        />
                        <InfoCard
                          label="Status"
                          value={quote.status || 'N/A'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Accordion>
            )}

            {/* Related Service Tasks */}
            {selectedAssistant.related_service_tasks && selectedAssistant.related_service_tasks.length > 0 && (
              <Accordion title="Related Service Tasks" icon={Target}>
                <div className="space-y-4">
                  {selectedAssistant.related_service_tasks.map((task, index) => (
                    <div key={task.id || index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <InfoCard
                          label="Customer Name"
                          value={task.customer_name || 'N/A'}
                          icon={Users}
                        />
                        <InfoCard
                          label="Customer Email"
                          value={task.customer_email || 'N/A'}
                          icon={Mail}
                        />
                        <InfoCard
                          label="Task Summary"
                          value={task.task_summary || 'N/A'}
                        />
                        <InfoCard
                          label="Insured ID"
                          value={task.insured_id || 'N/A'}
                        />
                        <InfoCard
                          label="NowCerts Response"
                          value={task.nowcerts_response || 'N/A'}
                        />
                        <InfoCard
                          label="Created At"
                          value={formatDate(task.created_at)}
                          icon={Calendar}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Accordion>
            )}
          </div>
        )}
      </Modal>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        filters={filters}
        searchTerm={searchTerm}
        exportType="assistants"
      />
    </div>
  );
});

AssistantsTable.displayName = 'AssistantsTable';

export default AssistantsTable;