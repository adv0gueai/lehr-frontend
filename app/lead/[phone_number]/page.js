'use client';

import React, { useEffect, useState } from 'react';
import { User, Phone, AlertCircle, CheckCircle2, XCircle, ChevronDown, List, Loader2 } from 'lucide-react';
import { getBaseUrl } from '../../lib/utils';

const formatDateTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const humanizeKey = (key) =>
    String(key || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const shouldFormatAsDate = (key) => {
    const k = String(key || '').toLowerCase();
    return k.endsWith('_at') || k.endsWith('_time') || k === 'dob';
};

const isUUID = (key) => key === 'uuid' || key.endsWith('_uuid');

const getStatusPillClasses = (success) => {
    if (success === true || String(success).toLowerCase() === 'yes')
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (success === false || String(success).toLowerCase() === 'no')
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    return "bg-slate-500/10 text-slate-400 border-slate-500/20";
};

const getPrimitiveEntries = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
    return Object.entries(obj).filter(([_, v]) =>
        v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
    );
};

const HIDDEN_KEYS = new Set(['uuid', 'full_legal_name', 'call_ids']);

const isEmpty = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (value === 0) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
};

// ── Sub-components ──────────────────────────────────────────────────

function DataField({ label, value, isDate, isId, isLongText }) {
    let displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value ?? '—';
    if (isDate && value) displayValue = formatDateTime(value);

    return (
        <div className={`flex items-start justify-between gap-4 p-3 rounded-2xl bg-[#0a0a0a] border border-gray-800/60 ${isLongText ? 'flex-col sm:col-span-2' : ''}`}>
            <span className="text-gray-500 text-sm">{label}</span>
            <span className={`text-gray-100 font-medium ${isId ? 'font-mono text-xs opacity-70 break-all text-right' : ''} ${isLongText ? 'w-full whitespace-pre-wrap mt-2' : 'text-right'}`}>
                {displayValue}
            </span>
        </div>
    );
}

