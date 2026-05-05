"use client";
import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  X,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getBaseUrl } from '../lib/utils';

export default function TagManagement({
  selectedConversation,
  agentType, // 'property' or 'workers-comp'
  onTagUpdate
}) {
  const [tags, setTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isAttachingTag, setIsAttachingTag] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Create new tag form state
  const [newTagName, setNewTagName] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Attach tag state
  const [selectedTagToAttach, setSelectedTagToAttach] = useState('');
  const [attachError, setAttachError] = useState('');
  const [attachSuccess, setAttachSuccess] = useState('');

  // Local state for optimistic updates
  const [localTags, setLocalTags] = useState([]);

  // Helper function to get unique tags
  const getUniqueTags = () => {
    const conversationTags = selectedConversation?.tags || [];
    const leadDetailsTags = selectedConversation?.lead_details?.tags || [];
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

  // Update local tags when selected conversation changes
  useEffect(() => {
    if (selectedConversation) {
      const uniqueTags = getUniqueTags();
      setLocalTags(uniqueTags);
    } else {
      setLocalTags([]);
    }
  }, [selectedConversation]);

  const conversationTags = localTags;

  // Fetch all available tags
  const fetchTags = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/all-tags`, {
        headers: { 'accept': 'application/json' },
      });

      if (!res.ok) throw new Error('Failed to fetch tags');

      const data = await res.json();
      setAvailableTags(data.tags || []);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  // Load tags when component mounts or conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchTags();
    }
  }, [selectedConversation]);

  // Create a new tag (Not standard in leads.py yet, but we can simulate add by just adding it to a lead)
  // In Lehr Insurance, we don't have a separate tags table, so creation happens on assignment.
  // We will adapt this to just add the tag to the current lead, which effectively "creates" it.
  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setIsCreatingTag(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      // Lehr specific: Add tag to current lead to "create" it.
      // We use the existing add tag endpoint.
      const res = await fetch(`${getBaseUrl()}/tags/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: selectedConversation.phone_number,
          tag: newTagName.trim()
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to create tag');
      }

      setCreateSuccess(`Tag "${newTagName}" created and attached successfully`);
      setNewTagName('');
      setNewTagDescription('');

      // Refresh tags list
      await fetchTags();

      // Notify parent component
      if (onTagUpdate) {
        onTagUpdate();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setCreateSuccess(''), 3000);
    } catch (err) {
      setCreateError(err.message);
      setTimeout(() => setCreateError(''), 5000);
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Attach tag to lead with optimistic update
  const handleAttachTag = async (tagName) => {
    if (!selectedConversation?.phone_number) return;

    setIsAttachingTag(true);
    setAttachError('');
    setAttachSuccess('');

    // Find the tag object to add to local state
    // In Lehr, tags are just strings, so we wrap it to match structure if needed, or just use string
    // ideally we stick to string if that's what backend returns
    const tagToAdd = tagName;
    const originalTags = conversationTags.slice();

    try {
      const res = await fetch(`${getBaseUrl()}/tags/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: selectedConversation.phone_number,
          tag: tagName,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to attach tag');
      }

      // Optimistic update: add tag to local state
      setLocalTags([...conversationTags, tagToAdd]);

      setAttachSuccess(`Tag "${tagName}" attached successfully`);

      // Notify parent component to refresh conversation data
      if (onTagUpdate) {
        onTagUpdate();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setAttachSuccess(''), 3000);
    } catch (err) {
      setAttachError(err.message);
      setTimeout(() => setAttachError(''), 5000);
    } finally {
      setIsAttachingTag(false);
    }
  };

  // Remove tag from lead with optimistic update
  const handleRemoveTag = async (tagName) => {
    if (!selectedConversation?.phone_number) return;

    // Optimistic update: immediately remove tag from UI
    const originalTags = conversationTags.slice();
    const updatedTags = conversationTags.filter(tag => {
      const tagNameCheck = typeof tag === 'string' ? tag : tag.name;
      return tagNameCheck !== tagName;
    });

    // Update local state immediately for instant UI feedback
    setLocalTags(updatedTags);

    try {
      const res = await fetch(`${getBaseUrl()}/tags/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: selectedConversation.phone_number,
          tag: tagName,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to remove tag');
      }

      // API call successful, notify parent to refresh conversation data
      if (onTagUpdate) {
        onTagUpdate();
      }
    } catch (err) {
      console.error('Error removing tag:', err);
      // If API call fails, restore the tag in the UI
      setLocalTags(originalTags);
      // Also notify parent to refresh with correct server state
      if (onTagUpdate) {
        onTagUpdate();
      }
    }
  };

  // Get available tags that are not already attached
  const getAvailableTagsToAttach = () => {
    const attachedTagNames = conversationTags.map(tag =>
      typeof tag === 'string' ? tag : tag.name
    );
    // filter avail tags (which are objects {name, id}) against attached names
    return availableTags.filter(tag => !attachedTagNames.includes(tag.name));
  };

  if (!selectedConversation) {
    return (
      <div className="rounded-xl bg-white p-3 text-xs shadow-sm dark:bg-gray-900">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Tag size={14} />
          <span>Tags</span>
        </div>
        <div className="mt-2 text-gray-400 dark:text-gray-500">
          Select a conversation to manage tags
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-3 text-xs shadow-sm dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-gray-600 dark:text-gray-400" />
          <span className="font-semibold text-gray-800 dark:text-gray-100">Tags</span>
          <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {conversationTags.length}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Current Tags */}
          <div>
            <div className="mb-2 text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Current Tags
            </div>
            {conversationTags.length === 0 ? (
              <div className="text-gray-400 dark:text-gray-500 text-xs">
                No tags attached
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {conversationTags.map((tag, index) => {
                  const tagName = typeof tag === 'string' ? tag : tag.name;
                  return (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                    >
                      <Tag size={10} />
                      <span>{tagName}</span>
                      <button
                        onClick={() => handleRemoveTag(tagName)}
                        className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attach Existing Tag */}
          <div>
            <div className="mb-2 text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Add Existing Tag
            </div>
            <div className="space-y-2">
              <select
                value={selectedTagToAttach}
                onChange={(e) => setSelectedTagToAttach(e.target.value)}
                disabled={isAttachingTag}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">Select a tag...</option>
                {getAvailableTagsToAttach().map((tag, i) => (
                  <option key={tag.id || i} value={tag.name}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (selectedTagToAttach) {
                    handleAttachTag(selectedTagToAttach);
                    setSelectedTagToAttach('');
                  }
                }}
                disabled={!selectedTagToAttach || isAttachingTag}
                className="w-full flex items-center justify-center gap-1 rounded bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {isAttachingTag ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Plus size={12} />
                )}
                Attach
              </button>
            </div>
          </div>

          {/* Create New Tag */}
          <div>
            <div className="mb-2 text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Create New Tag
            </div>
            <form onSubmit={handleCreateTag} className="space-y-2">
              <input
                type="text"
                placeholder="Tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                disabled={isCreatingTag}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={!newTagName.trim() || isCreatingTag}
                className="w-full flex items-center justify-center gap-1 rounded bg-green-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed dark:bg-green-500 dark:hover:bg-green-600"
              >
                {isCreatingTag ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Plus size={12} />
                )}
                Create & Attach
              </button>
            </form>
          </div>

          {/* Status Messages */}
          {createError && (
            <div className="flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-[10px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle size={10} />
              {createError}
            </div>
          )}

          {createSuccess && (
            <div className="flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-[10px] text-green-600 dark:bg-green-900/20 dark:text-green-400">
              <Check size={10} />
              {createSuccess}
            </div>
          )}

          {attachError && (
            <div className="flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-[10px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle size={10} />
              {attachError}
            </div>
          )}

          {attachSuccess && (
            <div className="flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-[10px] text-green-600 dark:bg-green-900/20 dark:text-green-400">
              <Check size={10} />
              {attachSuccess}
            </div>
          )}
        </div>
      )}
    </div>
  );
}