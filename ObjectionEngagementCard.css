"use client";

import React, { useState } from 'react';
import { X, Download, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { getBaseUrl } from '../lib/utils';

const ExportModal = ({ isOpen, onClose, filters, searchTerm, exportType = 'leads' }) => {
  const [exportCount, setExportCount] = useState(100);
  const [customCount, setCustomCount] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null); // 'success', 'error', or null
  const [errorMessage, setErrorMessage] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus(null);
    setErrorMessage('');

    try {
      const isAssistantsExport = exportType === 'assistants';

      const requestBody = {
        page: 1,
        page_size: exportCount === 'custom' ? parseInt(customCount) || 100 : exportCount,
      };

      // Add filters based on export type
      if (isAssistantsExport) {
        // Assistants filters
        requestBody.call_id = filters.call_id || null;
        requestBody.from_number = filters.from_number || null;
        requestBody.user_sentiment = filters.user_sentiment !== 'all' ? filters.user_sentiment : null;
        requestBody.quote_related = filters.quote_related !== 'all' ? filters.quote_related === 'true' : null;
        requestBody.service_request = filters.service_request !== 'all' ? filters.service_request === 'true' : null;
        requestBody.start_date = filters.start_date || null;
        requestBody.end_date = filters.end_date || null;
        requestBody.sort_by = filters.sort_by || 'created_at';
        requestBody.sort_order = filters.sort_order || 'desc';
      } else if (isQuotesExport) {
        // Quotes filters
        requestBody.phone_number = filters.phone_number || null;
        requestBody.full_name = filters.full_name || null;
        requestBody.email_address = filters.email_address || null;
        requestBody.status = filters.status !== 'all' ? filters.status : null;
        requestBody.quote_related = filters.quote_related !== 'all' ? filters.quote_related === 'true' : null;
        requestBody.insured_id = filters.insured_id || null;
        requestBody.call_id = filters.call_id || null;
        requestBody.line_of_business = filters.line_of_business !== 'all' ? filters.line_of_business : null;
        requestBody.quote_number = filters.quote_number || null;
        requestBody.premium_min = filters.premium_min !== '' ? Number(filters.premium_min) : null;
        requestBody.premium_max = filters.premium_max !== '' ? Number(filters.premium_max) : null;
        requestBody.start_date = filters.start_date || null;
        requestBody.end_date = filters.end_date || null;
        requestBody.sort_by = filters.sort_by || 'created_at';
        requestBody.sort_order = filters.sort_order || 'desc';
      } else if (isServiceRequestsExport) {
        // Service requests filters
        requestBody.phone_number = filters.phone_number || null;
        requestBody.customer_name = filters.customer_name || null;
        requestBody.customer_email = filters.customer_email || null;
        requestBody.status = filters.status !== 'all' ? filters.status : null;
        requestBody.insured_id = filters.insured_id || null;
        requestBody.call_id = filters.call_id || null;
        requestBody.start_date = filters.start_date || null;
        requestBody.end_date = filters.end_date || null;
        requestBody.sort_by = filters.sort_by || 'created_at';
        requestBody.sort_order = filters.sort_order || 'desc';
      } else if (isChatMessagesExport) {
        // Chat messages filters
        requestBody.sort_by = 'created_at';
        requestBody.sort_order = 'desc';
        requestBody.filters = {
          phone_number: filters.phone_number || null,
          start_date: filters.start_date || null,
          end_date: filters.end_date || null,
          message_type: filters.message_type !== 'all' ? filters.message_type : null,
          response_complete: filters.response_complete !== 'all' ? filters.response_complete === 'true' : null,
          has_response: filters.has_response !== 'all' ? filters.has_response === 'true' : null,
          min_tokens: filters.min_tokens !== '' ? Number(filters.min_tokens) : null,
          max_tokens: filters.max_tokens !== '' ? Number(filters.max_tokens) : null,
        };
      } else {
        // Leads filters (existing logic)
        requestBody.inbound_call_received = filters.inboundCallReceived !== 'all' ? filters.inboundCallReceived : null;
        requestBody.voicemail_sent = filters.voicemailSent !== 'all' ? filters.voicemailSent : null;
        requestBody.email_sent = filters.emailSent !== 'all' ? filters.emailSent : null;
        requestBody.start_date = filters.startDate || null;
        requestBody.end_date = filters.endDate || null;
        requestBody.sort_by = filters.sortBy || 'created_at';
        requestBody.sort_order = filters.sortOrder || 'desc';
        requestBody.qualified = filters.qualified !== 'all' ? filters.qualified : null;
        requestBody.qualification_score_min = filters.qualificationScoreMin !== '' ? Number(filters.qualificationScoreMin) : null;
        requestBody.qualification_score_max = filters.qualificationScoreMax !== '' ? Number(filters.qualificationScoreMax) : null;
        requestBody.call_summary_search = filters.callSummarySearch || null;
      }

      // Add search term if present
      if (searchTerm) {
        requestBody.search_term = searchTerm;
      }

      const endpoint = isAssistantsExport ? '/assistant-data/assistant-calls' :
                      isQuotesExport ? '/assistant-data/quotes' :
                      isServiceRequestsExport ? '/assistant-data/service-tasks' :
                      isChatMessagesExport ? '/transcriptions/list' : '/get-leads';
      const response = await fetch(`${getBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let records = [];

      if (isAssistantsExport) {
        records = data.assistant_calls || [];
      } else if (isQuotesExport) {
        records = data.quotes || [];
      } else if (isServiceRequestsExport) {
        records = data.service_tasks || data.service_requests || [];
      } else if (isChatMessagesExport) {
        records = data.phone_numbers || [];
      } else {
        records = data.leads || [];
      }

      if (records.length === 0) {
        throw new Error('No data found to export with the current filters.');
      }

      // Convert to CSV
      const csvContent = convertToCSV(records, exportType);
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with timestamp and filters
      const timestamp = new Date().toISOString().split('T')[0];
      const filterInfo = getFilterInfo(exportType);
      const typeName = exportType === 'assistants' ? 'assistants' :
                      exportType === 'quotes' ? 'quotes' :
                      exportType === 'service-requests' ? 'service_requests' :
                      exportType === 'chat-messages' ? 'chat_messages' : 'leads';
      const filename = `${typeName}_export_${timestamp}${filterInfo}.csv`;
      
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportStatus('success');
      
      // Auto close modal after 2 seconds on success
      setTimeout(() => {
        onClose();
        setExportStatus(null);
      }, 2000);

    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
      setErrorMessage(error.message || 'Failed to export leads. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const convertToCSV = (data, exportType = 'leads') => {
    if (!data || data.length === 0) return '';

    let headers;
    let getRowValues;

    if (exportType === 'assistants') {
      // Define headers for Assistants CSV
      headers = [
        'ID',
        'Call ID',
        'From Number',
        'Call Summary',
        'Recording URL',
        'Call Transcription',
        'User Sentiment',
        'Quote Related',
        'Service Request',
        'Created At',
        'Updated At'
      ];

      getRowValues = (row) => [
        escapeCsvField(row.id || ''),
        escapeCsvField(row.call_id || ''),
        escapeCsvField(row.from_number || ''),
        escapeCsvField(row.call_summary || ''),
        escapeCsvField(row.recording_url || ''),
        escapeCsvField(row.call_transcription || ''),
        escapeCsvField(row.user_sentiment || ''),
        escapeCsvField(row.quote_related ? 'Yes' : 'No'),
        escapeCsvField(row.service_request ? 'Yes' : 'No'),
        escapeCsvField(row.created_at || ''),
        escapeCsvField(row.updated_at || '')
      ];
    } else if (exportType === 'quotes') {
      // Define headers for Quotes CSV
      headers = [
        'ID',
        'Phone Number',
        'Call ID',
        'Full Name',
        'Email Address',
        'Property Address',
        'Policy Renewal Date',
        'Insured ID',
        'Quote Number',
        'Line of Business',
        'Premium',
        'Status',
        'Created At',
        'Updated At',
        'Quote Related'
      ];

      getRowValues = (row) => [
        escapeCsvField(row.id || ''),
        escapeCsvField(row.phone_number || ''),
        escapeCsvField(row.call_id || ''),
        escapeCsvField(row.full_name || ''),
        escapeCsvField(row.email_address || ''),
        escapeCsvField(row.property_address || ''),
        escapeCsvField(row.policy_renewal_date || ''),
        escapeCsvField(row.insured_id || ''),
        escapeCsvField(row.quote_number || ''),
        escapeCsvField(row.line_of_business || ''),
        escapeCsvField(row.premium || ''),
        escapeCsvField(row.status || ''),
        escapeCsvField(row.created_at || ''),
        escapeCsvField(row.updated_at || ''),
        escapeCsvField(row.quote_related ? 'Yes' : 'No')
      ];
    } else if (exportType === 'service-requests') {
      // Define headers for Service Requests CSV
      headers = [
        'ID',
        'Phone Number',
        'Call ID',
        'Customer Name',
        'Customer Email',
        'Task Summary',
        'Insured ID',
        'Status',
        'Created At',
        'Updated At',
        'Service Request'
      ];

      getRowValues = (row) => [
        escapeCsvField(row.id || ''),
        escapeCsvField(row.phone_number || ''),
        escapeCsvField(row.call_id || ''),
        escapeCsvField(row.customer_name || ''),
        escapeCsvField(row.customer_email || ''),
        escapeCsvField(row.task_summary || ''),
        escapeCsvField(row.insured_id || ''),
        escapeCsvField(row.status || ''),
        escapeCsvField(row.created_at || ''),
        escapeCsvField(row.updated_at || ''),
        escapeCsvField(row.service_request ? 'Yes' : 'No')
      ];
    } else if (exportType === 'chat-messages') {
      // Define headers for Chat Messages CSV
      headers = [
        'Phone Number',
        'Customer Name',
        'Customer Email',
        'Property Address',
        'Qualified',
        'Qualification Score',
        'Conversation Count',
        'Total Tokens',
        'Total Cost',
        'First Message Date',
        'Last Message Date',
        'Latest Thread ID'
      ];

      getRowValues = (row) => [
        escapeCsvField(row.phone_number || ''),
        escapeCsvField((row.lead_details?.first_name && row.lead_details?.last_name)
          ? `${row.lead_details.first_name} ${row.lead_details.last_name}`
          : ''),
        escapeCsvField(row.lead_details?.email || ''),
        escapeCsvField(row.lead_details?.input_property_address || ''),
        escapeCsvField(row.lead_details?.qualified || ''),
        escapeCsvField(row.lead_details?.qualification_score || ''),
        escapeCsvField(row.conversation_count || ''),
        escapeCsvField(row.total_tokens_used || ''),
        escapeCsvField(row.total_cost || ''),
        escapeCsvField(row.first_message_date || ''),
        escapeCsvField(row.last_message_date || ''),
        escapeCsvField(row.latest_thread_id || '')
      ];
    } else {
      // Define headers for Leads CSV (existing logic)
      headers = [
        'Email',
        'Owner Name',
        'Phone Number',
        'Voicemail Sent',
        'Email Sent',
        'Inbound Call Received',
        'Qualified',
        'Booked',
        'Call Summary',
        'Smoker Status',
        'Beneficiary Age',
        'Beneficiary Name',
        'State of Residence',
        'Call Duration',
        'User Sentiment',
        'Call Successful',
        'Combined Cost',
        'Disconnect Reason',
        'UUID',
        'Created At',
        'First Name',
        'Last Name',
        'Date of Death',
        'Recording ID'
      ];

      getRowValues = (row) => [
        escapeCsvField(row.email || ''),
        escapeCsvField(row.owner_last_name || row.full_legal_name || row.name || ''),
        escapeCsvField(row.phone_number || ''),
        escapeCsvField(row.voicemail_sent || ''),
        escapeCsvField(row.email_sent || ''),
        escapeCsvField(row.inbound_call_received || ''),
        escapeCsvField(row.qualified || ''),
        escapeCsvField(row.booked || ''),
        escapeCsvField(row.call_summary || ''),
        escapeCsvField(row.smoker_status || ''),
        escapeCsvField(row.beneficiary_age || ''),
        escapeCsvField(row.beneficiary_name || ''),
        escapeCsvField(row.state_of_residence || ''),
        escapeCsvField(row.call_duration || ''),
        escapeCsvField(row.user_sentiment || ''),
        escapeCsvField(row.call_successful || ''),
        escapeCsvField(row.combined_cost || ''),
        escapeCsvField(row.disconnect_reason || ''),
        escapeCsvField(row.uuid || ''),
        escapeCsvField(row.created_at || ''),
        escapeCsvField(row.first_name || ''),
        escapeCsvField(row.last_name || ''),
        escapeCsvField(row.date_of_death || ''),
        escapeCsvField(row.recording_id || '')
      ];
    }

    // Create CSV content
    const csvRows = [];
    csvRows.push(headers.join(','));

    data.forEach(row => {
      const values = getRowValues(row);
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  };

  const escapeCsvField = (field) => {
    if (field === null || field === undefined) return '';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const getFilterInfo = (exportType = 'leads') => {
    const appliedFilters = [];

    if (exportType === 'assistants') {
      // Assistants filters
      if (filters.call_id) {
        appliedFilters.push(`call_${filters.call_id.substring(0, 8)}`);
      }
      if (filters.from_number) {
        appliedFilters.push(`from_${filters.from_number}`);
      }
      if (filters.user_sentiment !== 'all') {
        appliedFilters.push(`sentiment_${filters.user_sentiment}`);
      }
      if (filters.quote_related !== 'all') {
        appliedFilters.push(`quote_${filters.quote_related}`);
      }
      if (filters.service_request !== 'all') {
        appliedFilters.push(`service_${filters.service_request}`);
      }
      if (filters.start_date) {
        appliedFilters.push(`from_${filters.start_date}`);
      }
      if (filters.end_date) {
        appliedFilters.push(`to_${filters.end_date}`);
      }
    } else if (exportType === 'quotes') {
      // Quotes filters
      if (filters.phone_number) {
        appliedFilters.push(`phone_${filters.phone_number}`);
      }
      if (filters.full_name) {
        appliedFilters.push(`name_${filters.full_name.substring(0, 8)}`);
      }
      if (filters.email_address) {
        appliedFilters.push(`email_${filters.email_address.substring(0, 8)}`);
      }
      if (filters.status !== 'all') {
        appliedFilters.push(`status_${filters.status}`);
      }
      if (filters.line_of_business !== 'all') {
        appliedFilters.push(`line_${filters.line_of_business}`);
      }
      if (filters.quote_number) {
        appliedFilters.push(`quote_${filters.quote_number}`);
      }
      if (filters.premium_min !== '' || filters.premium_max !== '') {
        appliedFilters.push(`premium_${filters.premium_min || 0}_${filters.premium_max || '∞'}`);
      }
      if (filters.start_date) {
        appliedFilters.push(`from_${filters.start_date}`);
      }
      if (filters.end_date) {
        appliedFilters.push(`to_${filters.end_date}`);
      }
    } else if (exportType === 'service-requests') {
      // Service requests filters
      if (filters.phone_number) {
        appliedFilters.push(`phone_${filters.phone_number}`);
      }
      if (filters.customer_name) {
        appliedFilters.push(`name_${filters.customer_name.substring(0, 8)}`);
      }
      if (filters.customer_email) {
        appliedFilters.push(`email_${filters.customer_email.substring(0, 8)}`);
      }
      if (filters.status !== 'all') {
        appliedFilters.push(`status_${filters.status}`);
      }
      if (filters.insured_id) {
        appliedFilters.push(`insured_${filters.insured_id}`);
      }
      if (filters.call_id) {
        appliedFilters.push(`call_${filters.call_id.substring(0, 8)}`);
      }
      if (filters.start_date) {
        appliedFilters.push(`from_${filters.start_date}`);
      }
      if (filters.end_date) {
        appliedFilters.push(`to_${filters.end_date}`);
      }
    } else if (exportType === 'chat-messages') {
      // Chat messages filters
      if (filters.phone_number) {
        appliedFilters.push(`phone_${filters.phone_number}`);
      }
      if (filters.message_type !== 'all') {
        appliedFilters.push(`type_${filters.message_type}`);
      }
      if (filters.response_complete !== 'all') {
        appliedFilters.push(`complete_${filters.response_complete}`);
      }
      if (filters.has_response !== 'all') {
        appliedFilters.push(`response_${filters.has_response}`);
      }
      if (filters.min_tokens !== '' || filters.max_tokens !== '') {
        appliedFilters.push(`tokens_${filters.min_tokens || 0}_${filters.max_tokens || '∞'}`);
      }
      if (filters.start_date) {
        appliedFilters.push(`from_${filters.start_date}`);
      }
      if (filters.end_date) {
        appliedFilters.push(`to_${filters.end_date}`);
      }
    } else {
      // Leads filters (existing logic)
      if (filters.inboundCallReceived !== 'all') {
        appliedFilters.push(`call_${filters.inboundCallReceived}`);
      }
      if (filters.voicemailSent !== 'all') {
        appliedFilters.push(`vm_${filters.voicemailSent}`);
      }
      if (filters.emailSent !== 'all') {
        appliedFilters.push(`email_${filters.emailSent}`);
      }
      if (filters.qualified !== 'all') {
        appliedFilters.push(`qualified_${filters.qualified}`);
      }
      if (filters.startDate) {
        appliedFilters.push(`from_${filters.startDate}`);
      }
      if (filters.endDate) {
        appliedFilters.push(`to_${filters.endDate}`);
      }
    }

    if (searchTerm) {
      appliedFilters.push('filtered');
    }
    return appliedFilters.length > 0 ? `_${appliedFilters.join('_')}` : '';
  };

  const resetModal = () => {
    setExportCount(100);
    setCustomCount('');
    setExportStatus(null);
    setErrorMessage('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl m-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center rounded-full">
              <Download size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Export {exportType === 'assistants' ? 'Assistants' : exportType === 'quotes' ? 'Quotes' : exportType === 'service-requests' ? 'Service Requests' : exportType === 'chat-messages' ? 'Chat Messages' : 'Leads'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download filtered {exportType === 'assistants' ? 'assistants' : exportType === 'quotes' ? 'quotes' : exportType === 'service-requests' ? 'service requests' : exportType === 'chat-messages' ? 'chat messages' : 'leads'} data
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Export Amount Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Number of records to export
            </label>
            <div className="space-y-3">
              {[100, 500, 1000, 2000].map((count) => (
                <label key={count} className="flex items-center">
                  <input
                    type="radio"
                    name="exportCount"
                    value={count}
                    checked={exportCount === count}
                    onChange={(e) => setExportCount(parseInt(e.target.value))}
                    disabled={isExporting}
                    className="mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{count.toLocaleString()} records</span>
                </label>
              ))}
              <label className="flex items-center">
                <input
                  type="radio"
                  name="exportCount"
                  value="custom"
                  checked={exportCount === 'custom'}
                  onChange={(e) => setExportCount(e.target.value)}
                  disabled={isExporting}
                  className="mr-3 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300 mr-3">Custom:</span>
                <input
                  type="number"
                  placeholder="Enter count"
                  value={customCount}
                  onChange={(e) => setCustomCount(e.target.value)}
                  disabled={isExporting || exportCount !== 'custom'}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 disabled:opacity-50"
                  min="1"
                  max="10000"
                />
              </label>
            </div>
          </div>

          {/* Active Filters Info */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Active Filters:</h4>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex flex-wrap gap-2">
                {exportType === 'assistants' ? (
                  // Assistants filters
                  <>
                    {filters.call_id && (
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Call ID: {filters.call_id}
                      </span>
                    )}
                    {filters.from_number && (
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        From: {filters.from_number}
                      </span>
                    )}
                    {filters.user_sentiment !== 'all' && (
                      <span className="bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-2 py-1 rounded">
                        Sentiment: {filters.user_sentiment}
                      </span>
                    )}
                    {filters.quote_related !== 'all' && (
                      <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-1 rounded">
                        Quote: {filters.quote_related}
                      </span>
                    )}
                    {filters.service_request !== 'all' && (
                      <span className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-1 rounded">
                        Service: {filters.service_request}
                      </span>
                    )}
                    {filters.start_date && (
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                        From: {filters.start_date}
                      </span>
                    )}
                    {filters.end_date && (
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                        To: {filters.end_date}
                      </span>
                    )}
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                      Sort: {filters.sort_by || 'created_at'}/{filters.sort_order || 'desc'}
                    </span>
                    {!filters.call_id && !filters.from_number && filters.user_sentiment === 'all' && filters.quote_related === 'all' && filters.service_request === 'all' && !filters.start_date && !filters.end_date && !searchTerm && (
                      <span className="text-gray-500">No filters applied - all data will be exported</span>
                    )}
                  </>
                ) : exportType === 'quotes' ? (
                  // Quotes filters
                  <>
                    {filters.phone_number && (
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Phone: {filters.phone_number}
                      </span>
                    )}
                    {filters.full_name && (
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        Name: {filters.full_name}
                      </span>
                    )}
                    {filters.email_address && (
                      <span className="bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-2 py-1 rounded">
                        Email: {filters.email_address}
                      </span>
                    )}
                    {filters.status !== 'all' && (
                      <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-1 rounded">
                        Status: {filters.status}
                      </span>
                    )}
                    {filters.line_of_business !== 'all' && (
                      <span className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-1 rounded">
                        Line: {filters.line_of_business}
                      </span>
                    )}
                    {filters.quote_number && (
                      <span className="bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 px-2 py-1 rounded">
                        Quote: {filters.quote_number}
                      </span>
                    )}
                    {(filters.premium_min !== '' || filters.premium_max !== '') && (
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                        Premium: {filters.premium_min || 0} - {filters.premium_max || '∞'}
                      </span>
                    )}
                    {filters.start_date && (
                      <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded">
                        From: {filters.start_date}
                      </span>
                    )}
                    {filters.end_date && (
                      <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded">
                        To: {filters.end_date}
                      </span>
                    )}
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                      Sort: {filters.sort_by || 'created_at'}/{filters.sort_order || 'desc'}
                    </span>
                    {!filters.phone_number && !filters.full_name && !filters.email_address && filters.status === 'all' && filters.line_of_business === 'all' && !filters.quote_number && filters.premium_min === '' && filters.premium_max === '' && !filters.start_date && !filters.end_date && !searchTerm && (
                      <span className="text-gray-500">No filters applied - all data will be exported</span>
                    )}
                  </>
                ) : exportType === 'service-requests' ? (
                  // Service requests filters
                  <>
                    {filters.phone_number && (
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Phone: {filters.phone_number}
                      </span>
                    )}
                    {filters.customer_name && (
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        Name: {filters.customer_name}
                      </span>
                    )}
                    {filters.customer_email && (
                      <span className="bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-2 py-1 rounded">
                        Email: {filters.customer_email}
                      </span>
                    )}
                    {filters.status !== 'all' && (
                      <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-1 rounded">
                        Status: {filters.status}
                      </span>
                    )}
                    {filters.insured_id && (
                      <span className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-1 rounded">
                        Insured: {filters.insured_id}
                      </span>
                    )}
                    {filters.call_id && (
                      <span className="bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 px-2 py-1 rounded">
                        Call: {filters.call_id}
                      </span>
                    )}
                    {filters.start_date && (
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                        From: {filters.start_date}
                      </span>
                    )}
                    {filters.end_date && (
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                        To: {filters.end_date}
                      </span>
                    )}
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                      Sort: {filters.sort_by || 'created_at'}/{filters.sort_order || 'desc'}
                    </span>
                    {!filters.phone_number && !filters.customer_name && !filters.customer_email && filters.status === 'all' && !filters.insured_id && !filters.call_id && !filters.start_date && !filters.end_date && !searchTerm && (
                      <span className="text-gray-500">No filters applied - all data will be exported</span>
                    )}
                  </>
                ) : exportType === 'chat-messages' ? (
                  // Chat messages filters
                  <>
                    {filters.phone_number && (
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Phone: {filters.phone_number}
                      </span>
                    )}
                    {filters.message_type !== 'all' && (
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        Type: {filters.message_type}
                      </span>
                    )}
                    {filters.response_complete !== 'all' && (
                      <span className="bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-2 py-1 rounded">
                        Complete: {filters.response_complete}
                      </span>
                    )}
                    {filters.has_response !== 'all' && (
                      <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-1 rounded">
                        Has Response: {filters.has_response}
                      </span>
                    )}
                    {(filters.min_tokens !== '' || filters.max_tokens !== '') && (
                      <span className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-1 rounded">
                        Tokens: {filters.min_tokens || 0} - {filters.max_tokens || '∞'}
                      </span>
                    )}
                    {filters.start_date && (
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                        From: {filters.start_date}
                      </span>
                    )}
                    {filters.end_date && (
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                        To: {filters.end_date}
                      </span>
                    )}
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                      Sort: created_at/desc
                    </span>
                    {!filters.phone_number && filters.message_type === 'all' && filters.response_complete === 'all' && filters.has_response === 'all' && filters.min_tokens === '' && filters.max_tokens === '' && !filters.start_date && !filters.end_date && !searchTerm && (
                      <span className="text-gray-500">No filters applied - all data will be exported</span>
                    )}
                  </>
                ) : (
                  // Leads filters (existing logic)
                  <>
                    {filters.inboundCallReceived !== 'all' && (
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Call: {filters.inboundCallReceived}
                      </span>
                    )}
                    {filters.voicemailSent !== 'all' && (
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        Voicemail: {filters.voicemailSent}
                      </span>
                    )}
                    {filters.emailSent !== 'all' && (
                      <span className="bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-2 py-1 rounded">
                        Email: {filters.emailSent}
                      </span>
                    )}
                    {filters.qualified !== 'all' && (
                      <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-1 rounded">
                        Qualified: {filters.qualified}
                      </span>
                    )}
                    {(filters.qualificationScoreMin !== '' || filters.qualificationScoreMax !== '') && (
                      <span className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-1 rounded">
                        Score: {filters.qualificationScoreMin || 0} - {filters.qualificationScoreMax || '∞'}
                      </span>
                    )}
                    {filters.callSummarySearch && (
                      <span className="bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 px-2 py-1 rounded">
                        Summary: {filters.callSummarySearch}
                      </span>
                    )}
                    {filters.startDate && (
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                        From: {filters.startDate}
                      </span>
                    )}
                    {filters.endDate && (
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                        To: {filters.endDate}
                      </span>
                    )}
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                      Sort: {filters.sortBy || 'created_at'}/{filters.sortOrder || 'desc'}
                    </span>
                    {filters.inboundCallReceived === 'all' && filters.voicemailSent === 'all' && filters.emailSent === 'all' && filters.qualified === 'all' && !filters.startDate && !filters.endDate && !filters.callSummarySearch && (filters.qualificationScoreMin === '' || filters.qualificationScoreMin === null) && (filters.qualificationScoreMax === '' || filters.qualificationScoreMax === null) && !searchTerm && (
                      <span className="text-gray-500">No filters applied - all data will be exported</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {exportStatus === 'success' && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
              <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
              <span className="text-green-800 dark:text-green-200 font-medium">Export completed successfully!</span>
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />
              <div>
                <span className="text-red-800 dark:text-red-200 font-medium">Export failed</span>
                {errorMessage && <p className="text-red-700 dark:text-red-300 text-sm mt-1">{errorMessage}</p>}
              </div>
            </div>
          )}

          {/* Export Button */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isExporting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || (exportCount === 'custom' && (!customCount || parseInt(customCount) < 1))}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Exporting...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Export CSV
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;