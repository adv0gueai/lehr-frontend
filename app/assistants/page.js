"use client";
import React, { useState, useRef } from 'react';
import Header from '../components/Header';
import AssistantsTable from '../components/AssistantsTable';
import Sidebar, { useSidebar } from '../components/Sidebar';
import { Download } from 'lucide-react';

export default function AssistantsPage() {
  const { isExpanded } = useSidebar();
  const tableRef = useRef(null);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className={`flex-1 transition-all duration-300 ${isExpanded ? 'lg:ml-64' : 'lg:ml-12'} ml-0`}>
        <div className="px-6 lg:px-8">
          <Header />

          {/* Page Header with Export Button */}
          <div className="mt-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assistants Management</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and analyze assistant call data</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (tableRef.current) {
                      tableRef.current.openExportModal();
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm"
                >
                  <Download size={20} />
                  Export Data
                </button>
              </div>
            </div>
          </div>

          {/* Assistants Table */}
          <div className="mt-8" data-table-container>
            <AssistantsTable ref={tableRef} defaultRowsPerPage={20} />
          </div>
        </div>
      </div>
    </div>
  );
}