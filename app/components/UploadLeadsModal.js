"use client";
import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Upload, File, Check, X, AlertCircle, Download, Users, Calendar, Clock, User } from 'lucide-react';
import { getBaseUrl } from '../lib/utils';

export default function UploadLeadsModal({ isOpen, onClose }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(null);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [campaignName, setCampaignName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [voicemailType, setVoicemailType] = useState('ai');
  const [forwardingNumber, setForwardingNumber] = useState('+13104992935');
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  // Sample CSV data for demonstration
  const sampleData = [
    'Input_Property_Address,Input_Property_City,Input_Property_State,Input_Property_Zip,Mailing_Zip,Mailing_State,Mailing_City,Phone_Confirmed_DNC,Phone_Confirmed,Mailing_Address,Email1,Email2,Email3,OWNER_LAST_NAME,OWNER_FIRST_NAME,EQUITY_PERCENT,EQUITY,ABSENTEE_OWNER,PROPERTY_VACANT,LITIGATOR,USPS_DELIVERABLE,Data_Mailing_Address,Data_Mailing_City,Data_Mailing_State,Data_Mailing_Zip',
    '2012 E 76th Pl,Los Angeles,CA,90001,92394,CA,Victorville,NO,3232534387,15515 San Francisco Ln,magdalena.722@hotmail.com,eddylopez1248@gmail.com,henay1981@gmail.com,Lopez,Eduardo,76.4,671983,NO,NO,NO,YES,2012 E 76th Pl,Los Angeles,CA,90001',
    '10407 S Broadway,Los Angeles,CA,90003,90003,CA,Los Angeles,NO,6262903103,10407 S Broadway,rich.fox@att.net,rloomis888@gmail.com,,Fox,Ricky,52.6,479437,YES,NO,NO,NO,3822 Lockland Dr,Los Angeles,CA,90008'
  ];

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Close modal when clicking outside
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
      } else {
        setUploadStatus('error');
        setUploadMessage('Please select a CSV file');
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setUploadStatus(null);
        setUploadMessage('');
      } else {
        setUploadStatus('error');
        setUploadMessage('Please select a CSV file');
      }
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = sampleData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_leads.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    // Validate form
    if (!campaignName.trim()) {
      setUploadStatus('error');
      setUploadMessage('Please enter a campaign name');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);
    setUploadMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('campaign_name', campaignName);
      
      // Add voicemail_id based on selection
      const voicemailId = voicemailType === 'ai' 
        ? '1d3ed388-cb30-476b-887a-b75caa260b05'
        : 'a15358ad-8a0c-46a6-9dab-f4660a479436';
      formData.append('recording_id', voicemailId);
      
      // Add forwarding number
      formData.append('forwarding_number', forwardingNumber);
      
      if (scheduleDate) {
        const scheduledDateTime = new Date(scheduleDate);
        const [hours, minutes] = scheduleTime.split(':');
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));
        formData.append('scheduled_date', scheduledDateTime.toISOString());
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`${getBaseUrl()}/upload-leads`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      setUploadStatus('success');
      setUploadMessage(`Successfully uploaded ${result.total_processed || 'multiple'} leads`);
      setUploadResults(result);
      
      // Reset form after success
      setTimeout(() => {
        resetForm();
        onClose();
      }, 2000);

    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error.message || 'Upload failed. Please try again.');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
      }, 2000);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUploadStatus(null);
    setUploadMessage('');
    setUploadProgress(0);
    setUploadResults(null);
    setCampaignName('');
    setScheduleDate(null);
    setVoicemailType('ai');
    setForwardingNumber('+13104992935');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto modal-content"
      >
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center rounded-full">
                <Upload size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Upload Leads Campaign</h2>
                <p className="text-sm text-gray-600">Create a new lead campaign with scheduling options</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadSampleCSV}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
              >
                <Download size={16} />
                Sample CSV
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-8">
          <form onSubmit={(e) => { e.preventDefault(); uploadFile(); }} className="space-y-8">
            {/* Campaign Information Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Campaign Information
                </h3>
                
                <div>
                  <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    id="campaignName"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white placeholder-gray-500"
                    placeholder="Enter campaign name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="voicemailType" className="block text-sm font-medium text-gray-700 mb-2">
                    Voicemail Type
                  </label>
                  <select
                    id="voicemailType"
                    value={voicemailType}
                    onChange={(e) => {
                      setVoicemailType(e.target.value);
                      // Update forwarding number based on voicemail type
                      setForwardingNumber(e.target.value === 'ai' ? '+13104992935' : '+19165005467');
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                  >
                    <option value="ai">AI Voicemail</option>
                    <option value="custom">Custom Voicemail</option>
                  </select>
                </div>

              </div>

              {/* Schedule Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Schedule Campaign
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Date
                  </label>
                  <div className="relative">
                    <DatePicker
                      selected={scheduleDate}
                      onChange={(date) => setScheduleDate(date)}
                      dateFormat="MMMM d, yyyy"
                      minDate={new Date()}
                      placeholderText="Select a date"
                      className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white placeholder-gray-500"
                      wrapperClassName="w-full"
                    />
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Leave empty to start immediately</p>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <File className="w-5 h-5 text-blue-600" />
                Upload Leads File
              </h3>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                } ${selectedFile ? 'bg-green-50 border-green-300' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <File size={32} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={isUploading}
                      className="text-sm text-red-600 hover:text-red-700 disabled:text-red-400"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                      <Upload size={32} />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        Drop your CSV file here, or{' '}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-blue-600 hover:text-blue-700 underline"
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Supports CSV files up to 10MB
                      </p>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Creating campaign...</span>
                  <span className="text-sm text-gray-500">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status Messages */}
            {uploadStatus && (
              <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${
                uploadStatus === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {uploadStatus === 'success' ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className={`font-medium ${
                    uploadStatus === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {uploadStatus === 'success' ? 'Campaign Created Successfully!' : 'Campaign Creation Failed'}
                  </p>
                  <p className={`text-sm ${
                    uploadStatus === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {uploadMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Upload Results */}
            {uploadResults && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Total Processed</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {uploadResults.total_processed || 0}
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Successful</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {uploadResults.successful || 0}
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <X className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-800">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900 mt-1">
                    {uploadResults.failed || 0}
                  </p>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                disabled={isUploading}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 rounded-lg transition-colors duration-200 font-medium"
              >
                Reset Form
              </button>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 rounded-lg transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile || !campaignName.trim()}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-200 flex items-center gap-2 font-medium"
                >
                  <Upload size={20} />
                  {isUploading ? 'Creating Campaign...' : 'Create Campaign'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
