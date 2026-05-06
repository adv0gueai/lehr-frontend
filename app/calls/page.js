'use client';

import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import Sidebar, { useSidebar } from '../components/Sidebar';
import Header from '../components/Header';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBaseUrl } from '../lib/utils';
import {
  CalendarDays,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  PhoneCall,
  User,
  MessageSquare,
} from 'lucide-react';

const APPOINTMENT_TIME_ZONE = 'America/Los_Angeles';
const ISO_WITHOUT_ZONE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
const ISO_WITH_ZONE_RE = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const formatBookedAtForApi = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return null;
  return `${day}-${month}-${year}`;
};

const parseDbDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const text = String(value).trim();
  if (!text) return null;
  const normalized = ISO_WITHOUT_ZONE_RE.test(text) ? `${text}Z` : text;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const d = parseDbDateTime(value);
  if (!d) return value;
  return d.toLocaleString(undefined, {
    timeZone: APPOINTMENT_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getPacificTodayYmd = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APPOINTMENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
};

const formatDate = (value) => {
  if (!value) return '-';
  if (typeof value === 'string' && DATE_ONLY_RE.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const stableDate = new Date(Date.UTC(year, month - 1, day, 12));
    return stableDate.toLocaleDateString(undefined, {
      timeZone: 'UTC',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    timeZone: APPOINTMENT_TIME_ZONE,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatAppointmentSlot = (value) => {
  if (!value) return 'No availability timestamp';
  const text = String(value).trim();
  const hasExplicitZone = ISO_WITH_ZONE_RE.test(text);
  const d = hasExplicitZone ? new Date(text) : parseDbDateTime(text);
  if (!d || Number.isNaN(d.getTime())) {
    return text.toLowerCase().startsWith('slot') ? value : `Slot: ${value}`;
  }

  const dayLabel = d.toLocaleDateString(undefined, {
    timeZone: APPOINTMENT_TIME_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const timeOptions = d.getMinutes() === 0
    ? { timeZone: APPOINTMENT_TIME_ZONE, hour: 'numeric' }
    : { timeZone: APPOINTMENT_TIME_ZONE, hour: 'numeric', minute: '2-digit' };
  const timeStr = d.toLocaleTimeString(undefined, timeOptions).replace(/\s/g, '');
  return `Slot: ${dayLabel}, ${timeStr}`;
};

const getStatusPillClasses = (success) => {
  if (success === true) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-700/60';
  }
  if (success === false) {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-700/60';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60';
};

const humanizeKey = (key) =>
  String(key || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const formatPrimitive = (value) => {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : String(value);
  const s = String(value).trim();
  return s.length ? s : '—';
};

const isEmptyDisplayValue = (value) => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const shouldFormatAsDateTime = (key, value) => {
  if (typeof value !== 'string') return false;
  const k = String(key || '').toLowerCase();
  if (!(k.endsWith('_at') || k.endsWith('_ts') || k.includes('date') || k.includes('time'))) {
    return false;
  }
  const d = new Date(value);
  return Boolean(parseDbDateTime(value)) || !Number.isNaN(d.getTime());
};

const preferredLeadKeyOrder = [
  'uuid',
  'full_legal_name',
  'phone_number',
  'email',
  'dob',
  'timezone',
  'created_at',
  'call_successful',
  'call_outcome',
  'call_ids',
  'call_summary',
  'call_booked',
  'rescheduled',
  'reschedule_time',
  'qualified',
  'qualification_score',
];

const buildNonNullDisplayEntries = (obj) => {
  if (!obj || typeof obj !== 'object') return [];

  const entries = Object.entries(obj)
    .filter(([_, v]) => !isEmptyDisplayValue(v))
    .map(([key, value]) => ({ key, label: humanizeKey(key), value }));

  const orderIndex = new Map(preferredLeadKeyOrder.map((k, idx) => [k, idx]));

  entries.sort((a, b) => {
    const ai = orderIndex.has(a.key) ? orderIndex.get(a.key) : Number.POSITIVE_INFINITY;
    const bi = orderIndex.has(b.key) ? orderIndex.get(b.key) : Number.POSITIVE_INFINITY;
    if (ai !== bi) return ai - bi;
    return a.key.localeCompare(b.key);
  });

  return entries;
};

const getPrimitiveEntries = (obj) => {
  if (!obj || typeof obj !== 'object') return [];
  if (Array.isArray(obj)) return [];
  return Object.entries(obj)
    .filter(([, v]) => v == null || ['string', 'number', 'boolean'].includes(typeof v))
    .map(([k, v]) => ({ key: k, label: humanizeKey(k), value: v }));
};

const createDefaultFilters = () => {
  const todayYMD = getPacificTodayYmd();

  return {
    leadUuid: '',
    phoneNumber: '',
    email: '',
    appointmentSuccess: 'all', // 'all' | 'true' | 'false'
    bookedAt: todayYMD,
    createdFrom: '',
    createdTo: '',
  };
};

const createDefaultCallsFilters = () => ({
  phoneNumber: '',
  email: '',
  qualified: '',
  callBooked: '',
  bookedThroughChat: 'all', // 'all' | 'true' | 'false'
  callSuccessful: 'all', // 'all' | 'true' | 'false'
  callOutcome: '',
  createdFrom: '',
  createdTo: '',
});

function CallsPageContent() {
  const { isExpanded } = useSidebar();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Global page state
  const [activeSection, setActiveSection] = useState('calls'); // 'appointments' | 'calls'
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [callsFiltersOpen, setCallsFiltersOpen] = useState(false);

  // Appointment filters and pagination
  const [filters, setFilters] = useState(() => createDefaultFilters());
  const [selectedDate, setSelectedDate] = useState(() => createDefaultFilters().bookedAt);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Appointment data
  const [appointments, setAppointments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPageAvailable, setNextPageAvailable] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Appointment Lead Data
  const [selectedAppointmentLead, setSelectedAppointmentLead] = useState(null);
  const [loadingSelectedAppointmentLead, setLoadingSelectedAppointmentLead] = useState(false);
  const [selectedAppointmentLeadError, setSelectedAppointmentLeadError] = useState('');

  // Appointment Summary
  const [appointmentSummary, setAppointmentSummary] = useState({});
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Calls (leads) list + latest call detail
  const [callsFilters, setCallsFilters] = useState(() => createDefaultCallsFilters());
  const [callsPage, setCallsPage] = useState(1);
  const [callsPageSize, setCallsPageSize] = useState(20);
  const [leads, setLeads] = useState([]);
  const [callsTotalCount, setCallsTotalCount] = useState(0);
  const [callsNextPageAvailable, setCallsNextPageAvailable] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [callsError, setCallsError] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [latestCall, setLatestCall] = useState(null);
  const [loadingLatestCall, setLoadingLatestCall] = useState(false);
  const [latestCallError, setLatestCallError] = useState('');
  const [isChatBookedAppointment, setIsChatBookedAppointment] = useState(false);
  const latestCallPollTimeoutRef = useRef(null);
  const latestCallPollAttemptsRef = useRef(0);
  const latestCallPollLeadRef = useRef('');
  const selectedLeadKeyRef = useRef('');

  useEffect(() => {
    if (typeof document !== 'undefined' && !document.cookie.includes('jwt=')) {
      router.replace('/login');
      return;
    }

    // Handle incoming ?phone= query param to auto-filter calls
    const phoneParam = searchParams.get('phone');
    if (phoneParam) {
      setActiveSection('calls');
      const updatedCallsFilters = { ...callsFilters, phoneNumber: phoneParam };
      setCallsFilters(updatedCallsFilters);
      
      // We don't need to call fetchAppointments(1, filters) here because the user
      // is jumping straight to the calls tab, and the activeSection effect will 
      // trigger fetchLeads natively since leads.length === 0. However, we'll
      // seed the fetchLeads call manually to be safe.
      fetchLeads(1, updatedCallsFilters);
    } else {
      // Initial load: default to today's appointments
      fetchAppointments(1, filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchAppointments = async (targetPage = page, overrideFilters, overridePageSize) => {
    try {
      setLoadingAppointments(true);
      setAppointmentsError('');

      const effectiveFilters = overrideFilters
        ? { ...filters, ...overrideFilters }
        : filters;

      const effectivePageSize = overridePageSize || pageSize;

      const body = {
        page: targetPage,
        page_size: effectivePageSize,
      };

      if (effectiveFilters.leadUuid.trim()) {
        body.lead_uuid = effectiveFilters.leadUuid.trim();
      }
      if (effectiveFilters.phoneNumber.trim()) {
        body.phone_number = effectiveFilters.phoneNumber.trim();
      }
      if (effectiveFilters.email.trim()) {
        body.email = effectiveFilters.email.trim();
      }
      if (effectiveFilters.appointmentSuccess !== 'all') {
        body.appointment_success = effectiveFilters.appointmentSuccess === 'true';
      }
      if (effectiveFilters.bookedAt) {
        const formatted = formatBookedAtForApi(effectiveFilters.bookedAt);
        if (formatted) body.booked_at = formatted;
      }
      if (effectiveFilters.createdFrom) {
        body.created_from = effectiveFilters.createdFrom;
      }
      if (effectiveFilters.createdTo) {
        body.created_to = effectiveFilters.createdTo;
      }

      const res = await fetch(`${getBaseUrl()}/appointments/get-appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch appointments (${res.status})`);
      }

      const data = await res.json();
      setAppointments(data.appointments || []);
      setTotalCount(data.total_count || 0);
      setNextPageAvailable(Boolean(data.next_page_available));
    } catch (err) {
      console.error(err);
      setAppointmentsError(err.message || 'Unable to load appointments.');
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchAppointmentSummary = async (year, month) => {
    try {
      setLoadingSummary(true);
      const url = new URL(`${getBaseUrl()}/appointments/get-appointments-summary`);
      url.searchParams.append('year', year);
      url.searchParams.append('month', month);

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch summary (${res.status})`);
      }

      const data = await res.json();
      setAppointmentSummary(data.summary || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchAppointmentSummary(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
  }, [currentMonth]);

  const fetchLeads = async (targetPage = callsPage, overrideFilters, overridePageSize) => {
    try {
      setLoadingLeads(true);
      setCallsError('');

      const effectiveFilters = overrideFilters
        ? { ...callsFilters, ...overrideFilters }
        : callsFilters;

      const effectivePageSize = overridePageSize || callsPageSize;

      const body = {
        page: targetPage,
        page_size: effectivePageSize,
      };

      if (effectiveFilters.phoneNumber.trim()) {
        body.phone_number = effectiveFilters.phoneNumber.trim();
      }
      if (effectiveFilters.email.trim()) {
        body.email = effectiveFilters.email.trim();
      }
      if (effectiveFilters.qualified.trim()) {
        body.qualified = effectiveFilters.qualified.trim();
      }
      if (effectiveFilters.callBooked.trim()) {
        body.call_booked = effectiveFilters.callBooked.trim();
      }
      if (effectiveFilters.bookedThroughChat !== 'all') {
        body.booked_through_chat = effectiveFilters.bookedThroughChat === 'true';
      }
      if (effectiveFilters.callSuccessful !== 'all') {
        body.call_successful = effectiveFilters.callSuccessful === 'true';
      }
      if (effectiveFilters.callOutcome.trim()) {
        body.call_outcome = effectiveFilters.callOutcome.trim();
      }
      if (effectiveFilters.createdFrom) {
        body.created_from = effectiveFilters.createdFrom;
      }
      if (effectiveFilters.createdTo) {
        body.created_to = effectiveFilters.createdTo;
      }

      const res = await fetch(`${getBaseUrl()}/get-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch leads (${res.status})`);
      }

      const data = await res.json();
      setLeads(data.leads || []);
      setCallsTotalCount(data.total_count || 0);
      setCallsNextPageAvailable(Boolean(data.next_page_available));
    } catch (err) {
      console.error(err);
      setCallsError(err.message || 'Unable to load leads.');
    } finally {
      setLoadingLeads(false);
    }
  };

  const clearLatestCallPolling = () => {
    if (latestCallPollTimeoutRef.current) {
      clearTimeout(latestCallPollTimeoutRef.current);
      latestCallPollTimeoutRef.current = null;
    }
  };

  useEffect(() => () => clearLatestCallPolling(), []);

  useEffect(() => {
    selectedLeadKeyRef.current =
      selectedLead?.uuid ||
      selectedLead?.lead_uuid ||
      selectedLead?.phone_number ||
      selectedLead?.email ||
      '';
  }, [selectedLead]);

  const fetchLatestCall = async (lead, options = {}) => {
    if (!lead) return;
    const { isRetry = false } = options;
    const leadKey = lead.uuid || lead.lead_uuid || lead.phone_number || lead.email || '';
    try {
      if (!isRetry) {
        clearLatestCallPolling();
        latestCallPollAttemptsRef.current = 0;
        latestCallPollLeadRef.current = leadKey;
        setLoadingLatestCall(true);
        setLatestCallError('');
        setLatestCall(null);
      }

      const body = {};
      if (lead.uuid || lead.lead_uuid) {
        body.uuid = lead.uuid || lead.lead_uuid;
      } else {
        if (lead.phone_number) body.phone_number = lead.phone_number;
        if (lead.email) body.email = lead.email;
      }

      const res = await fetch(`${getBaseUrl()}/lead-latest-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch latest call (${res.status})`);
      }

      const data = await res.json();
      if (selectedLeadKeyRef.current && selectedLeadKeyRef.current !== leadKey) {
        // Ignore stale responses that return after user switched leads.
        return;
      }
      setLatestCall(data.latest_call || null);
      const isPending = Boolean(data?.pending_analysis || data?.latest_call?.pending_analysis);
      if (isPending && leadKey && latestCallPollLeadRef.current === leadKey && latestCallPollAttemptsRef.current < 4) {
        latestCallPollAttemptsRef.current += 1;
        latestCallPollTimeoutRef.current = setTimeout(() => {
          fetchLatestCall(lead, { isRetry: true });
        }, 2000);
      } else {
        clearLatestCallPolling();
      }
    } catch (err) {
      console.error(err);
      setLatestCallError(err.message || 'Unable to load latest call.');
      clearLatestCallPolling();
    } finally {
      if (!isRetry) {
        setLoadingLatestCall(false);
      }
    }
  };

  const fetchAppointmentLead = async (uuid) => {
    if (!uuid) {
      setSelectedAppointmentLead(null);
      return;
    }
    try {
      setLoadingSelectedAppointmentLead(true);
      setSelectedAppointmentLeadError('');

      const res = await fetch(`${getBaseUrl()}/get-lead/${uuid}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch lead (${res.status})`);
      }

      const data = await res.json();
      setSelectedAppointmentLead(data.lead || null);
    } catch (err) {
      console.error(err);
      setSelectedAppointmentLeadError(err.message || 'Unable to load customer details.');
    } finally {
      setLoadingSelectedAppointmentLead(false);
    }
  };

  const fetchChatBookedStatusForLead = async (lead) => {
    if (!lead) {
      setIsChatBookedAppointment(false);
      return;
    }

    try {
      const body = { page: 1, page_size: 25 };
      if (lead.uuid || lead.lead_uuid) {
        body.uuid = lead.uuid || lead.lead_uuid;
      } else {
        if (lead.phone_number) body.phone_number = lead.phone_number;
        if (lead.email) body.email = lead.email;
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

  // Auto-manage selected appointment when the list changes
  useEffect(() => {
    if (!appointments || appointments.length === 0) {
      setSelectedAppointment(null);
      return;
    }

    if (!selectedAppointment) {
      setSelectedAppointment(appointments[0]);
      return;
    }

    // If selected appointment is no longer in the list, fall back to first item
    const stillExists = appointments.some((a) => a.id === selectedAppointment.id);
    if (!stillExists) {
      setSelectedAppointment(appointments[0]);
    }
  }, [appointments, selectedAppointment]);

  useEffect(() => {
    if (selectedAppointment && selectedAppointment.lead_uuid) {
      fetchAppointmentLead(selectedAppointment.lead_uuid);
    } else {
      setSelectedAppointmentLead(null);
    }
  }, [selectedAppointment]);

  useEffect(() => {
    fetchChatBookedStatusForLead(selectedLead);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLead]);

  // Auto-manage selected lead when the list changes (Calls tab only).
  // In Appointments tab, keep selectedLead scoped to the selected appointment.
  useEffect(() => {
    if (activeSection !== 'calls') {
      return;
    }
    if (!leads || leads.length === 0) {
      setSelectedLead(null);
      setLatestCall(null);
      return;
    }

    if (!selectedLead) {
      const first = leads[0];
      setSelectedLead(first);
      fetchLatestCall(first);
      return;
    }

    const stillExists = leads.some((l) => l.uuid === selectedLead.uuid);
    if (!stillExists) {
      const first = leads[0];
      setSelectedLead(first);
      fetchLatestCall(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, activeSection]);

  // Lazy-load leads when switching into Calls tab
  useEffect(() => {
    if (activeSection === 'calls' && leads.length === 0 && !loadingLeads) {
      fetchLeads(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchAppointments(1);
    setFiltersOpen(false);
  };

  const handleResetFilters = () => {
    const freshFilters = createDefaultFilters();
    setFilters(freshFilters);
    setSelectedDate(freshFilters.bookedAt);

    setPage(1);
    fetchAppointments(1, freshFilters);
    setFiltersOpen(false);
  };

  const handleCallsApplyFilters = () => {
    setCallsPage(1);
    fetchLeads(1);
    setCallsFiltersOpen(false);
  };

  const handleCallsResetFilters = () => {
    const freshFilters = createDefaultCallsFilters();
    setCallsFilters(freshFilters);
    setCallsPage(1);
    fetchLeads(1, freshFilters);
    setCallsFiltersOpen(false);
  };

  const handlePageChange = (direction) => {
    if (direction === 'prev' && page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      fetchAppointments(newPage);
    } else if (
      direction === 'next' &&
      (nextPageAvailable || page * pageSize < totalCount)
    ) {
      const newPage = page + 1;
      setPage(newPage);
      fetchAppointments(newPage);
    }
  };

  const handleCallsPageChange = (direction) => {
    if (direction === 'prev' && callsPage > 1) {
      const newPage = callsPage - 1;
      setCallsPage(newPage);
      fetchLeads(newPage);
    } else if (
      direction === 'next' &&
      (callsNextPageAvailable || callsPage * callsPageSize < callsTotalCount)
    ) {
      const newPage = callsPage + 1;
      setCallsPage(newPage);
      fetchLeads(newPage);
    }
  };

  const totalPages = useMemo(() => {
    if (!totalCount || !pageSize) return 1;
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  const callsTotalPages = useMemo(() => {
    if (!callsTotalCount || !callsPageSize) return 1;
    return Math.max(1, Math.ceil(callsTotalCount / callsPageSize));
  }, [callsTotalCount, callsPageSize]);

  // Calendar grid for the visible month
  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );

    const startDay = startOfMonth.getDay(); // 0 = Sunday
    const gridStart = new Date(startOfMonth);
    gridStart.setDate(startOfMonth.getDate() - startDay);

    const days = [];
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const ymd = `${y}-${m}-${d}`;
      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
      const today = createDefaultFilters().bookedAt;
      const isToday = ymd === today;
      const isSelected = ymd === selectedDate;

      days.push({
        date,
        ymd,
        isCurrentMonth,
        isToday,
        isSelected,
      });
    }

    return { days, startOfMonth, endOfMonth };
  }, [currentMonth, selectedDate]);

  const handleSelectAppointment = (appt) => {
    setSelectedAppointment(appt);
    // Keep right-panel analysis scoped to the appointment's lead instead of
    // showing stale latestCall from the Calls stream selection.
    const appointmentLead = {
      uuid: appt?.lead_uuid || undefined,
      phone_number: appt?.phone_number || undefined,
      email: appt?.email || undefined,
      full_legal_name: appt?.full_legal_name || undefined,
    };
    const appointmentLeadKey =
      appointmentLead.uuid ||
      appointmentLead.phone_number ||
      appointmentLead.email ||
      '';
    selectedLeadKeyRef.current = appointmentLeadKey;
    setSelectedLead(appointmentLead);
    setLatestCall(null);
    setLatestCallError('');
    if (appointmentLeadKey) {
      fetchLatestCall(appointmentLead);
    }
  };

  const handleDayClick = (day) => {
    if (!day || !day.ymd) return;
    setSelectedDate(day.ymd);
    setFilters((prev) => ({
      ...prev,
      bookedAt: day.ymd,
    }));
    setPage(1);
    fetchAppointments(1, { bookedAt: day.ymd });
  };

  const handleMonthChange = (direction) => {
    setCurrentMonth((prev) => {
      const newMonth =
        direction === 'prev'
          ? new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
          : new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return newMonth;
    });
  };

  const prettySelectedDate = formatDate(selectedDate);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/10 to-purple-500/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-gradient-to-tr from-pink-400/10 to-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-80 h-80 rounded-full bg-gradient-to-tl from-green-400/10 to-cyan-500/10 blur-3xl" />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className={`relative z-10 flex-1 transition-all duration-300 ${isExpanded ? 'lg:ml-64' : 'lg:ml-12'
          } ml-0`}
      >
        <Header />

        <main className="px-6 lg:px-8 py-6 space-y-6">
          {/* Page heading & tab selector */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100/70 bg-blue-50/70 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
                <PhoneCall className="h-3.5 w-3.5" />
                Calls & Appointments
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Customer engagement console
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                Jump between a clean appointments calendar and a dedicated calls
                section. View who is booked, when they're scheduled, and all
                the context you need in one place.
              </p>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="inline-flex items-center rounded-2xl bg-slate-900 text-slate-100 px-3 py-2 text-xs shadow-lg shadow-slate-900/40 dark:bg-slate-100 dark:text-slate-900">
                <Clock className="mr-2 h-3.5 w-3.5 text-emerald-400 dark:text-emerald-500" />
                <span className="mr-1 font-medium">
                  {totalCount
                    ? `${totalCount.toLocaleString()} appointments`
                    : 'Live appointments'}
                </span>
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500" />
              </div>

              {/* High-level section toggle */}
              <div className="inline-flex items-center rounded-xl border border-slate-200/70 bg-white/80 p-1 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <button
                  type="button"
                  onClick={() => setActiveSection('appointments')}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeSection === 'appointments'
                    ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Appointments
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('calls')}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeSection === 'calls'
                    ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Calls
                </button>
              </div>
            </div>
          </div>

          {activeSection === 'appointments' ? (
            <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-4 lg:p-5 shadow-soft backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/90">
              {/* Top toolbar */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-md">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Appointments calendar
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Use the calendar to jump to a specific day. We default to
                        today so you instantly see what's coming up.
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Selected date:{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {prettySelectedDate}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Page size selector */}
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                    <span className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Per page
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        const newSize = Number(e.target.value) || 10;
                        setPageSize(newSize);
                        setPage(1);
                        fetchAppointments(1, undefined, newSize);
                      }}
                      className="rounded-lg border border-slate-200 bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* Filters dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setFiltersOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Filter className="h-3.5 w-3.5" />
                      Filters
                      {(
                        filters.leadUuid ||
                        filters.phoneNumber ||
                        filters.email ||
                        filters.createdFrom ||
                        filters.createdTo ||
                        filters.appointmentSuccess !== 'all'
                      ) && (
                          <span className="ml-1 inline-flex h-4 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
                            •
                          </span>
                        )}
                    </button>

                    {filtersOpen && (
                      <>
                        {/* Backdrop for mobile / click outside */}
                        <button
                          type="button"
                          className="fixed inset-0 z-10 bg-transparent cursor-default"
                          onClick={() => setFiltersOpen(false)}
                        />
                        <div className="absolute right-0 z-20 mt-2 w-screen max-w-3xl rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl shadow-slate-300/40 backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/95 dark:shadow-slate-900/60">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-slate-50 text-[11px] shadow-sm shadow-slate-900/40 dark:bg-slate-100 dark:text-slate-900">
                                <Filter className="h-3.5 w-3.5" />
                              </span>
                              <div>
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                  Filter appointments
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Narrow results by lead, contact details or
                                  creation window.
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleResetFilters}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <RefreshCw className="h-3 w-3" />
                                Reset
                              </button>
                              <button
                                type="button"
                                onClick={handleApplyFilters}
                                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-1.5 text-[11px] font-semibold text-white shadow-md shadow-blue-500/30 transition hover:brightness-110"
                              >
                                <Filter className="h-3 w-3" />
                                Apply
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Lead UUID
                              </label>
                              <input
                                type="text"
                                value={filters.leadUuid}
                                onChange={(e) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    leadUuid: e.target.value,
                                  }))
                                }
                                placeholder="e1e8bede-3b0a-4d11-9e3f-5fdc0b6f93c2"
                                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Phone number
                              </label>
                              <div className="relative">
                                <Phone className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <input
                                  type="text"
                                  value={filters.phoneNumber}
                                  onChange={(e) =>
                                    setFilters((prev) => ({
                                      ...prev,
                                      phoneNumber: e.target.value,
                                    }))
                                  }
                                  placeholder="+1 555 123 4567"
                                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-9 py-2 text-xs text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Email
                              </label>
                              <div className="relative">
                                <Mail className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <input
                                  type="email"
                                  value={filters.email}
                                  onChange={(e) =>
                                    setFilters((prev) => ({
                                      ...prev,
                                      email: e.target.value,
                                    }))
                                  }
                                  placeholder="john.doe@example.com"
                                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-9 py-2 text-xs text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Status
                              </label>
                              <div className="inline-flex rounded-full bg-slate-100/80 p-0.5 text-[11px] dark:bg-slate-800/80">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFilters((prev) => ({
                                      ...prev,
                                      appointmentSuccess: 'all',
                                    }))
                                  }
                                  className={`flex-1 rounded-full px-2 py-1 font-medium transition-colors ${filters.appointmentSuccess === 'all'
                                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                                    }`}
                                >
                                  All
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFilters((prev) => ({
                                      ...prev,
                                      appointmentSuccess: 'true',
                                    }))
                                  }
                                  className={`flex-1 rounded-full px-2 py-1 font-medium transition-colors ${filters.appointmentSuccess === 'true'
                                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                                    }`}
                                >
                                  Booked
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFilters((prev) => ({
                                      ...prev,
                                      appointmentSuccess: 'false',
                                    }))
                                  }
                                  className={`flex-1 rounded-full px-2 py-1 font-medium transition-colors ${filters.appointmentSuccess === 'false'
                                    ? 'bg-white text-rose-700 shadow-sm dark:bg-slate-900 dark:text-rose-300'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                                    }`}
                                >
                                  Not booked
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Created from
                              </label>
                              <input
                                type="date"
                                value={filters.createdFrom}
                                onChange={(e) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    createdFrom: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Created to
                              </label>
                              <input
                                type="date"
                                value={filters.createdTo}
                                onChange={(e) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    createdTo: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                              />
                            </div>
                          </div>

                          <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                            Appointment date is always controlled via the calendar
                            above. Filters here only restrict which appointments are
                            shown for that day.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Main layout: calendar + list / details */}
              <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)]">
                {/* Left: calendar + daily list */}
                <div className="space-y-4">
                  {/* Calendar */}
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 shadow-sm shadow-slate-200/50 dark:border-slate-800/80 dark:bg-slate-950/40">
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-dashed border-slate-200 pb-2 dark:border-slate-800">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {calendarDays.startOfMonth.toLocaleString(undefined, {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Tap a date to load that day's appointments.
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMonthChange('prev')}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMonthChange('next')}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="mt-1 grid grid-cols-7 gap-1 text-[11px]">
                      {calendarDays.days.map((day) => (
                        <button
                          key={day.ymd}
                          type="button"
                          onClick={() => handleDayClick(day)}
                          className={[
                            'relative flex min-h-[3rem] flex-col items-center justify-center rounded-xl border transition-all py-1',
                            day.isSelected
                              ? 'border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/40'
                              : day.isToday
                                ? 'border-emerald-400/80 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/70 dark:bg-emerald-500/10 dark:text-emerald-200'
                                : day.isCurrentMonth
                                  ? 'border-slate-200 bg-white/90 text-slate-700 hover:border-blue-400 hover:bg-blue-50/70 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:border-blue-500/70 dark:hover:bg-slate-900'
                                  : 'border-transparent bg-transparent text-slate-400 hover:border-slate-300/60 hover:bg-slate-100/60 dark:text-slate-600 dark:hover:bg-slate-900/80',
                          ].join(' ')}
                        >
                          <span className="text-[11px] font-semibold leading-none mb-1">
                            {new Date(day.date).getDate()}
                          </span>
                          {appointmentSummary[day.ymd] > 0 ? (
                            <div
                              className={`inline-flex items-center justify-center rounded-full px-1.5 py-[1px] text-[9px] font-bold ${day.isSelected
                                ? 'bg-white/20 text-white shadow-sm'
                                : day.isToday
                                  ? 'bg-emerald-500/20 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-200'
                                  : 'bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-500/10 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20'
                                }`}
                            >
                              {appointmentSummary[day.ymd]}
                            </div>
                          ) : (
                            day.isSelected ? (
                              <span className="inline-flex h-1 w-4 rounded-full bg-white/90 dark:bg-slate-900/90" />
                            ) : (
                              <div className="h-[14px]"></div>
                            )
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Daily appointments list */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-soft dark:border-slate-800/80 dark:bg-slate-950/40">
                    {loadingAppointments ? (
                      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-slate-100 shadow-lg shadow-slate-900/40 dark:bg-slate-100 dark:text-slate-900">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                        <div className="text-sm font-medium">
                          Loading appointments for {prettySelectedDate}…
                        </div>
                        <p className="text-xs text-slate-400">
                          Please wait a moment while we fetch the latest data.
                        </p>
                      </div>
                    ) : appointments.length === 0 ? (
                      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center px-6 py-8">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-tr from-slate-900 to-slate-700 text-slate-100 shadow-lg shadow-slate-900/40 dark:from-slate-100 dark:to-slate-300 dark:text-slate-900">
                          <CalendarDays className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            No appointments for {prettySelectedDate}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Try a different date in the calendar or broaden your
                            filters.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100/80 bg-slate-50/80 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/80 dark:text-slate-400">
                          <span className="font-semibold uppercase tracking-wide">
                            {appointments.length}{' '}
                            {appointments.length === 1
                              ? 'appointment'
                              : 'appointments'}{' '}
                            on {prettySelectedDate}
                          </span>
                          {totalCount ? (
                            <span>
                              Page {page} / {totalPages}
                            </span>
                          ) : null}
                        </div>
                        <div className="divide-y divide-slate-100/80 dark:divide-slate-800/80">
                          {appointments.map((appt) => {
                            const isSelected =
                              selectedAppointment &&
                              selectedAppointment.id === appt.id;
                            return (
                              <button
                                key={appt.id}
                                type="button"
                                onClick={() => handleSelectAppointment(appt)}
                                className={`flex w-full flex-col gap-2 px-4 py-3 text-left text-xs transition ${isSelected
                                  ? 'bg-slate-900 text-slate-50 shadow-sm shadow-slate-900/40 dark:bg-slate-100 dark:text-slate-900'
                                  : 'bg-white/80 text-slate-700 hover:bg-slate-50/90 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-900/80'
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold shadow-sm ${isSelected
                                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100'
                                        : 'bg-gradient-to-tr from-blue-500 to-indigo-500 text-white'
                                        }`}
                                    >
                                      {appt.call_id
                                        ? String(appt.call_id)
                                          .slice(-3)
                                          .toUpperCase()
                                        : 'CAL'}
                                    </span>
                                    <div>
                                      <div
                                        className={`flex items-center gap-1.5 text-[11px] font-semibold ${isSelected
                                          ? 'text-slate-50 dark:text-slate-900'
                                          : 'text-slate-900 dark:text-slate-50'
                                          }`}
                                      >
                                        <span>{appt.full_legal_name || appt.email || 'Call'}</span>
                                        {appt.appointment_link && (
                                          <a
                                            href={appt.appointment_link}
                                            onClick={(e) => e.stopPropagation()}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${isSelected
                                              ? 'border-slate-200/80 bg-slate-100/10 text-slate-100/90 dark:border-slate-900/60 dark:bg-slate-900/10 dark:text-slate-900'
                                              : 'border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800'
                                              }`}
                                          >
                                            <LinkIcon className="h-3 w-3" />
                                            Link
                                          </a>
                                        )}
                                      </div>
                                      <p
                                        className={`text-[10px] ${isSelected
                                          ? 'text-slate-200/80 dark:text-slate-700'
                                          : 'text-slate-500 dark:text-slate-400'
                                          }`}
                                      >
                                        {formatAppointmentSlot(appt.appointment_requested_at_utc || appt.appointment_available_ts)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-1">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusPillClasses(
                                        appt.appointment_success
                                      )}`}
                                    >
                                      {appt.appointment_success ? (
                                        <CheckCircle2 className="h-3 w-3" />
                                      ) : (
                                        <XCircle className="h-3 w-3" />
                                      )}
                                      {appt.appointment_success
                                        ? 'Booked'
                                        : 'Not booked'}
                                    </span>
                                    {appt.raw_payload && (
                                      <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium ${isSelected
                                          ? 'bg-slate-100/20 text-slate-100/90 dark:bg-slate-900/10 dark:text-slate-900'
                                          : 'bg-slate-900/90 text-slate-100 dark:bg-slate-100/90 dark:text-slate-900'
                                          }`}
                                      >
                                        Raw payload •{' '}
                                        {appt.raw_payload.success === false
                                          ? 'Error'
                                          : 'OK'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                                  {appt.phone_number && (
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${isSelected
                                        ? 'bg-slate-100/10 text-slate-100/90 dark:bg-slate-900/10 dark:text-slate-900'
                                        : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                                        }`}
                                    >
                                      <Phone className="h-3 w-3" />
                                      {appt.phone_number}
                                    </span>
                                  )}
                                  {appt.email && (
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${isSelected
                                        ? 'bg-slate-100/10 text-slate-100/90 dark:bg-slate-900/10 dark:text-slate-900'
                                        : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                                        }`}
                                    >
                                      <Mail className="h-3 w-3" />
                                      {appt.email}
                                    </span>
                                  )}
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${isSelected
                                      ? 'bg-slate-100/10 text-slate-100/90 dark:bg-slate-900/10 dark:text-slate-900'
                                      : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                                      }`}
                                  >
                                    <User className="h-3 w-3" />
                                    ID {appt.id} •{' '}
                                    {appt.lead_uuid || 'Unknown lead'}
                                  </span>
                                </div>

                                <div
                                  className={`mt-1 flex flex-wrap items-center gap-4 text-[10px] ${isSelected
                                    ? 'text-slate-200/90 dark:text-slate-700'
                                    : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                  <span>
                                    Created: {formatDateTime(appt.created_at)}
                                  </span>
                                  <span>
                                    Booked:{' '}
                                    {formatDateTime(appt.appointment_booked_at)}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Pagination */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-slate-200 px-4 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
                          <div>
                            {totalCount ? (
                              <span>
                                Showing{' '}
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {Math.min((page - 1) * pageSize + 1, totalCount)}-
                                  {Math.min(page * pageSize, totalCount)}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {totalCount.toLocaleString()}
                                </span>
                              </span>
                            ) : (
                              <span>End of results for this date.</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePageChange('prev')}
                              disabled={page === 1 || loadingAppointments}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[80px] text-center font-medium">
                              Page {page} / {totalPages || 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handlePageChange('next')}
                              disabled={
                                loadingAppointments ||
                                (!nextPageAvailable && page >= totalPages)
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {appointmentsError && (
                      <p className="border-t border-rose-200 bg-rose-50/80 px-4 py-2 text-[11px] text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-200">
                        {appointmentsError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Selected appointment details */}
                <aside className="space-y-4">
                  <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-4 shadow-soft backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/90">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md">
                          <PhoneCall className="h-4 w-4" />
                        </span>
                        <div>
                          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Appointment details
                          </h2>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Click a row on the left to inspect its full context.
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedAppointment ? (
                      <div className="mt-4 space-y-3 text-xs text-slate-700 dark:text-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50/90 px-3 py-2 dark:bg-slate-950/40">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-slate-900 text-slate-50 text-[10px] font-semibold shadow-sm shadow-slate-900/40 dark:bg-slate-100 dark:text-slate-900">
                              {selectedAppointment.call_id
                                ? String(selectedAppointment.call_id)
                                  .slice(-3)
                                  .toUpperCase()
                                : 'CAL'}
                            </span>
                            <div>
                              <div className="text-[11px] font-semibold">
                                {selectedAppointment.call_id || 'Call'}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                Appointment ID: {selectedAppointment.id}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${getStatusPillClasses(
                              selectedAppointment.appointment_success
                            )}`}
                          >
                            {selectedAppointment.appointment_success ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {selectedAppointment.appointment_success
                              ? 'Booked'
                              : 'Not booked'}
                          </span>
                        </div>

                        <div className="grid gap-2 border-b border-dashed border-slate-200 pb-3 text-[11px] dark:border-slate-800">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              Customer details
                            </span>
                            {loadingSelectedAppointmentLead && (
                              <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                            )}
                          </div>

                          {selectedAppointmentLeadError && (
                            <p className="text-[10px] text-rose-500">{selectedAppointmentLeadError}</p>
                          )}

                          {selectedAppointmentLead ? (
                            <div className="space-y-2 mt-1">
                              {buildNonNullDisplayEntries(selectedAppointmentLead).map(({ key, label, value }) => {
                                const isLongText =
                                  typeof value === 'string' &&
                                  (value.length > 160 || key === 'call_summary' || key === 'transcript');
                                const isUuidLike = key === 'uuid' || key.endsWith('_uuid');

                                if (Array.isArray(value)) {
                                  return (
                                    <div key={key} className="flex items-start justify-between gap-2 sm:col-span-2">
                                      <span className="text-slate-500 dark:text-slate-400">{label}</span>
                                      <span className="font-medium text-right whitespace-pre-wrap">{value.join(', ')}</span>
                                    </div>
                                  );
                                }

                                if (value && typeof value === 'object') {
                                  const primitives = getPrimitiveEntries(value);
                                  return (
                                    <div key={key} className="sm:col-span-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-2 dark:border-slate-800/70 dark:bg-slate-950/30">
                                      <div className="mb-1 flex items-center justify-between gap-2">
                                        <span className="text-slate-500 dark:text-slate-400">{label}</span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Object</span>
                                      </div>
                                      {primitives.length ? (
                                        <div className="grid gap-2 sm:grid-cols-2">
                                          {primitives.slice(1).map((p) => (
                                            <div key={`${key}.${p.key}`} className="flex items-center justify-between gap-2">
                                              <span className="text-slate-500 dark:text-slate-400">{p.label}</span>
                                              <span className="font-medium text-right">{formatPrimitive(p.value)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">No simple fields to display.</div>
                                      )}
                                      <details className="mt-2">
                                        <summary className="cursor-pointer select-none text-[11px] font-semibold text-slate-700 dark:text-slate-200">View JSON</summary>
                                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-white p-2 text-[11px] text-slate-700 dark:bg-gray-900/60 dark:text-slate-200">
                                          {JSON.stringify(value, null, 2)}
                                        </pre>
                                      </details>
                                    </div>
                                  );
                                }

                                const displayValue = shouldFormatAsDateTime(key, value) ? formatDateTime(value) : formatPrimitive(value);
                                return (
                                  <div key={key} className={isLongText ? 'sm:col-span-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-2 dark:border-slate-800/70 dark:bg-slate-950/30' : 'flex items-center justify-between gap-2'}>
                                    <span className={isLongText ? 'block text-slate-500 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'}>{label}</span>
                                    <span className={isLongText ? 'mt-1 block whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700 dark:text-slate-200 max-h-40 overflow-y-auto' : isUuidLike ? 'max-w-[220px] truncate text-right font-mono text-[10px] text-slate-900 dark:text-slate-100' : 'font-medium text-right'}>
                                      {displayValue}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 dark:text-slate-400">Customer reference</span>
                                <span className="max-w-[200px] truncate font-mono text-[10px] text-slate-900 dark:text-slate-100">{selectedAppointment.lead_uuid || '—'}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 dark:text-slate-400">Phone</span>
                                <span className="flex items-center gap-1 font-medium">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  {selectedAppointment.phone_number || '—'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="grid gap-2 text-[11px] border-b border-dashed border-slate-200 pb-3 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 dark:text-slate-400">Slot time</span>
                            <span className="font-medium">{formatDateTime(selectedAppointment.appointment_requested_at_utc || selectedAppointment.appointment_available_ts)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 dark:text-slate-400">Booked at</span>
                            <span>{formatDateTime(selectedAppointment.appointment_booked_at)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 dark:text-slate-400">Created at</span>
                            <span>{formatDateTime(selectedAppointment.created_at)}</span>
                          </div>
                          {selectedAppointment.appointment_link && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500 dark:text-slate-400">Appointment link</span>
                              <a href={selectedAppointment.appointment_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-blue-500/50 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-500/20 dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-200">
                                <LinkIcon className="h-3 w-3" />
                                Open
                              </a>
                            </div>
                          )}
                        </div>

                        {loadingLatestCall ? (
                          <div className="flex min-h-[60px] flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <p className="text-[10px]">Loading analysis...</p>
                          </div>
                        ) : latestCall && latestCall.custom_analysis_data && (
                          <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-[11px] dark:border-slate-800 dark:bg-slate-950/40">
                            <div className="mb-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200/50 pb-1 dark:border-slate-800/50">
                              Analysis summary
                            </div>
                            <div className="grid gap-x-4 gap-y-2">
                              {buildNonNullDisplayEntries(latestCall.custom_analysis_data).map(({ key, label, value }) => (
                                <div key={key} className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 border-b border-slate-100/50 pb-1 last:border-0 dark:border-slate-800/50">
                                  <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
                                  <span className="font-medium text-right break-words leading-tight max-w-[180px]">
                                    {formatPrimitive(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {latestCall && latestCall.transcript && (
                          <details className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-[11px] leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                            <summary className="cursor-pointer select-none font-semibold text-slate-800 dark:text-slate-200">Transcript (latest call)</summary>
                            <p className="mt-2 whitespace-pre-wrap opacity-90 max-h-40 overflow-y-auto">
                              {latestCall.transcript}
                            </p>
                          </details>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 flex min-h-[150px] flex-col items-center justify-center gap-2 text-center">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-slate-50 shadow-md shadow-slate-900/40 dark:bg-slate-100 dark:text-slate-900">
                          <PhoneCall className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                          No appointment selected
                        </p>
                        <p className="max-w-xs text-[11px] text-slate-500 dark:text-slate-400">
                          Use the daily list on the left to pick an appointment and
                          see full details here.
                        </p>
                      </div>
                    )}
                  </section>

                  {/* Helpful explainer card */}
                  <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-4 shadow-soft backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/90">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-md">
                        <CalendarDays className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          How this calendar works
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          The calendar always focuses on one day at a time. Choose
                          any date to fetch appointments for that exact booking
                          date, then drill into the details on the right.
                        </p>
                      </div>
                    </div>
                  </section>
                </aside>
              </div>
            </section>
          ) : (
            <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-4 lg:p-5 shadow-soft backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/90">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white shadow-md dark:from-slate-100 dark:to-slate-300 dark:text-slate-900">
                      <PhoneCall className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Calls activity stream
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Browse leads with recent calls and open the full latest call analysis
                        for any contact in one click.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                    <span className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Per page
                    </span>
                    <select
                      value={callsPageSize}
                      onChange={(e) => {
                        const newSize = Number(e.target.value) || 10;
                        setCallsPageSize(newSize);
                        setCallsPage(1);
                        fetchLeads(1, undefined, newSize);
                      }}
                      className="rounded-lg border border-slate-200 bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCallsFiltersOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Filter className="h-3.5 w-3.5" />
                      Filters
                      {(
                        callsFilters.phoneNumber ||
                        callsFilters.email ||
                        callsFilters.createdFrom ||
                        callsFilters.createdTo ||
                        callsFilters.callOutcome ||
                        callsFilters.qualified ||
                        callsFilters.callBooked ||
                        callsFilters.bookedThroughChat !== 'all' ||
                        callsFilters.callSuccessful !== 'all'
                      ) && (
                          <span className="ml-1 inline-flex h-4 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
                            •
                          </span>
                        )}
                    </button>

                    {callsFiltersOpen && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-10 bg-transparent cursor-default"
                          onClick={() => setCallsFiltersOpen(false)}
                        />
                        <div className="absolute right-0 z-20 mt-2 w-screen max-w-3xl rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl shadow-slate-300/40 backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/95 dark:shadow-slate-900/60">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-slate-50 text-[11px] shadow-sm shadow-slate-900/40 dark:bg-slate-100 dark:text-slate-900">
                                <PhoneCall className="h-3.5 w-3.5" />
                              </span>
                              <div>
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                  Filter calls
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Search by phone, email, outcome or date range.
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleCallsResetFilters}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <RefreshCw className="h-3 w-3" />
                                Reset
                              </button>
                              <button
                                type="button"
                                onClick={handleCallsApplyFilters}
                                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-1.5 text-[11px] font-semibold text-white shadow-md shadow-blue-500/30 transition hover:brightness-110"
                              >
                                <Filter className="h-3 w-3" />
                                Apply
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Phone number
                              </label>
                              <div className="relative">
                                <Phone className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <input
                                  type="text"
                                  value={callsFilters.phoneNumber}
                                  onChange={(e) =>
                                    setCallsFilters((prev) => ({
                                      ...prev,
                                      phoneNumber: e.target.value,
                                    }))
                                  }
                                  placeholder="+1 555 123 4567"
                                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-9 py-2 text-xs text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Email
                              </label>
                              <div className="relative">
                                <Mail className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <input
                                  type="email"
                                  value={callsFilters.email}
                                  onChange={(e) =>
                                    setCallsFilters((prev) => ({
                                      ...prev,
                                      email: e.target.value,
                                    }))
                                  }
                                  placeholder="john.doe@example.com"
                                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-9 py-2 text-xs text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Outcome contains
                              </label>
                              <input
                                type="text"
                                value={callsFilters.callOutcome}
                                onChange={(e) =>
                                  setCallsFilters((prev) => ({
                                    ...prev,
                                    callOutcome: e.target.value,
                                  }))
                                }
                                placeholder="Answered, Voicemail, No answer..."
                                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Qualified
                              </label>
                              <select
                                value={callsFilters.qualified}
                                onChange={(e) =>
                                  setCallsFilters((prev) => ({
                                    ...prev,
                                    qualified: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                              >
                                <option value="">Any</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Call booked
                              </label>
                              <select
                                value={callsFilters.callBooked}
                                onChange={(e) =>
                                  setCallsFilters((prev) => ({
                                    ...prev,
                                    callBooked: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                              >
                                <option value="">Any</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Call successful
                              </label>
                              <div className="inline-flex rounded-full bg-slate-100/80 p-0.5 text-[11px] dark:bg-slate-800/80">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCallsFilters((prev) => ({
                                      ...prev,
                                      callSuccessful: 'all',
                                    }))
                                  }
                                  className={`flex-1 rounded-full px-2 py-1 font-medium transition-colors ${callsFilters.callSuccessful === 'all'
                                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                                    }`}
                                >
                                  All
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCallsFilters((prev) => ({
                                      ...prev,
                                      callSuccessful: 'true',
                                    }))
                                  }
                                  className={`flex-1 rounded-full px-2 py-1 font-medium transition-colors ${callsFilters.callSuccessful === 'true'
                                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                                    }`}
                                >
                                  Success
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCallsFilters((prev) => ({
                                      ...prev,
                                      callSuccessful: 'false',
                                    }))
                                  }
                                  className={`flex-1 rounded-full px-2 py-1 font-medium transition-colors ${callsFilters.callSuccessful === 'false'
                                    ? 'bg-white text-rose-700 shadow-sm dark:bg-slate-900 dark:text-rose-300'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                                    }`}
                                >
                                  Failed
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Booked through chat
                              </label>
                              <select
                                value={callsFilters.bookedThroughChat}
                                onChange={(e) =>
                                  setCallsFilters((prev) => ({
                                    ...prev,
                                    bookedThroughChat: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                              >
                                <option value="all">Any</option>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Created from
                              </label>
                              <input
                                type="date"
                                value={callsFilters.createdFrom}
                                onChange={(e) =>
                                  setCallsFilters((prev) => ({
                                    ...prev,
                                    createdFrom: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Created to
                              </label>
                              <input
                                type="date"
                                value={callsFilters.createdTo}
                                onChange={(e) =>
                                  setCallsFilters((prev) => ({
                                    ...prev,
                                    createdTo: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1.1fr)]">
                {/* Left: Leads (calls) list */}
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-soft dark:border-slate-800/80 dark:bg-slate-950/40">
                  {loadingLeads ? (
                    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-slate-100 shadow-lg shadow-slate-900/40 dark:bg-slate-100 dark:text-slate-900">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                      <div className="text-sm font-medium">Loading leads with calls…</div>
                      <p className="text-xs text-slate-400">
                        Fetching the latest leads timeline from your voice AI.
                      </p>
                    </div>
                  ) : leads.length === 0 ? (
                    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center px-6 py-8">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-tr from-slate-900 to-slate-700 text-slate-100 shadow-lg shadow-slate-900/40 dark:from-slate-100 dark:to-slate-300 dark:text-slate-900">
                        <PhoneCall className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          No leads match the current filters
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Adjust filters or broaden the date range to see more calls.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100/80 bg-slate-50/80 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/80 dark:text-slate-400">
                        <span className="font-semibold uppercase tracking-wide">
                          {leads.length}{' '}
                          {leads.length === 1 ? 'lead' : 'leads'} on this page
                        </span>
                        {callsTotalCount ? (
                          <span>
                            Page {callsPage} / {callsTotalPages}
                          </span>
                        ) : null}
                      </div>
                      <div className="divide-y divide-slate-100/80 dark:divide-slate-800/80">
                        {leads.map((lead) => {
                          const isSelected =
                            selectedLead && selectedLead.uuid === lead.uuid;
                          const hasAppointment =
                            lead.appointment_success === true ||
                            (lead.appointment_link && lead.appointment_link.length > 0) ||
                            (lead.appointment_data && lead.appointment_data.success === true);
                          const appointmentBadgeValue = hasAppointment
                            ? 'Yes'
                            : (typeof lead.call_booked === 'string' && lead.call_booked.trim()
                              ? lead.call_booked
                              : (lead.appointment_success === false ? 'No' : 'No'));
                          const effectiveSuccess = hasAppointment || lead.call_successful;
                          return (
                            <button
                              key={lead.uuid || lead.phone_number || lead.email}
                              type="button"
                              onClick={() => {
                                setSelectedLead(lead);
                                fetchLatestCall(lead);
                              }}
                              className={`flex w-full flex-col gap-2 px-4 py-3 text-left text-xs transition ${isSelected
                                ? 'bg-slate-900 text-slate-50 shadow-sm shadow-slate-900/40 dark:bg-slate-100 dark:text-slate-900'
                                : 'bg-white/80 text-slate-700 hover:bg-slate-50/90 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-900/80'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold shadow-sm ${isSelected
                                      ? 'bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100'
                                      : 'bg-gradient-to-tr from-blue-500 to-indigo-500 text-white'
                                      }`}
                                  >
                                    {(lead.full_legal_name ||
                                      lead.custom_analysis_data?.full_name ||
                                      lead.email ||
                                      lead.phone_number ||
                                      'L')
                                      .toString()
                                      .charAt(0)
                                      .toUpperCase()}
                                  </span>
                                  <div>
                                    <div
                                      className={`flex items-center gap-1.5 text-[11px] font-semibold ${isSelected
                                        ? 'text-slate-50 dark:text-slate-900'
                                        : 'text-slate-900 dark:text-slate-50'
                                        }`}
                                    >
                                      <span>
                                        {lead.full_legal_name ||
                                          lead.custom_analysis_data?.full_name ||
                                          'Unnamed lead'}
                                      </span>
                                    </div>
                                    <p
                                      className={`text-[10px] ${isSelected
                                        ? 'text-slate-200/80 dark:text-slate-700'
                                        : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                    >
                                      {formatDateTime(lead.created_at)} •{' '}
                                      {lead.call_outcome || 'No outcome yet'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                  {(typeof lead.call_successful === 'boolean' || hasAppointment) && (
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusPillClasses(
                                        effectiveSuccess
                                      )}`}
                                    >
                                      {effectiveSuccess ? (
                                        <CheckCircle2 className="h-3 w-3" />
                                      ) : (
                                        <XCircle className="h-3 w-3" />
                                      )}
                                      {hasAppointment ? 'Booked' : effectiveSuccess ? 'Successful' : 'Failed'}
                                    </span>
                                  )}
                                  {appointmentBadgeValue && (
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${isSelected
                                        ? 'bg-slate-100/20 text-slate-100/90 dark:bg-slate-900/10 dark:text-slate-900'
                                        : hasAppointment
                                          ? 'bg-emerald-600/90 text-white dark:bg-emerald-500/90 dark:text-white'
                                          : 'bg-slate-900/90 text-slate-100 dark:bg-slate-100/90 dark:text-slate-900'
                                        }`}
                                    >
                                      {`Appointment: ${appointmentBadgeValue}`}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                                {lead.phone_number && (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${isSelected
                                      ? 'bg-slate-100/10 text-slate-100/90 dark:bg-slate-900/10 dark:text-slate-900'
                                      : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                                      }`}
                                  >
                                    <Phone className="h-3 w-3" />
                                    {lead.phone_number}
                                  </span>
                                )}
                                {lead.email && (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${isSelected
                                      ? 'bg-slate-100/10 text-slate-100/90 dark:bg-slate-900/10 dark:text-slate-900'
                                      : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                                      }`}
                                  >
                                    <Mail className="h-3 w-3" />
                                    {lead.email}
                                  </span>
                                )}
                                {lead.qualified && (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${isSelected
                                      ? 'bg-slate-100/10 text-slate-100/90 dark:bg-slate-900/10 dark:text-slate-900'
                                      : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                                      }`}
                                  >
                                    <User className="h-3 w-3" />
                                    Qualified: {lead.qualified}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-slate-200 px-4 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
                        <div>
                          {callsTotalCount ? (
                            <span>
                              Showing{' '}
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {Math.min(
                                  (callsPage - 1) * callsPageSize + 1,
                                  callsTotalCount
                                )}
                                -
                                {Math.min(callsPage * callsPageSize, callsTotalCount)}
                              </span>{' '}
                              of{' '}
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {callsTotalCount.toLocaleString()}
                              </span>
                            </span>
                          ) : (
                            <span>End of results.</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCallsPageChange('prev')}
                            disabled={callsPage === 1 || loadingLeads}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[80px] text-center font-medium">
                            Page {callsPage} / {callsTotalPages || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCallsPageChange('next')}
                            disabled={
                              loadingLeads ||
                              (!callsNextPageAvailable &&
                                callsPage >= callsTotalPages)
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {callsError && (
                    <p className="border-t border-rose-200 bg-rose-50/80 px-4 py-2 text-[11px] text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-200">
                      {callsError}
                    </p>
                  )}
                </div>

                {/* Right: latest call detail */}
                <aside className="space-y-4">
                  <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-4 shadow-soft backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/90">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-md">
                          <PhoneCall className="h-4 w-4" />
                        </span>
                        <div>
                          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Latest call for selected lead
                          </h2>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Choose a lead on the left to load their most recent analyzed call.
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedLead && (
                      <>
                        <div className="mt-3 rounded-2xl bg-slate-50/90 px-3 py-2 text-[11px] text-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">
                              {selectedLead.full_legal_name ||
                                selectedLead.custom_analysis_data?.full_name ||
                                selectedLead.email ||
                                selectedLead.phone_number ||
                                'Selected lead'}
                            </span>
                            {selectedLead.uuid && (
                              <span className="max-w-[180px] truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                {selectedLead.uuid}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {selectedLead.phone_number && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2 py-0.5 text-[10px] font-medium text-slate-100 dark:bg-slate-100/90 dark:text-slate-900">
                                <Phone className="h-3 w-3" />
                                {selectedLead.phone_number}
                              </span>
                            )}
                            {selectedLead.email && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                                <Mail className="h-3 w-3" />
                                {selectedLead.email}
                              </span>
                            )}
                          </div>

                          {isChatBookedAppointment && (
                            <div className="mt-3 flex justify-end">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-900/40 dark:text-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Booked Appointment through Chat
                              </span>
                            </div>
                          )}
                          
                          {/* Open Chat button */}
                          {selectedLead.phone_number && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => router.push(`/chat?phone=${encodeURIComponent(selectedLead.phone_number)}`)}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-3 py-2 text-[11px] font-semibold text-indigo-700 shadow-sm transition-all hover:from-indigo-100 hover:to-blue-100 hover:shadow-md dark:border-indigo-700/50 dark:from-indigo-900/30 dark:to-blue-900/30 dark:text-indigo-200 dark:hover:from-indigo-900/50 dark:hover:to-blue-900/50"
                              >
                                <MessageSquare size={14} />
                                Open Chat
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 space-y-3">
                          {/* Human-readable lead details (all non-null fields) */}
                          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 text-[11px] text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/40 dark:text-slate-200">
                            <div className="mb-2 text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                              Lead details (non-empty fields)
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              {buildNonNullDisplayEntries(selectedLead).map(({ key, label, value }) => {
                                const isLongText =
                                  typeof value === 'string' &&
                                  (value.length > 160 || key === 'call_summary' || key === 'transcript');
                                const isUuidLike = key === 'uuid' || key.endsWith('_uuid');

                                if (Array.isArray(value)) {
                                  return (
                                    <div
                                      key={key}
                                      className="flex items-start justify-between gap-2 sm:col-span-2"
                                    >
                                      <span className="text-slate-500 dark:text-slate-400">
                                        {label}
                                      </span>
                                      <span className="font-medium text-right whitespace-pre-wrap">
                                        {value.join(', ')}
                                      </span>
                                    </div>
                                  );
                                }

                                if (value && typeof value === 'object') {
                                  const primitives = getPrimitiveEntries(value);
                                  return (
                                    <div
                                      key={key}
                                      className="sm:col-span-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-2 dark:border-slate-800/70 dark:bg-slate-950/30"
                                    >
                                      <div className="mb-1 flex items-center justify-between gap-2">
                                        <span className="text-slate-500 dark:text-slate-400">
                                          {label}
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                          Object
                                        </span>
                                      </div>

                                      {primitives.length ? (
                                        <div className="grid gap-2 sm:grid-cols-2">
                                          {primitives.slice(1).map((p) => (
                                            <div
                                              key={`${key}.${p.key}`}
                                              className="flex items-center justify-between gap-2"
                                            >
                                              <span className="text-slate-500 dark:text-slate-400">
                                                {p.label}
                                              </span>
                                              <span className="font-medium text-right">
                                                {formatPrimitive(p.value)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                          No simple fields to display.
                                        </div>
                                      )}

                                      <details className="mt-2">
                                        <summary className="cursor-pointer select-none text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                          View JSON
                                        </summary>
                                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-white p-2 text-[11px] text-slate-700 dark:bg-gray-900/60 dark:text-slate-200">
                                          {JSON.stringify(value, null, 2)}
                                        </pre>
                                      </details>
                                    </div>
                                  );
                                }

                                const displayValue = shouldFormatAsDateTime(key, value)
                                  ? formatDateTime(value)
                                  : formatPrimitive(value);

                                return (
                                  <div
                                    key={key}
                                    className={
                                      isLongText
                                        ? 'sm:col-span-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-2 dark:border-slate-800/70 dark:bg-slate-950/30'
                                        : 'flex items-center justify-between gap-2'
                                    }
                                  >
                                    <span
                                      className={
                                        isLongText
                                          ? 'block text-slate-500 dark:text-slate-400'
                                          : 'text-slate-500 dark:text-slate-400'
                                      }
                                    >
                                      {label}
                                    </span>

                                    <span
                                      className={
                                        isLongText
                                          ? 'mt-1 block whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700 dark:text-slate-200 max-h-40 overflow-y-auto'
                                          : isUuidLike
                                            ? 'max-w-[220px] truncate text-right font-mono text-[10px] text-slate-900 dark:text-slate-100'
                                            : 'font-medium text-right'
                                      }
                                    >
                                      {displayValue}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Optional raw JSON (for debugging) */}
                          <details className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 text-[11px] dark:border-slate-800/80 dark:bg-slate-950/30">
                            <summary className="cursor-pointer select-none font-semibold text-slate-700 dark:text-slate-200">
                              Raw JSON (debug)
                            </summary>
                            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-white p-2 text-[11px] text-slate-700 dark:bg-gray-900/60 dark:text-slate-200">
                              {JSON.stringify(selectedLead, null, 2)}
                            </pre>
                          </details>
                        </div>

                      </>
                    )}

                    {loadingLatestCall ? (
                      <div className="mt-4 flex min-h-[140px] flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-slate-100 shadow-md shadow-slate-900/40 dark:bg-slate-100 dark:text-slate-900">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                        <p className="text-xs font-medium">Fetching latest call details…</p>
                      </div>
                    ) : latestCall ? (
                      <div className="mt-4 space-y-3 text-xs text-slate-700 dark:text-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50/90 px-3 py-2 dark:bg-slate-950/40">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-slate-900 text-slate-50 text-[10px] font-semibold shadow-sm shadow-slate-900/40 dark:bg-slate-100 dark:text-slate-900">
                              {latestCall.call_id
                                ? String(latestCall.call_id).slice(-3).toUpperCase()
                                : 'CAL'}
                            </span>
                            <div>
                              <div className="text-[11px] font-semibold">
                                {latestCall.call_id || 'Call'}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {formatDateTime(latestCall.created_at)}
                              </div>
                            </div>
                          </div>
                          {latestCall.pending_analysis && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              Analysis pending
                            </span>
                          )}
                          {typeof latestCall.call_successful === 'boolean' && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${getStatusPillClasses(
                                latestCall.call_successful
                              )}`}
                            >
                              {latestCall.call_successful ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              {latestCall.call_successful ? 'Successful' : 'Failed'}
                            </span>
                          )}
                        </div>

                        <div className="grid gap-2 text-[11px]">
                          {latestCall.total_duration_seconds != null && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500 dark:text-slate-400">
                                Duration
                              </span>
                              <span className="font-medium">
                                {Math.round(latestCall.total_duration_seconds / 60)} min
                              </span>
                            </div>
                          )}
                          {latestCall.user_sentiment && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500 dark:text-slate-400">
                                Sentiment
                              </span>
                              <span className="font-medium">
                                {latestCall.user_sentiment}
                              </span>
                            </div>
                          )}
                          {latestCall.combined_cost != null && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500 dark:text-slate-400">
                                Cost (USD)
                              </span>
                              <span className="font-medium">
                                ${(Number(latestCall.combined_cost) / 100).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        {latestCall.custom_analysis_data && (
                          <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-[11px] dark:border-slate-800 dark:bg-slate-950/40">
                            <div className="mb-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200/50 pb-1 dark:border-slate-800/50">
                              Analysis summary
                            </div>
                            <div className="grid gap-x-4 gap-y-2">
                              {buildNonNullDisplayEntries(latestCall.custom_analysis_data).map(({ key, label, value }) => (
                                <div key={key} className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 border-b border-slate-100/50 pb-1 last:border-0 dark:border-slate-800/50">
                                  <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
                                  <span className="font-medium text-right break-words leading-tight max-w-[180px]">
                                    {formatPrimitive(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {latestCall.transcript && (
                          <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-[11px] leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 max-h-52 overflow-y-auto">
                            <div className="mb-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                              Transcript (latest call)
                            </div>
                            <p className="whitespace-pre-wrap opacity-90">
                              {latestCall.transcript}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 flex min-h-[140px] flex-col items-center justify-center gap-2 text-center">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-slate-50 shadow-md shadow-slate-900/40 dark:bg-slate-100 dark:text-slate-900">
                          <PhoneCall className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                          No call loaded
                        </p>
                        <p className="max-w-xs text-[11px] text-slate-500 dark:text-slate-400">
                          Pick a lead from the list on the left to see their most recent
                          analyzed call here.
                        </p>
                      </div>
                    )}

                    {latestCallError && (
                      <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-[11px] text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-200">
                        {latestCallError}
                      </p>
                    )}
                  </section>
                </aside>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default function CallsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <CallsPageContent />
    </Suspense>
  );
}



