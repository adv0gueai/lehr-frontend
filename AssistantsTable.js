"use client";
import React, { useState, useRef, useEffect, Suspense } from 'react';
import Header from '../components/Header';
import ChatMessagesTable from '../components/ChatMessagesTable';
// import WorkersCompChatMessagesTable from '../components/WorkersCompChatMessagesTable'; // Not available in Lehr Frontend yet
import TagManagement from '../components/TagManagement';
import Sidebar, { useSidebar } from '../components/Sidebar';
import {
    MessageSquare,
    Briefcase,
    Search,
    Phone,
    Mail,
    Calendar,
    MapPin,
    Users,
    DollarSign,
    Filter,
    Trash2,
    AlertCircle,
    Check,
    CheckCircle2,
    Tag,
    PhoneCall,
    X,
} from 'lucide-react';
import { getBaseUrl } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useRouter, useSearchParams } from 'next/navigation';

// Helpers shared across the chat layout
const PAGE_SIZE = 50;

const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d)) return 'N/A';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDateTime = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d)) return 'N/A';
    return d.toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === '') return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const getInitials = (nameOrPhone) => {
    if (!nameOrPhone) return 'U';
    const parts = String(nameOrPhone).trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
};

// Helper to calculate date range based on filter selection
const getDateRange = (filter) => {
    if (filter === 'all') {
        return { start_date: null, end_date: null };
    }

    const today = new Date();
    // Format as YYYY-MM-DD
    const formatDateStr = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const endDate = formatDateStr(today);

    let startDate;
    if (filter === 'today') {
        startDate = endDate;
    } else if (filter === '7days') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        startDate = formatDateStr(sevenDaysAgo);
    } else if (filter === '30days') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        startDate = formatDateStr(thirtyDaysAgo);
    }

    return { start_date: startDate, end_date: endDate };
};

