"use client";
import React, { useState, useRef } from 'react';
import Header from '../components/Header';
import AgentPerformanceTable from '../components/AgentPerformanceTable';
import Sidebar, { useSidebar } from '../components/Sidebar';
import UploadLeadsModal from '../components/UploadLeadsModal';
import { getBaseUrl } from '../lib/utils';
import { Upload, Voicemail, AlertCircle, Check } from 'lucide-react';

export default function LeadsPage() {
  const { isExpanded } = useSidebar();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const tableRef = useRef(null);

  // Trigger Voicemail modal state
  const [isTriggerOpen, setIsTriggerOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState(null); // 'success' | 'error' | null
  const [triggerMessage, setTriggerMessage] = useState('');

  const handleTriggerVoicemail = async () => {
    setIsTriggering(true);
    setTriggerStatus(null);
    setTriggerMessage('');
    try {
      const res = await fetch(`${getBaseUrl()}/trigger-voicemail-manually`, {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error(`Failed to trigger voicemail: ${res.status} ${res.statusText}`);
      }
      let data = null;
      try {
        data = await res.json();
      } catch {}
      setTriggerStatus('success');
      setTriggerMessage((data && (data.message || data.detail)) ? (data.message || data.detail) : 'Voicemail trigger initiated successfully.');
      // Auto close after a short delay
      setTimeout(() => {
        setIsTriggerOpen(false);
        setTriggerStatus(null);
        setTriggerMessage('');
      }, 1800);
    } catch (err) {
      setTriggerStatus('error');
      setTriggerMessage(err.message || 'Failed to trigger voicemail. Please try again.');
    } finally {
      setIsTriggering(false);
    }
  };


  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className={`flex-1 transition-all duration-300 ${isExpanded ? 'lg:ml-64' : 'lg:ml-12'} ml-0`}>
        <div className="px-6 lg:px-8">
          <Header />
          
          {/* Page Header with Upload and Export Buttons */}
          <div className="mt-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads Management</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and organize your lead campaigns</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsTriggerOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm"
                >
                  <Voicemail size={20} />
                  Trigger voicemail manually
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm"
                >
                  <Upload size={20} />
                  Upload Leads
                </button>
              </div>
            </div>
          </div>


          {/* Leads Table */}
          <div className="mt-8" data-table-container>
            <AgentPerformanceTable ref={tableRef} defaultRowsPerPage={20} />
          </div>

          {/* Upload Modal */}
          <UploadLeadsModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />

          {/* Trigger Voicemail Confirmation Modal */}
          {isTriggerOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl m-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center rounded-full">
                      <Voicemail size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Trigger Voicemail</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Send voicemail to eligible leads now</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsTriggerOpen(false)}
                    disabled={isTriggering}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    This action will trigger the voicemail workflow immediately. Are you sure you want to proceed?
                  </p>

                  {triggerStatus === 'success' && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                      <Check className="text-green-600 dark:text-green-400" size={20} />
                      <span className="text-green-800 dark:text-green-200 font-medium">{triggerMessage}</span>
                    </div>
                  )}

                  {triggerStatus === 'error' && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                      <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />
                      <div>
                        <span className="text-red-800 dark:text-red-200 font-medium">Trigger failed</span>
                        {triggerMessage && <p className="text-red-700 dark:text-red-300 text-sm mt-1">{triggerMessage}</p>}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsTriggerOpen(false)}
                      disabled={isTriggering}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleTriggerVoicemail}
                      disabled={isTriggering}
                      className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
                    >
                      {isTriggering ? (
                        <>
                          <span className="animate-pulse">...</span>
                          Triggering
                        </>
                      ) : (
                        <>
                          <Voicemail size={16} />
                          Trigger Now
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