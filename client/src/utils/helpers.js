/**
 * Utility helpers for SmartCampus ITCare
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Format date/time in a friendly format */
export function formatDate(date, options = {}) {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(new Date(date));
}

/** Format date with time */
export function formatDateTime(date) {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/** Get relative time (e.g. "2 hours ago") */
export function timeAgo(date) {
  if (!date) return 'N/A';
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);

  if (diff < 60)            return `${diff}s ago`;
  if (diff < 3600)          return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)         return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)        return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(date);
}

/** Format resolution time in hours and minutes */
export function formatDuration(ms) {
  if (!ms || ms < 0) return 'N/A';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Capitalize the first letter of a string */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Get initials from a full name */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Truncate text to a given length */
export function truncate(text, length = 60) {
  if (!text) return '';
  return text.length > length ? text.slice(0, length) + '…' : text;
}

/** Priority label colors */
export const PRIORITY_COLORS = {
  CRITICAL: 'priority-critical',
  HIGH:     'priority-high',
  MEDIUM:   'priority-medium',
  LOW:      'priority-low',
};

/** Status label colors */
export const STATUS_COLORS = {
  NEW:               'status-new',
  ASSIGNED:          'status-assigned',
  IN_PROGRESS:       'status-in-progress',
  WAITING_FOR_USER:  'status-waiting',
  RESOLVED:          'status-resolved',
  CLOSED:            'status-closed',
  REOPENED:          'status-reopened',
};

/** Human-readable status labels */
export const STATUS_LABELS = {
  NEW:               'New',
  ASSIGNED:          'Assigned',
  IN_PROGRESS:       'In Progress',
  WAITING_FOR_USER:  'Waiting for User',
  RESOLVED:          'Resolved',
  CLOSED:            'Closed',
  REOPENED:          'Reopened',
};

/** SLA deadlines in hours */
export const SLA_HOURS = {
  CRITICAL: 2,
  HIGH:     6,
  MEDIUM:   24,
  LOW:      72,
};

/** Calculate SLA deadline from creation date and priority */
export function getSLADeadline(createdAt, priority) {
  const hours = SLA_HOURS[priority] || 24;
  return new Date(new Date(createdAt).getTime() + hours * 3600000);
}

/** Check if ticket is SLA breached */
export function isSLABreached(ticket) {
  if (!ticket.slaDeadline) return false;
  if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
    return ticket.resolvedAt && new Date(ticket.resolvedAt) > new Date(ticket.slaDeadline);
  }
  return new Date() > new Date(ticket.slaDeadline);
}

/** Get token from localStorage */
export function getToken() {
  return localStorage.getItem('itcare_token');
}

/** Get current user from localStorage */
export function getCurrentUser() {
  try {
    const u = localStorage.getItem('itcare_user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

/** Save auth data to localStorage */
export function saveAuth(token, user) {
  localStorage.setItem('itcare_token', token);
  localStorage.setItem('itcare_user', JSON.stringify(user));
}

/** Clear auth data */
export function clearAuth() {
  localStorage.removeItem('itcare_token');
  localStorage.removeItem('itcare_user');
}