// Render flattened chat bubbles (user + assistant) for a conversation
const renderConversationBubbles = (conversation) => {
    if (!conversation?.transcriptions || !conversation.transcriptions.length) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                No messages yet for this conversation.
            </div>
        );
    }

    const bubbles = [];
    conversation.transcriptions.forEach((t, index) => {
        if (t.message_text) {
            bubbles.push({
                id: `${index}-msg`,
                from: t.message_type === 'assistant' ? 'assistant' : 'user',
                text: t.message_text,
                at: t.created_at,
            });
        }
        if (t.response_text) {
            bubbles.push({
                id: `${index}-resp`,
                from: 'assistant',
                text: t.response_text,
                at: t.created_at,
            });
        }
    });

    return (
        <div className="space-y-5">
            {bubbles.map((b) => (
                <div
                    key={b.id}
                    className={`flex ${b.from === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                    <div
                        className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm transition-colors duration-200 ${b.from === 'user'
                            ? 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                            : 'bg-blue-600 text-white dark:bg-blue-500'
                            }`}
                    >
                        <div className="mb-1 text-xs opacity-75">
                            {b.from === 'user' ? 'Customer' : 'Assistant'} · {formatDateTime(b.at)}
                        </div>
                        <div className="text-[15px] whitespace-pre-wrap break-words sm:text-base">
                            {b.text}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

function ChatPageContent() {
    const { isExpanded } = useSidebar();
    const [activeTab, setActiveTab] = useState('property-insurance'); // Only 'property-insurance' for now in Lehr
    const propertyTableRef = useRef(null);

    // Property chatbot state (uses same API and parameters as ChatMessagesTable)
    const [propertyConversations, setPropertyConversations] = useState([]);
    const [propertyTotalCount, setPropertyTotalCount] = useState(0);
    const [propertyPage, setPropertyPage] = useState(1);
    const [propertyNextPageAvailable, setPropertyNextPageAvailable] = useState(false);
    const [propertyLoading, setPropertyLoading] = useState(false);
    const [propertyError, setPropertyError] = useState(null);
    const [propertySearchTerm, setPropertySearchTerm] = useState('');
    const [propertyDebouncedSearchTerm, setPropertyDebouncedSearchTerm] = useState('');
    const [propertyPhoneFilter, setPropertyPhoneFilter] = useState('');
    const [propertySelectedConversation, setPropertySelectedConversation] = useState(null);
    const [propertyDateFilter, setPropertyDateFilter] = useState('today'); // 'today', '7days', '30days', 'all'
    const [propertyInboxFilter, setPropertyInboxFilter] = useState('all'); // 'qualified', 'all'
    const propertySearchTimeoutRef = useRef(null);

    // Delete transcriptions state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteStatus, setDeleteStatus] = useState(null); // 'success' | 'error' | null
    const [deleteMessage, setDeleteMessage] = useState('');
    const [isChatBookedAppointment, setIsChatBookedAppointment] = useState(false);

    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Handle incoming ?phone= query param to auto-search for a contact
    useEffect(() => {
        const phoneParam = searchParams.get('phone');
        if (mounted) {
            if (phoneParam) {
                setPropertyPhoneFilter(phoneParam);
                setPropertySearchTerm('');
                setPropertyDateFilter('all');
            } else {
                setPropertyPhoneFilter('');
            }
        }
    }, [searchParams, mounted]);

    useEffect(() => {
        if (typeof document !== 'undefined' && !document.cookie.includes('jwt=')) {
            router.replace('/login');
        }
    }, [router]);

    // Fetch Property chatbot conversations with pagination (infinite scroll)
    useEffect(() => {
        async function fetchPropertyConversations() {
            if (activeTab !== 'property-insurance') return;

            setPropertyLoading(true);
            setPropertyError(null);

            try {
                const dateRange = getDateRange(propertyDateFilter);
                const requestBody = {
                    page: propertyPage,
                    page_size: PAGE_SIZE,
                    sort_by: 'created_at',
                    sort_order: 'desc',
                    filters: {
                        phone_number: propertyPhoneFilter || null,
                        start_date: dateRange.start_date,
                        end_date: dateRange.end_date,
                        message_type: null,
                        response_complete: null,
                        has_response: null,
                        min_tokens: null,
                        max_tokens: null,
                    },
                };

                if (propertyDebouncedSearchTerm) {
                    requestBody.filters.search_term = propertyDebouncedSearchTerm;
                }

                // Add qualified filter based on inbox filter selection
                if (propertyInboxFilter === 'qualified') {
                    requestBody.filters.qualified = true;
                }

                const res = await fetch(`${getBaseUrl()}/transcriptions/list`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                });

                if (!res.ok) throw new Error('Failed to fetch chat messages');

                const data = await res.json();
                const list = data.phone_numbers || [];

                setPropertyConversations((prev) => {
                    if (propertyPage === 1) {
                        return list;
                    }
                    const existing = new Set(prev.map((c) => c.phone_number));
                    const merged = [...prev];
                    for (const item of list) {
                        if (!existing.has(item.phone_number)) {
                            merged.push(item);
                        }
                    }
                    return merged;
                });

                setPropertyTotalCount(data.total_phone_numbers || 0);
                setPropertyNextPageAvailable(!!data.next_page_available);

                // Only update selected conversation when loading the first page
                if (propertyPage === 1) {
                    setPropertySelectedConversation((prev) => {
                        if (!list.length) return null;
                        if (!prev) return list[0];
                        const stillExists = list.find(
                            (c) => c.phone_number === prev.phone_number
                        );
                        return stillExists || list[0];
                    });
                }
            } catch (err) {
                setPropertyError(err.message || 'Error fetching chat messages');
                if (propertyPage === 1) {
                    setPropertyConversations([]);
                    setPropertyTotalCount(0);
                    setPropertySelectedConversation(null);
                    setPropertyNextPageAvailable(false);
                }
            } finally {
                setPropertyLoading(false);
            }
        }

        if (mounted) {
            fetchPropertyConversations();
        }
    }, [activeTab, propertyDebouncedSearchTerm, propertyPage, propertyDateFilter, propertyInboxFilter, propertyPhoneFilter, mounted]);

    // Debounce property search term to prevent excessive API calls
    useEffect(() => {
        if (propertySearchTimeoutRef.current) {
            clearTimeout(propertySearchTimeoutRef.current);
        }

        propertySearchTimeoutRef.current = setTimeout(() => {
            setPropertyPage(1);
            setPropertyDebouncedSearchTerm(propertySearchTerm);
        }, 300);

        return () => {
            if (propertySearchTimeoutRef.current) {
                clearTimeout(propertySearchTimeoutRef.current);
            }
        };
    }, [propertySearchTerm]);

    const handleExportProperty = () => {
        if (propertyTableRef.current) {
            propertyTableRef.current.openExportModal();
        }
    };

    const isProperty = activeTab === 'property-insurance';

    const conversations = propertyConversations;
    const totalCount = propertyTotalCount;
    const loading = propertyLoading;
    const error = propertyError;
    const selectedConversation = propertySelectedConversation;
    const searchTerm = propertySearchTerm;
    const dateFilter = propertyDateFilter;
    const inboxFilter = propertyInboxFilter;

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setPropertySearchTerm(value);
    };

    const handlePhoneFilterChange = (e) => {
        const value = e.target.value;
        setPropertyPage(1);
        setPropertyPhoneFilter(value);
    };

    const handleDateFilterChange = (e) => {
        const value = e.target.value;
        setPropertyPage(1);
        setPropertyDateFilter(value);
    };

    const handleInboxFilterChange = (filter) => {
        setPropertyPage(1);
        setPropertyConversations([]);
        setPropertyInboxFilter(filter);
    };

    const isInitialLoading = loading && conversations.length === 0;

    const handleConversationClick = (conversation) => {
        setPropertySelectedConversation(conversation);
    };

    const fetchChatBookedStatusForConversation = async (conversation) => {
        if (!conversation) {
            setIsChatBookedAppointment(false);
            return;
        }

        try {
            const body = { page: 1, page_size: 25 };
            const leadUuid = conversation?.lead_details?.uuid;
            const leadPhone = conversation?.lead_details?.phone_number || conversation?.phone_number;
            const leadEmail = conversation?.lead_details?.email;

            if (leadUuid) {
                body.uuid = leadUuid;
            } else {
                if (leadPhone) body.phone_number = leadPhone;
                if (leadEmail) body.email = leadEmail;
            }

            const res = await fetch(`${getBaseUrl()}/appointments/get-appointments-by-lead`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                setIsChatBookedAppointment(false);
                return;
            }

            const data = await res.json();
            const appointmentsForLead = Array.isArray(data?.appointments) ? data.appointments : [];
            const hasChatBooked = appointmentsForLead.some(
                (appt) =>
                    appt?.appointment_success === true &&
                    typeof appt?.call_id === 'string' &&
                    appt.call_id.startsWith('chat_booking_')
            );
            setIsChatBookedAppointment(hasChatBooked);
        } catch (err) {
            console.error('Failed to load chat-booked appointment status:', err);
            setIsChatBookedAppointment(false);
        }
    };

    const getConversationTitle = (conversation) => {
        const first = conversation?.lead_details?.first_name || '';
        const last = conversation?.lead_details?.last_name || '';
        const fullName = `${first} ${last}`.trim();
        if (fullName) return fullName;
        return conversation?.phone_number || 'Unknown Contact';
    };

    const getConversationSubtitle = (conversation) => {
        if (conversation?.lead_details?.email) return conversation.lead_details.email;
        return conversation?.phone_number || 'N/A';
    };

    const getConversationSnippet = (conversation) => {
        const transcriptions = conversation?.transcriptions || [];
        const last = transcriptions[transcriptions.length - 1];
        const base = last?.response_text || last?.message_text || '';
        if (!base) return 'No recent messages';
        return base.length > 90 ? `${base.slice(0, 90)}…` : base;
    };

    const getConversationTags = (conversation) => {
        const conversationTags = conversation?.tags || [];
        const leadDetailsTags = conversation?.lead_details?.tags || [];
        const allTags = [...conversationTags, ...leadDetailsTags];

        // Remove duplicates based on tag name
        const uniqueTags = [];
        const seenNames = new Set();

        for (const tag of allTags) {
            const tagName = typeof tag === 'string' ? tag : tag.name;
            if (!seenNames.has(tagName)) {
                seenNames.add(tagName);
                uniqueTags.push(tag);
            }
        }

        return uniqueTags;
    };

    const handleInboxScroll = (e) => {
        const target = e.currentTarget;
        if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
            if (!propertyLoading && propertyNextPageAvailable) {
                setPropertyPage((prev) => prev + 1);
            }
        }
    };

    const totalMessages =
        selectedConversation?.conversation_count ||
        selectedConversation?.transcriptions?.length ||
        0;

    useEffect(() => {
        fetchChatBookedStatusForConversation(selectedConversation);
    }, [selectedConversation]);

    // Handle delete transcriptions
    const handleDeleteTranscriptions = async () => {
        if (!selectedConversation?.phone_number) return;

        setIsDeleting(true);
        setDeleteStatus(null);
        setDeleteMessage('');

        try {
            const endpoint = `/transcriptions/phone/${selectedConversation.phone_number}`;

            const res = await fetch(`${getBaseUrl()}${endpoint}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error(`Failed to delete transcriptions: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();
            setDeleteStatus('success');
            setDeleteMessage(data.message || `Successfully deleted all transcriptions for ${selectedConversation.phone_number}`);

            // Update the conversation lists to remove the deleted conversation
            setPropertyConversations(prev =>
                prev.filter(conv => conv.phone_number !== selectedConversation.phone_number)
            );
            setPropertyTotalCount(prev => Math.max(0, prev - 1));
            // Clear selected conversation
            setPropertySelectedConversation(null);

            // Auto close after a short delay
            setTimeout(() => {
                setIsDeleteModalOpen(false);
                setDeleteStatus(null);
                setDeleteMessage('');
            }, 2000);
        } catch (err) {
            setDeleteStatus('error');
            setDeleteMessage(err.message || 'Failed to delete transcriptions. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle tag updates - refresh conversation data
    const handleTagUpdate = async () => {
        if (!selectedConversation?.phone_number) return;

        try {
            const endpoint = '/transcriptions/list';

            const dateRange = getDateRange(propertyDateFilter);
            const requestBody = {
                page: 1,
                page_size: PAGE_SIZE,
                sort_by: 'created_at',
                sort_order: 'desc',
                filters: {
                    phone_number: selectedConversation.phone_number,
                    start_date: null,
                    end_date: null,
                    message_type: null,
                    response_complete: null,
                    has_response: null,
                    min_tokens: null,
                    max_tokens: null,
                },
            };

            const res = await fetch(`${getBaseUrl()}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!res.ok) throw new Error('Failed to refresh conversation data');

            const data = await res.json();
            const list = data.phone_numbers || [];

            if (list.length > 0) {
                const updatedConversation = list[0];

                setPropertyConversations(prev =>
                    prev.map(conv =>
                        conv.phone_number === selectedConversation.phone_number
                            ? updatedConversation
                            : conv
                    )
                );
                setPropertySelectedConversation(updatedConversation);
            }
        } catch (err) {
            console.error('Error refreshing conversation data:', err);
        }
    };

    if (!mounted) return null;

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar />
            <div
                className={`flex-1 transition-all duration-300 ${isExpanded ? 'lg:ml-64' : 'lg:ml-12'
                    } ml-0`}
            >
                <div className="px-6 lg:px-8">
                    <Header />

                    {/* Header removed per design: focus on chat layout only */}

                    {/* Main 3-column chat layout */}
                    <div className="mb-10 lg:mt-6">
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                            <div className="grid h-[calc(100vh-160px)] min-h-[520px] grid-cols-1 lg:grid-cols-12">
                                {/* Left column: Bot selector (acts like channels sidebar) */}
                                <div className="flex min-h-0 flex-col border-b border-gray-200 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/60 lg:col-span-3 lg:border-b-0 lg:border-r">
                                    <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                    Chatbots
                                                </div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    AI Inbox
                                                </div>
                                            </div>
                                            <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                                                {totalCount}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-2 overflow-y-auto p-3">
                                        {/* Property AI Chatbot */}
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('property-insurance')}
                                            className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200 ${isProperty
                                                ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                                                : 'border-transparent bg-white text-gray-800 hover:border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-700 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${isProperty
                                                        ? 'bg-white/10'
                                                        : 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-300'
                                                        }`}
                                                >
                                                    <MessageSquare size={18} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold">
                                                        Chatbot
                                                    </div>
                                                    <div
                                                        className={`mt-0.5 text-xs ${isProperty
                                                            ? 'text-blue-100'
                                                            : 'text-gray-500 dark:text-gray-400'
                                                            }`}
                                                    >
                                                        Insurance conversations
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                        {/* Workers comp bot is not available yet */}
                                    </div>
                                </div>

                                {/* Middle column: Inbox list + active conversation */}
                                <div className="flex min-h-0 flex-col border-b border-gray-200 dark:border-gray-800 lg:col-span-6 lg:border-b-0 lg:border-r">
                                    {/* Channel filter + search */}
                                    <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex-1">
                                                <div className="relative">
                                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search through Live Chat conversations"
                                                        value={searchTerm}
                                                        onChange={handleSearchChange}
                                                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="relative w-full sm:w-64">
                                                <PhoneCall className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Search by phone number"
                                                    value={propertyPhoneFilter}
                                                    onChange={handlePhoneFilterChange}
                                                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                                                <select
                                                    value={dateFilter}
                                                    onChange={handleDateFilterChange}
                                                    className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                >
                                                    <option value="today">Today</option>
                                                    <option value="7days">7 Days</option>
                                                    <option value="30days">30 Days</option>
                                                    <option value="all">All</option>
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                    <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Active Phone Filter Indicator */}
                                        {propertyPhoneFilter && (
                                            <div className="flex items-center">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/40 dark:text-blue-200 dark:ring-blue-500/20">
                                                    <PhoneCall size={12} className="text-blue-500 dark:text-blue-400" />
                                                    {propertyPhoneFilter}
                                                    <button
                                                        onClick={() => {
                                                            setPropertyPhoneFilter('');
                                                            router.replace('/chat');
                                                        }}
                                                        className="group ml-1 -mr-1 rounded-full p-0.5 hover:bg-blue-200/50 dark:hover:bg-blue-800/50"
                                                    >
                                                        <X size={12} className="text-blue-500 group-hover:text-blue-700 dark:text-blue-400 dark:group-hover:text-blue-200" />
                                                    </button>
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Inbox list + conversation view */}
                                    <div className="flex flex-1 min-h-0">
                                        {/* Conversation list */}
                                        <div className="flex w-full max-w-xs flex-col border-r border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/60">
                                            {/* Inbox filter tabs */}
                                            <div className="border-b border-gray-200 dark:border-gray-800">
                                                <div className="flex items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleInboxFilterChange('qualified')}
                                                        className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${inboxFilter === 'qualified'
                                                            ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                                                            }`}
                                                    >
                                                        Qualified
                                                        {inboxFilter === 'qualified' && (
                                                            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                                                {totalCount}
                                                            </span>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleInboxFilterChange('all')}
                                                        className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${inboxFilter === 'all'
                                                            ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                                                            }`}
                                                    >
                                                        All
                                                        {inboxFilter === 'all' && (
                                                            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                                                {totalCount}
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto" onScroll={handleInboxScroll}>
                                                {isInitialLoading ? (
                                                    <div className="flex h-full items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400">
                                                        Loading conversations...
                                                    </div>
                                                ) : error && conversations.length === 0 ? (
                                                    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-red-500 dark:text-red-400">
                                                        {error}
                                                    </div>
                                                ) : conversations.length === 0 ? (
                                                    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-500 dark:text-gray-400">
                                                        No conversations found.
                                                    </div>
                                                ) : (
                                                    <>
                                                        <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                                                            {conversations.map((conversation) => {
                                                                const isSelected =
                                                                    selectedConversation &&
                                                                    selectedConversation.phone_number ===
                                                                    conversation.phone_number;
                                                                return (
                                                                    <li key={conversation.phone_number || Math.random()}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleConversationClick(conversation)
                                                                            }
                                                                            className={`flex w-full flex-col gap-1 px-4 py-3 text-left text-xs transition-colors duration-150 ${isSelected
                                                                                ? 'bg-blue-50/80 dark:bg-blue-900/30'
                                                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                                                                }`}
                                                                        >
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                                                    {getConversationTitle(conversation)}
                                                                                </span>
                                                                                <span className="whitespace-nowrap text-[11px] text-gray-500 dark:text-gray-400">
                                                                                    {formatDate(conversation.last_message_date)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                                                                {getConversationSubtitle(conversation)}
                                                                            </div>
                                                                            <div className="line-clamp-2 text-[11px] text-gray-600 dark:text-gray-300">
                                                                                {getConversationSnippet(conversation)}
                                                                            </div>
                                                                            {getConversationTags(conversation).length > 0 && (
                                                                                <div className="mt-1 flex flex-wrap gap-1">
                                                                                    {getConversationTags(conversation).slice(0, 2).map((tag, index) => {
                                                                                        const tagName = typeof tag === 'string' ? tag : tag.name;
                                                                                        return (
                                                                                            <span
                                                                                                key={index}
                                                                                                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                                                                                            >
                                                                                                <Tag size={8} />
                                                                                                {tagName}
                                                                                            </span>
                                                                                        );
                                                                                    })}
                                                                                    {getConversationTags(conversation).length > 2 && (
                                                                                        <span className="text-[9px] text-gray-500 dark:text-gray-400">
                                                                                            +{getConversationTags(conversation).length - 2} more
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </button>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                        {loading && !isInitialLoading && (
                                                            <div className="flex items-center justify-center py-2 text-[11px] text-gray-500 dark:text-gray-400">
                                                                Loading more conversations...
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Active conversation view */}
                                        <div className="flex flex-1 flex-col bg-gray-50 dark:bg-gray-900">
                                            {/* Conversation header */}
                                            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
                                                        <MessageSquare size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {selectedConversation
                                                                ? getConversationTitle(selectedConversation)
                                                                : 'No conversation selected'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {selectedConversation
                                                                ? getConversationSubtitle(selectedConversation)
                                                                : 'Select a conversation from the inbox to view messages.'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Messages area */}
                                            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-4 dark:from-gray-900 dark:to-gray-950">
                                                {selectedConversation ? (
                                                    <div className="mx-auto max-w-2xl space-y-4">
                                                        {/* High-level summary bubble */}
                                                        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-gray-800 shadow-sm dark:bg-blue-900/30 dark:text-blue-50">
                                                            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
                                                                Conversation Overview
                                                            </div>
                                                            <div className="text-xs text-blue-800/80 dark:text-blue-100/80">
                                                                {isProperty
                                                                    ? 'Property insurance chatbot conversation.'
                                                                    : 'Workers compensation chatbot conversation.'}{' '}
                                                                Started on{' '}
                                                                {formatDate(selectedConversation.first_message_date)}{' '}
                                                                with{' '}
                                                                {getConversationTitle(selectedConversation)}.
                                                            </div>
                                                        </div>

                                                        {/* Detailed bubbles */}
                                                        {renderConversationBubbles(selectedConversation)}
                                                    </div>
                                                ) : (
                                                    <div className="flex h-full flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
                                                        <MessageSquare className="mb-3 h-8 w-8 text-gray-300 dark:text-gray-700" />
                                                        <p className="font-medium">
                                                            Select a conversation from the inbox to start.
                                                        </p>
                                                        <p className="mt-1 text-xs">
                                                            You'll see the full message history here in a chat-style
                                                            view.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right column: Contact / lead information panel */}
                                <div className="flex min-h-0 flex-col bg-gray-50/70 dark:bg-gray-900/80 lg:col-span-3">
                                    <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                            Contact Information
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            Details for the currently selected conversation.
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                        {!selectedConversation ? (
                                            <div className="flex h-full items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                                                Select a conversation to view contact details.
                                            </div>
                                        ) : (
                                            <>
                                                {/* Profile header */}
                                                <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-semibold text-white">
                                                        {getInitials(getConversationTitle(selectedConversation))}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {getConversationTitle(selectedConversation)}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {isProperty
                                                                ? 'AI Chatbot contact'
                                                                : 'Workers Comp Chatbot contact'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Contact details */}
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="flex items-start gap-3 rounded-xl bg-white p-3 text-xs shadow-sm dark:bg-gray-900">
                                                        <div className="mt-0.5 rounded-full bg-blue-50 p-1 text-blue-600 dark:bg-blue-900/50 dark:text-blue-200">
                                                            <Phone size={14} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="font-semibold text-gray-800 dark:text-gray-100">
                                                                Phone number
                                                            </div>
                                                            <div className="mt-0.5 text-gray-600 dark:text-gray-300">
                                                                {selectedConversation.phone_number || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Open Calls button */}
                                                    {selectedConversation.phone_number && (
                                                        <>
                                                            {isChatBookedAppointment && (
                                                                <div className="flex justify-end">
                                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-900/40 dark:text-emerald-200">
                                                                        <CheckCircle2 size={13} />
                                                                        Booked Appointment through Chat
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => router.push(`/calls?phone=${encodeURIComponent(selectedConversation.phone_number)}`)}
                                                                className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-3 py-2.5 text-xs font-semibold text-indigo-700 shadow-sm transition-all hover:from-indigo-100 hover:to-blue-100 hover:shadow-md dark:border-indigo-700/50 dark:from-indigo-900/30 dark:to-blue-900/30 dark:text-indigo-200 dark:hover:from-indigo-900/50 dark:hover:to-blue-900/50"
                                                            >
                                                                <PhoneCall size={14} />
                                                                Open Calls
                                                            </button>
                                                        </>
                                                    )}

                                                    <div className="flex items-start gap-3 rounded-xl bg-white p-3 text-xs shadow-sm dark:bg-gray-900">
                                                        <div className="mt-0.5 rounded-full bg-emerald-50 p-1 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200">
                                                            <Mail size={14} />
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-800 dark:text-gray-100">
                                                                Email
                                                            </div>
                                                            <div className="mt-0.5 text-gray-600 dark:text-gray-300">
                                                                {selectedConversation.lead_details?.email || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Appointment Details */}
                                                    {selectedConversation.lead_details?.appointment_data && (
                                                        <div className="flex items-start gap-3 rounded-xl bg-blue-50/50 p-3 text-xs shadow-sm dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                                                            <div className="mt-0.5 rounded-full bg-blue-100 p-1 text-blue-600 dark:bg-blue-900/50 dark:text-blue-200">
                                                                <Calendar size={14} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="font-semibold text-gray-800 dark:text-gray-100">
                                                                        Appointment
                                                                    </div>
                                                                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${selectedConversation.lead_details.appointment_data.success
                                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                                        }`}>
                                                                        {selectedConversation.lead_details.appointment_data.success ? 'Booked' : 'Pending'}
                                                                    </span>
                                                                </div>
                                                                <div className="mt-1 font-medium text-gray-900 dark:text-white">
                                                                    {formatDateTime(selectedConversation.lead_details.appointment_data.booked_at)}
                                                                </div>
                                                                {selectedConversation.lead_details.appointment_data.link && (
                                                                    <div className="mt-2 text-center">
                                                                        <a
                                                                            href={selectedConversation.lead_details.appointment_data.link}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700 shadow-sm"
                                                                        >
                                                                            Join Meeting
                                                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                            </svg>
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Tag Management */}
                                                <TagManagement
                                                    selectedConversation={selectedConversation}
                                                    agentType={isProperty ? 'property' : 'workers-comp'}
                                                    onTagUpdate={handleTagUpdate}
                                                />

                                                {/* Conversation stats */}
                                                <div className="mt-2 rounded-2xl bg-white p-4 text-xs shadow-sm dark:bg-gray-900">
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <DollarSign
                                                                size={14}
                                                                className="text-emerald-600 dark:text-emerald-300"
                                                            />
                                                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                                                                Conversation Summary
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                                                Messages
                                                            </div>
                                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {totalMessages}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                                                Latest thread ID
                                                            </div>
                                                            <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                                {selectedConversation.latest_thread_id || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-200 pt-3 dark:border-gray-800">
                                                        <div>
                                                            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                                                                <Calendar size={12} />
                                                                <span>First message</span>
                                                            </div>
                                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {formatDateTime(
                                                                    selectedConversation.first_message_date
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                                                                <Calendar size={12} />
                                                                <span>Last message</span>
                                                            </div>
                                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {formatDateTime(
                                                                    selectedConversation.last_message_date
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>


                                                {/* Delete Button */}
                                                {selectedConversation && (
                                                    <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
                                                        <button
                                                            onClick={() => setIsDeleteModalOpen(true)}
                                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
                                                        >
                                                            <Trash2 size={18} />
                                                            Delete
                                                        </button>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mt-2">
                                                            This will permanently remove all messages for {selectedConversation.phone_number}
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hidden analytics tables - kept only for Export modals to preserve existing API usage */}
                    <div className="hidden">
                        <ChatMessagesTable ref={propertyTableRef} defaultRowsPerPage={20} />
                    </div>

                    {/* Delete Confirmation Modal */}
                    {isDeleteModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl m-4">
                                {/* Header */}
                                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center rounded-full">
                                            <Trash2 size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Transcriptions</h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Permanently remove all messages</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsDeleteModalOpen(false)}
                                        disabled={isDeleting}
                                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                                        <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />
                                        <div>
                                            <span className="text-red-800 dark:text-red-200 font-medium">Warning: This action cannot be undone</span>
                                            <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                                                This will permanently delete all transcriptions for{' '}
                                                <span className="font-semibold">{selectedConversation?.phone_number}</span>
                                                . All message history will be lost.
                                            </p>
                                        </div>
                                    </div>

                                    {deleteStatus === 'success' && (
                                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                                            <Check className="text-green-600 dark:text-green-400" size={20} />
                                            <span className="text-green-800 dark:text-green-200 font-medium">{deleteMessage}</span>
                                        </div>
                                    )}

                                    {deleteStatus === 'error' && (
                                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                                            <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />
                                            <div>
                                                <span className="text-red-800 dark:text-red-200 font-medium">Delete failed</span>
                                                {deleteMessage && <p className="text-red-700 dark:text-red-300 text-sm mt-1">{deleteMessage}</p>}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setIsDeleteModalOpen(false)}
                                            disabled={isDeleting}
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDeleteTranscriptions}
                                            disabled={isDeleting}
                                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
                                        >
                                            {isDeleting ? (
                                                <>
                                                    <span className="animate-pulse">...</span>
                                                    Deleting
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 size={16} />
                                                    Confirm delete
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-8 w-8 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-200 border-l-transparent animate-spin"></div>
                    <div className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">Loading chat...</div>
                </div>
            </div>
        }>
            <ChatPageContent />
        </Suspense>
    );
}
