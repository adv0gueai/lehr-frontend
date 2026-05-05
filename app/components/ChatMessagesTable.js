"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Search, Filter, Download, Eye, Phone, Mail, Calendar, MapPin, Users, DollarSign, Clock, TrendingUp, X, ChevronDown, MessageSquare, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { getBaseUrl } from '../lib/utils';
import ExportModal from './ExportModal';

const ChatMessagesTable = forwardRef(({ defaultRowsPerPage = 10 }, ref) => {
    const [open, setOpen] = useState(false);
    const [selectedPhoneNumber, setSelectedPhoneNumber] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
    const [searchTerm, setSearchTerm] = useState('');
    const [phoneNumbers, setPhoneNumbers] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [nextPageAvailable, setNextPageAvailable] = useState(false);
    const [filters, setFilters] = useState({
        phone_number: '',
        start_date: '',
        end_date: '',
        message_type: 'all',
        response_complete: 'all',
        has_response: 'all',
        min_tokens: '',
        max_tokens: '',
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

    // Fetch chat messages from API with server-side filtering
    useEffect(() => {
        async function fetchChatMessages() {
            setLoading(true);
            setError(null);
            try {
                // Build request body with pagination and filter parameters
                const requestBody = {
                    page: page + 1,
                    page_size: rowsPerPage,
                    sort_by: 'created_at',
                    sort_order: 'desc',
                    filters: {
                        phone_number: filters.phone_number || null,
                        start_date: filters.start_date || null,
                        end_date: filters.end_date || null,
                        message_type: filters.message_type !== 'all' ? filters.message_type : null,
                        response_complete: filters.response_complete !== 'all' ? filters.response_complete === 'true' : null,
                        has_response: filters.has_response !== 'all' ? filters.has_response === 'true' : null,
                        min_tokens: filters.min_tokens !== '' ? Number(filters.min_tokens) : null,
                        max_tokens: filters.max_tokens !== '' ? Number(filters.max_tokens) : null,
                    }
                };

                // Add search term if present
                if (searchTerm) {
                    requestBody.filters.search_term = searchTerm;
                }

                const res = await fetch(`${getBaseUrl()}/transcriptions/list`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                if (!res.ok) throw new Error('Failed to fetch chat messages');
                const data = await res.json();
                setPhoneNumbers(data.phone_numbers || []);
                setTotalCount(data.total_phone_numbers || 0);
                setNextPageAvailable(!!data.next_page_available);
            } catch (err) {
                setError(err.message || 'Error fetching chat messages');
                setPhoneNumbers([]);
                setTotalCount(0);
                setNextPageAvailable(false);
            } finally {
                setLoading(false);
            }
        }

        fetchChatMessages();
    }, [page, rowsPerPage, filters, searchTerm]);

    // Data is already filtered by backend, so just use the data
    const filteredData = phoneNumbers;

    // Pagination controls - backend handles filtering, so use server totalCount
    const totalPages = Math.ceil(totalCount / rowsPerPage);
    const currentPageStart = page * rowsPerPage + 1;
    const currentPageEnd = Math.min((page + 1) * rowsPerPage, totalCount);

    // Use the data directly since backend handles both filtering and pagination
    const paginatedData = filteredData;

    const handleRowClick = (phoneNumber) => {
        setSelectedPhoneNumber(phoneNumber);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedPhoneNumber(null);
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
            <div className={`font-semibold text-lg ${color === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
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

    // Helper for modal with backdrop blur
    const Modal = ({ open, onClose, children }) => {
        if (!open) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-900 w-full max-w-6xl rounded-2xl shadow-2xl m-4 relative max-h-[90vh] overflow-hidden">
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
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
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

    // Helper to format currency
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined || amount === '') return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    // Get message type chip
    const getMessageTypeChip = (messageType) => {
        switch (messageType?.toLowerCase()) {
            case 'user':
                return { color: 'bg-blue-100 text-blue-800', label: 'User' };
            case 'assistant':
                return { color: 'bg-green-100 text-green-800', label: 'Assistant' };
            default:
                return { color: 'bg-gray-100 text-gray-800', label: messageType || 'N/A' };
        }
    };

    // Get qualification chip
    const getQualificationChip = (qualified) => {
        switch (qualified?.toLowerCase()) {
            case 'yes':
                return { color: 'bg-emerald-100 text-emerald-800', label: 'Qualified' };
            case 'no':
                return { color: 'bg-red-100 text-red-800', label: 'Unqualified' };
            default:
                return { color: 'bg-gray-100 text-gray-800', label: qualified || 'N/A' };
        }
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
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Chat Messages</h2>
                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                                    {totalCount}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search conversations..."
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                                    <input
                                        type="text"
                                        value={filters.phone_number}
                                        onChange={(e) => {
                                            setFilters(prev => ({ ...prev, phone_number: e.target.value }));
                                            setPage(0);
                                        }}
                                        placeholder="Enter phone number"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message Type</label>
                                    <select
                                        value={filters.message_type}
                                        onChange={(e) => {
                                            setFilters(prev => ({ ...prev, message_type: e.target.value }));
                                            setPage(0);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                                    >
                                        <option value="all">All</option>
                                        <option value="user">User</option>
                                        <option value="assistant">Assistant</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Response Complete</label>
                                    <select
                                        value={filters.response_complete}
                                        onChange={(e) => {
                                            setFilters(prev => ({ ...prev, response_complete: e.target.value }));
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Has Response</label>
                                    <select
                                        value={filters.has_response}
                                        onChange={(e) => {
                                            setFilters(prev => ({ ...prev, has_response: e.target.value }));
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Tokens</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={filters.min_tokens}
                                        onChange={(e) => {
                                            setFilters(prev => ({ ...prev, min_tokens: e.target.value }));
                                            setPage(0);
                                        }}
                                        placeholder="0"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Tokens</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={filters.max_tokens}
                                        onChange={(e) => {
                                            setFilters(prev => ({ ...prev, max_tokens: e.target.value }));
                                            setPage(0);
                                        }}
                                        placeholder="1000"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                                    />
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
                            </div>

                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => {
                                        setFilters({
                                            phone_number: '',
                                            start_date: '',
                                            end_date: '',
                                            message_type: 'all',
                                            response_complete: 'all',
                                            has_response: 'all',
                                            min_tokens: '',
                                            max_tokens: '',
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
                        <div className="p-8 text-center text-blue-600 dark:text-blue-400 font-semibold">Loading chat messages...</div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-500 dark:text-red-400 font-semibold">{error}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Phone Number</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Customer</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Conversations</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Tokens</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Cost</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Date Range</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {paginatedData.map((phoneNumber, index) => {
                                        return (
                                            <tr
                                                key={phoneNumber.phone_number || index}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors duration-200"
                                                onClick={() => handleRowClick(phoneNumber)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {phoneNumber.phone_number || 'N/A'}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {phoneNumber.lead_details?.first_name && phoneNumber.lead_details?.last_name
                                                            ? `${phoneNumber.lead_details.first_name} ${phoneNumber.lead_details.last_name}`
                                                            : 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {phoneNumber.lead_details?.email || 'N/A'}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {phoneNumber.conversation_count || 0} messages
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {phoneNumber.total_tokens_used || 0}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {formatCurrency(phoneNumber.total_cost)}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {formatDate(phoneNumber.first_message_date)}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        to {formatDate(phoneNumber.last_message_date)}
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
                                        disabled={page + 1 >= totalPages}
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
                {selectedPhoneNumber && (
                    <div className="p-8">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center rounded-full font-semibold text-sm shadow-lg">
                                    <MessageSquare size={20} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {selectedPhoneNumber.phone_number || 'Chat Conversation'}
                                    </h2>
                                    <div className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                        <Users size={16} />
                                        {selectedPhoneNumber.lead_details?.first_name && selectedPhoneNumber.lead_details?.last_name
                                            ? `${selectedPhoneNumber.lead_details.first_name} ${selectedPhoneNumber.lead_details.last_name}`
                                            : 'Unknown User'}
                                    </div>
                                </div>
                            </div>
                            {/* Stats Chips */}
                            <div className="flex items-center gap-2">
                                <Chip
                                    label={`${selectedPhoneNumber.conversation_count || 0} Messages`}
                                    color="bg-blue-100 text-blue-800"
                                />
                                <Chip
                                    label={`${selectedPhoneNumber.total_tokens_used || 0} Tokens`}
                                    color="bg-green-100 text-green-800"
                                />
                                <Chip
                                    label={formatCurrency(selectedPhoneNumber.total_cost)}
                                    color="bg-amber-100 text-amber-800"
                                />
                            </div>
                        </div>

                        {/* Lead Information */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lead Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <InfoCard
                                    label="Customer Name"
                                    value={selectedPhoneNumber.lead_details?.first_name && selectedPhoneNumber.lead_details?.last_name
                                        ? `${selectedPhoneNumber.lead_details.first_name} ${selectedPhoneNumber.lead_details.last_name}`
                                        : 'N/A'}
                                    icon={Users}
                                />
                                <InfoCard
                                    label="Email Address"
                                    value={selectedPhoneNumber.lead_details?.email || 'N/A'}
                                    icon={Mail}
                                />
                                <InfoCard
                                    label="Phone Number"
                                    value={selectedPhoneNumber.phone_number || 'N/A'}
                                    icon={Phone}
                                />
                                <InfoCard
                                    label="Property Address"
                                    value={selectedPhoneNumber.lead_details?.address || 'N/A'}
                                    icon={MapPin}
                                />
                                <InfoCard
                                    label="Qualified"
                                    value={selectedPhoneNumber.lead_details?.qualified || 'N/A'}
                                />
                                <InfoCard
                                    label="Qualification Score"
                                    value={selectedPhoneNumber.lead_details?.qualification_score || 'N/A'}
                                />
                            </div>
                        </div>

                        {/* Tags Section */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tags</h3>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {selectedPhoneNumber.tags && selectedPhoneNumber.tags.length > 0 ? (
                                    selectedPhoneNumber.tags.map((tag, index) => (
                                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                            {tag}
                                            <button
                                                className="ml-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 focus:outline-none"
                                                onClick={async () => {
                                                    try {
                                                        const res = await fetch(`${getBaseUrl()}/leads/tags/remove`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ phone_number: selectedPhoneNumber.phone_number, tag })
                                                        });
                                                        if (res.ok) {
                                                            // Update local state
                                                            const newTags = selectedPhoneNumber.tags.filter(t => t !== tag);
                                                            setSelectedPhoneNumber(prev => ({ ...prev, tags: newTags }));
                                                            // Also update the main list if needed (optional optimization)
                                                            setPhoneNumbers(prev => prev.map(p =>
                                                                p.phone_number === selectedPhoneNumber.phone_number
                                                                    ? { ...p, tags: newTags }
                                                                    : p
                                                            ));
                                                        }
                                                    } catch (err) {
                                                        console.error('Failed to remove tag', err);
                                                    }
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">No tags</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Add a tag..."
                                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                            const newTag = e.target.value.trim();
                                            try {
                                                const res = await fetch(`${getBaseUrl()}/leads/tags/add`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ phone_number: selectedPhoneNumber.phone_number, tag: newTag })
                                                });
                                                if (res.ok) {
                                                    // Update local state
                                                    const currentTags = selectedPhoneNumber.tags || [];
                                                    if (!currentTags.includes(newTag)) {
                                                        const newTags = [...currentTags, newTag];
                                                        setSelectedPhoneNumber(prev => ({ ...prev, tags: newTags }));
                                                        setPhoneNumbers(prev => prev.map(p =>
                                                            p.phone_number === selectedPhoneNumber.phone_number
                                                                ? { ...p, tags: newTags }
                                                                : p
                                                        ));
                                                    }
                                                    e.target.value = '';
                                                }
                                            } catch (err) {
                                                console.error('Failed to add tag', err);
                                            }
                                        }
                                    }}
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400">Press Enter to add</span>
                            </div>
                        </div>

                        {/* Conversation Statistics */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conversation Statistics</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <InfoCard
                                    label="Total Messages"
                                    value={selectedPhoneNumber.conversation_count || 'N/A'}
                                />
                                <InfoCard
                                    label="Total Tokens"
                                    value={selectedPhoneNumber.total_tokens_used || 'N/A'}
                                />
                                <InfoCard
                                    label="Total Cost"
                                    value={formatCurrency(selectedPhoneNumber.total_cost)}
                                    icon={DollarSign}
                                    color="success"
                                />
                                <InfoCard
                                    label="Latest Thread ID"
                                    value={selectedPhoneNumber.latest_thread_id || 'N/A'}
                                />
                            </div>
                        </div>

                        {/* Date Information */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Date Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoCard
                                    label="First Message"
                                    value={formatDate(selectedPhoneNumber.first_message_date)}
                                    icon={Calendar}
                                />
                                <InfoCard
                                    label="Last Message"
                                    value={formatDate(selectedPhoneNumber.last_message_date)}
                                    icon={Calendar}
                                />
                            </div>
                        </div>

                        {/* Transcriptions */}
                        {selectedPhoneNumber.transcriptions && selectedPhoneNumber.transcriptions.length > 0 && (
                            <Accordion title="Message History" icon={MessageSquare}>
                                <div className="max-h-96 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
                                    {selectedPhoneNumber.transcriptions.map((transcription, index) => (
                                        <div key={transcription.id || index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 last:border-b-0 pb-4 last:pb-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Chip
                                                        label={getMessageTypeChip(transcription.message_type).label}
                                                        color={getMessageTypeChip(transcription.message_type).color}
                                                    />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        {formatDate(transcription.created_at)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {transcription.tokens_used || 0} tokens
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {transcription.cost || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Message:</p>
                                                <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 p-3 rounded-lg max-w-none break-words whitespace-pre-wrap">
                                                    {transcription.message_text || 'N/A'}
                                                </div>
                                            </div>

                                            {transcription.response_text && (
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Response:</p>
                                                    <div className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg max-w-none break-words whitespace-pre-wrap">
                                                        {transcription.response_text}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Accordion>
                        )}

                        {/* Formatted Transcription */}
                        {selectedPhoneNumber.formatted_transcription && (
                            <Accordion title="Formatted Transcription" icon={FileText}>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                    <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
                                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                                            {selectedPhoneNumber.formatted_transcription}
                                        </pre>
                                    </div>
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
                exportType="chat-messages"
            />
        </div>
    );
});

ChatMessagesTable.displayName = 'ChatMessagesTable';

export default ChatMessagesTable;
