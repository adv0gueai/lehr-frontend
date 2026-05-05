'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';

// Create Sidebar Context
const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <SidebarContext.Provider value={{ isExpanded, setIsExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
};

const Sidebar = () => {
  const { isExpanded, setIsExpanded } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState('');
  const [userType, setUserType] = useState('');
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    const name = 'Ben Lehr';
    const type = 'Standard'
    if (name) setUserName(name);
    if (type) setUserType(type);
  }, []);

  const navItems = [
    {
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v14H8V5z" />
        </svg>
      ),
      label: 'Dashboard',
      ariaLabel: 'Dashboard'
    },
    {
      href: '/calls',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      label: 'Calls',
      ariaLabel: 'Calls Management'
    },
    {
      href: '/chat',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      label: 'Chat',
      ariaLabel: 'Chat Messages'
    },
  ];

  const handleLogout = () => {
    document.cookie = 'jwt=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_type');
    window.location.href = '/login';
  };

  if (!mounted) return null;

  return (
    <>
      {/* Mobile overlay */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen z-50 transition-all duration-300 ease-in-out flex flex-col
        ${isExpanded ? 'w-64' : 'w-12'}
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-lg
        ${isExpanded ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Header */}
        <div className="flex items-center px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <div className={`ml-4 transition-all duration-300 ${isExpanded ? 'opacity-100 block' : 'opacity-0 hidden lg:hidden'}`}>
            <h1 className="text-gray-900 dark:text-white font-bold text-xl">Advogue AI</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col p-4 mt-2 space-y-2 flex-shrink-0">
          {navItems.map((item) => {
            let isActive = false;
            if (item.href === '/') {
              isActive = pathname === '/';
            } else {
              isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <span className="flex-shrink-0">
                  {item.icon}
                </span>
                <span className={`
                  ml-3 transition-all duration-300
                  ${isExpanded ? 'opacity-100 block' : 'opacity-0 hidden lg:hidden'}
                `}>
                  {item.label}
                </span>
                {isActive && !isExpanded && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="space-y-2 mb-4">
            <button
              onClick={toggleTheme}
              className="group flex items-center w-full px-3 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
            >
              <span className="flex-shrink-0">
                {isDark ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </span>
              <span className={`
                ml-3 transition-all duration-300
                ${isExpanded ? 'opacity-100 block' : 'opacity-0 hidden lg:hidden'}
              `}>
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          </div>

          {/* User Profile */}
          <div className="flex items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">{userName ? userName.charAt(0).toUpperCase() : 'U'}</span>
            </div>
            <div className={`ml-3 flex-1 transition-all duration-300 ${isExpanded ? 'opacity-100 block' : 'opacity-0 hidden lg:hidden'}`}>
              <p className="text-gray-900 dark:text-white font-medium text-sm">{userName || 'User'}</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">{userType ? userType.charAt(0).toUpperCase() + userType.slice(1) + ' User' : 'User'}</p>
            </div>
            {isExpanded && (
              <button
                onClick={handleLogout}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Logout"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        onClick={() => setIsExpanded(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2.5 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop expand/collapse button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="hidden lg:block fixed left-4 top-20 z-30 p-2 bg-white dark:bg-gray-900 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <svg className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </>
  );
};

export default Sidebar;