function ObjectCard({ label, objData }) {
    if (!objData) return null;

    if (Array.isArray(objData)) {
        return (
            <div className="sm:col-span-2 bg-[#0a0a0a] border border-gray-800/60 p-4 rounded-3xl">
                <span className="text-gray-500 text-sm mb-3 block">{label}</span>
                <div className="flex flex-wrap gap-2 mt-2">
                    {objData.map((item, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-900 rounded-lg text-xs font-mono text-gray-300 border border-gray-800">
                            {String(item)}
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    const entries = getPrimitiveEntries(objData);
    return (
        <div className="sm:col-span-2 bg-[#0a0a0a] border border-gray-800/60 p-5 rounded-3xl">
            <div className="flex items-center justify-between mb-4 border-b border-gray-800/80 pb-2">
                <span className="text-gray-400 font-semibold">{label}</span>
                <span className="text-[10px] uppercase tracking-widest text-gray-600">Object</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {entries.map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">{humanizeKey(k)}</span>
                        <span className="font-medium text-gray-200">{String(v ?? '—')}</span>
                    </div>
                ))}
            </div>
            <details className="mt-4 group">
                <summary className="cursor-pointer text-xs font-semibold text-blue-400 flex items-center gap-1 w-max opacity-80 hover:opacity-100 transition-opacity">
                    <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                    Raw JSON View
                </summary>
                <pre className="mt-3 p-3 rounded-xl bg-black border border-gray-900 text-xs font-mono text-gray-400 overflow-x-auto">
                    {JSON.stringify(objData, null, 2)}
                </pre>
            </details>
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────

export default function LeadDetailsPage({ params }) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [leadsData, setLeadsData] = useState(null);
    const [latestCallData, setLatestCallData] = useState(null);
    const [loadingLead, setLoadingLead] = useState(true);
    const [loadingCall, setLoadingCall] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [callError, setCallError] = useState(null);

    // Resolve params (Next.js 15 async params)
    useEffect(() => {
        (async () => {
            const resolved = await params;
            setPhoneNumber(decodeURIComponent(resolved.phone_number));
        })();
    }, [params]);

    // Fetch lead data
    useEffect(() => {
        if (!phoneNumber) return;

        const fetchLead = async () => {
            try {
                setLoadingLead(true);
                setErrorMsg(null);

                const res = await fetch(`${getBaseUrl()}/get-leads`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone_number: phoneNumber }),
                });

                if (!res.ok) {
                    throw new Error(`Failed to fetch lead: ${res.status} ${res.statusText}`);
                }

                const result = await res.json();
                const lead = result.leads && result.leads.length > 0
                    ? result.leads[0]
                    : (result.uuid ? result : null);

                setLeadsData(lead);
            } catch (err) {
                setErrorMsg(err.message);
            } finally {
                setLoadingLead(false);
            }
        };

        fetchLead();
    }, [phoneNumber]);

    // Fetch latest call when lead data is available
    useEffect(() => {
        if (!leadsData?.uuid) return;

        const fetchCall = async () => {
            try {
                setLoadingCall(true);
                setCallError(null);

                const body = { uuid: leadsData.uuid };

                const res = await fetch(`${getBaseUrl()}/lead-latest-call`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    throw new Error(`Failed to fetch latest call: ${res.status}`);
                }

                const data = await res.json();
                setLatestCallData(data.latest_call || null);
            } catch (err) {
                console.error(err);
                setCallError(err.message);
            } finally {
                setLoadingCall(false);
            }
        };

        fetchCall();
    }, [leadsData]);

    return (
        <div className="min-h-screen bg-[#050505] text-gray-100 p-6 md:p-12 font-sans selection:bg-blue-500/30">
            <div className="max-w-6xl mx-auto space-y-10">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-800/60">
                    <div className="flex items-center gap-5">
                        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 p-4 rounded-3xl border border-blue-500/20">
                            <User className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-gray-100 via-blue-50 to-gray-400 bg-clip-text text-transparent">
                                {leadsData?.full_legal_name || "Lead Intelligence"}
                            </h1>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="font-mono text-xs bg-gray-900/80 px-3 py-1 rounded-full border border-gray-800 flex items-center gap-2 text-gray-300">
                                    <Phone className="w-3.5 h-3.5 text-blue-400" /> {phoneNumber}
                                </span>
                                {leadsData?.email && (
                                    <span className="text-xs bg-gray-900/80 px-3 py-1 rounded-full border border-gray-800 text-gray-300">
                                        {leadsData.email}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {leadsData?.uuid && (
                        <div className="text-right">
                            <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-1">Internal Reference ID</span>
                            <span className="font-mono text-xs text-gray-400 bg-[#0a0a0a] px-3 py-1.5 rounded-lg border border-gray-800/60 inline-block">
                                {leadsData.uuid}
                            </span>
                        </div>
                    )}
                </header>

                {/* Error State */}
                {errorMsg && (
                    <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-3xl flex items-start gap-4 shadow-lg shadow-red-900/5">
                        <div className="bg-red-500/10 p-2 rounded-full mt-0.5">
                            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                        </div>
                        <div>
                            <h3 className="text-red-400 font-semibold text-lg tracking-wide">Connection Error</h3>
                            <p className="text-red-300/80 mt-1 leading-relaxed text-sm">{errorMsg}</p>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loadingLead && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        <p className="text-gray-400 font-medium">Loading lead profile...</p>
                    </div>
                )}

                {/* Main Content Layout */}
                {leadsData && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                        {/* LEFT COLUMN: All Lead Metrics */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Key Indicators Row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-[#0a0a0a] border border-gray-800/60 p-4 rounded-3xl">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Status</p>
                                    <span className={`inline-flex items-center gap-1.5 border rounded-full px-2 py-0.5 text-xs ${getStatusPillClasses(leadsData.call_successful)}`}>
                                        {leadsData.call_successful ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                        {leadsData.call_successful ? 'Connected' : 'Not Connected'}
                                    </span>
                                </div>
                                <div className="bg-[#0a0a0a] border border-gray-800/60 p-4 rounded-3xl">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Booked</p>
                                    <span className="font-semibold text-gray-200">{leadsData.call_booked ?? "No"}</span>
                                </div>
                                <div className="bg-[#0a0a0a] border border-gray-800/60 p-4 rounded-3xl">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Score</p>
                                    <span className="font-semibold text-gray-200">{leadsData.qualification_score ?? "—"}</span>
                                </div>
                                <div className="bg-[#0a0a0a] border border-gray-800/60 p-4 rounded-3xl">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Outreach Step</p>
                                    <span className="font-semibold text-gray-200">{leadsData.outreach_step ?? "—"}</span>
                                </div>
                            </div>

                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <List className="w-5 h-5 text-gray-400" />
                                    <h2 className="text-xl font-bold text-gray-200">Complete Profile Data</h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                    {Object.entries(leadsData).map(([key, value]) => {
                                        if (HIDDEN_KEYS.has(key)) return null;
                                        if (isEmpty(value)) return null;

                                        if (typeof value === 'object' && value !== null) {
                                            return <ObjectCard key={key} label={humanizeKey(key)} objData={value} />;
                                        }

                                        return (
                                            <DataField
                                                key={key}
                                                label={humanizeKey(key)}
                                                value={value}
                                                isDate={shouldFormatAsDate(key)}
                                                isId={isUUID(key)}
                                                isLongText={typeof value === 'string' && value.length > 50}
                                            />
                                        );
                                    })}
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COLUMN: Latest Call Overview */}
                        <div className="space-y-6">
                            <div className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-gray-800/80 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                                <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
                                            <Phone className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-100 leading-tight">Latest Call Info</h3>
                                            <span className="text-xs text-gray-500 font-medium">Automated Analysis</span>
                                        </div>
                                    </div>
                                </div>

                                {loadingCall ? (
                                    <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
                                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                                        <p className="text-sm text-gray-400">Loading call data...</p>
                                    </div>
                                ) : callError ? (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-red-400">{callError}</p>
                                    </div>
                                ) : !latestCallData ? (
                                    <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
                                        <div className="bg-gray-900 p-4 rounded-full">
                                            <Phone className="w-6 h-6 text-gray-600" />
                                        </div>
                                        <p className="text-sm text-gray-400">No recent call data available.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-5">

                                        <div className="grid gap-3 border-b border-gray-800/60 pb-5">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Call ID</span>
                                                <span className="font-mono text-xs text-gray-300 bg-gray-900 border border-gray-800 px-2 py-1 rounded truncate max-w-[180px]">
                                                    {latestCallData.call_id || '—'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Duration</span>
                                                <span className="text-gray-200 font-medium">
                                                    {latestCallData.total_duration_seconds != null
                                                        ? `${Math.floor(latestCallData.total_duration_seconds)} sec`
                                                        : '—'
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Outcome</span>
                                                <span className="text-gray-200 font-medium">
                                                    {latestCallData.disconnection_reason || '—'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Sentiment</span>
                                                <span className="text-gray-200 font-medium">
                                                    {latestCallData.user_sentiment || '—'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Successful</span>
                                                <span className={`px-2 py-0.5 rounded-md text-xs border ${latestCallData.call_successful ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-900 text-gray-500 border-gray-800'}`}>
                                                    {latestCallData.call_successful ? 'Yes' : 'No'}
                                                </span>
                                            </div>
                                            {latestCallData.combined_cost != null && latestCallData.combined_cost > 0 && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-500">Cost</span>
                                                    <span className="text-gray-200 font-medium">${latestCallData.combined_cost.toFixed(4)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Time</span>
                                                <span className="text-gray-300 text-xs text-right">
                                                    {formatDateTime(latestCallData.start_timestamp || latestCallData.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Custom Analysis Block */}
                                        {latestCallData.custom_analysis_data && Object.keys(latestCallData.custom_analysis_data).length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">AI Deep Analysis</h4>
                                                <div className="space-y-2">
                                                    {getPrimitiveEntries(latestCallData.custom_analysis_data).map(([k, v]) => (
                                                        <div key={k} className="flex flex-col gap-1 p-2.5 rounded-xl bg-[#0a0a0a] border border-gray-800/60">
                                                            <span className="text-xs text-blue-400/80 font-medium">{humanizeKey(k)}</span>
                                                            <span className="text-sm text-gray-200 leading-snug">{String(v ?? '—')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Audio Recording */}
                                        {latestCallData.recording_url && (
                                            <div className="mt-4">
                                                <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Call Recording</h4>
                                                <audio
                                                    controls
                                                    src={latestCallData.recording_url}
                                                    className="w-full h-10 rounded-xl"
                                                >
                                                    Your browser does not support the audio element.
                                                </audio>
                                            </div>
                                        )}

                                        {/* Transcript Collapse */}
                                        {latestCallData.transcript && (
                                            <details className="mt-4 group border border-gray-800 rounded-2xl bg-black overflow-hidden">
                                                <summary className="cursor-pointer font-semibold text-sm text-gray-300 p-4 border-b border-gray-800 hover:bg-gray-900/50 transition-colors flex justify-between items-center">
                                                    Transcript
                                                    <ChevronDown className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" />
                                                </summary>
                                                <div className="p-4 bg-[#0a0a0a]">
                                                    <p className="whitespace-pre-wrap text-sm text-gray-400 leading-relaxed font-mono overflow-y-auto max-h-[300px] custom-scrollbar">
                                                        {latestCallData.transcript}
                                                    </p>
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
            `}} />
        </div>
    );
}
