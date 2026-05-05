"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import AnalyzeModal from './AnalyzeModal';
import { X as CloseIcon } from 'lucide-react';
import { getBaseUrl } from '../lib/utils';

const Header = ({ timeRange, setTimeRange }) => {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Example data for modal
  const objections = [
    { label: 'I already have coverage', count: 18 },
    { label: "I don't remember signing up", count: 12 },
    { label: 'Not interested right now', count: 9 },
    { label: 'Too expensive', count: 7 },
    { label: 'Need to think about it', count: 4 },
  ];
  const avgCallTime = '4m 32s';
  const avgEngagement = 'Leads stay on the line for 65% of the call';

  if (!mounted) return null;

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const loadDummyNotification = async () => {
    try {
      const body = { page: 1, page_size: 1, sort_order: 'desc' };
      const res = await fetch(`${getBaseUrl()}/get-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      let phone = null;
      if (res.ok) {
        const data = await res.json();
        const lead = (data.leads && data.leads[0]) || null;
        phone = lead?.phone_number || lead?.owner_phone || null;
      }
      const fallback = '+1 (555) ' + Math.floor(1000000 + Math.random() * 9000000).toString().slice(0, 7).replace(/(\d{3})(\d{4})/, '$1-$2');
      const message = `New callback received from ${phone || fallback}`;
      const notif = { id: Date.now(), message, time: new Date().toLocaleTimeString() };
      setNotifications((prev) => [notif, ...prev]);
    } catch {
      const fallback = `New callback received from +1 (555) ${Math.floor(100000 + Math.random() * 900000)}`;
      const notif = { id: Date.now(), message: fallback, time: new Date().toLocaleTimeString() };
      setNotifications((prev) => [notif, ...prev]);
    }
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80">
        <div className="flex justify-between items-center px-6 lg:px-8 py-4">
          {/* Left side - Dashboard title and date */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <div className="hidden lg:flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Live data</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{currentDate}</p>
          </div>

          {/* Right side - Controls and user profile */}
          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            {/* <div className="relative">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent px-4 py-2.5 pr-10 min-w-[140px] shadow-sm"
              >
                <option value="Today">Today</option>
                <option value="Last 7 days">Last 7 days</option>
                <option value="Last 30 days">Last 30 days</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div> */}

            {/* View Controls */}
            <div className="hidden lg:flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <button className="px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg">
                View
              </button>
              <button className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Export
              </button>
            </div>

            {/* Notification */}
            <div className="relative">
              <button
                type="button"
                onClick={async () => {
                  setShowNotif((prev) => !prev);
                  if (notifications.length === 0) {
                    await loadDummyNotification();
                  }
                }}
                className="relative p-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.5 3.75a6 6 0 0 1 6 6v2.25a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25V9.75a6 6 0 0 1 6-6zM8.25 21a1.125 1.125 0 1 0 2.25 0 1.125 1.125 0 0 0-2.25 0z" />
                </svg>
                {notifications.length > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>}
              </button>

              {showNotif && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </div>
                  <ul className="max-h-60 overflow-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <li key={n.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 dark:text-gray-100">{n.message}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{n.time}</p>
                          </div>
                          <button
                            aria-label="Dismiss notification"
                            onClick={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                          >
                            <CloseIcon size={14} />
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No notifications</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                document.cookie = 'jwt=; Max-Age=0; path=/;';
                window.location.href = '/login';
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden lg:block">Logout</span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Modal */}
      <AnalyzeModal
        open={open}
        onClose={() => setOpen(false)}
        objections={objections}
        avgCallTime={avgCallTime}
        avgEngagement={avgEngagement}
        loading={!objections || objections.length === 0 || !avgCallTime || !avgEngagement}
      />
    </>
  );
};

export default Header;