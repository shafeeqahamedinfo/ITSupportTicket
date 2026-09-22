import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { updateTicketStatus, getTicketComments, addTicketComment } from '../../services/staffService';
import api from '../../services/api';
import {
  ArrowLeft, Clock, CheckCircle, AlertTriangle, MessageSquare,
  Send, Lock, User, Paperclip, ChevronDown, Zap, FileText,
  Activity, RefreshCw,
} from 'lucide-react';

// ─── Config ───────────────────────────────────────────────────────────────────
const PRIORITY_CFG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Critical' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'High'    },
  MEDIUM:   { color: '#eab308', bg: 'rgba(234,179,8,0.12)',  label: 'Medium'  },
  LOW:      { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'Low'     },
};

const STATUS_CFG = {
  NEW:              { color: '#3b82f6', label: 'New'           },
  ASSIGNED:         { color: '#8b5cf6', label: 'Assigned'      },
  IN_PROGRESS:      { color: '#6366f1', label: 'In Progress'   },
  WAITING_FOR_USER: { color: '#f59e0b', label: 'Waiting'       },
  RESOLVED:         { color: '#10b981', label: 'Resolved'      },
  CLOSED:           { color: '#64748b', label: 'Closed'        },
  REOPENED:         { color: '#f43f5e', label: 'Reopened'      },
};

const STAFF_TRANSITIONS = {
  ASSIGNED:         ['IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED'],
  IN_PROGRESS:      ['WAITING_FOR_USER', 'RESOLVED'],
  WAITING_FOR_USER: ['IN_PROGRESS', 'RESOLVED'],
  REOPENED:         ['IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED'],
};

function Badge({ text, color, bg }) {
  return (
    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ color, background: bg }}>
      {text}
    </span>
  );
}

function SlaCountdown({ deadline, resolved }) {
  if (!deadline) return null;
  if (resolved) return <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">✓ Resolved within SLA</span>;
  const diff = new Date(deadline) - new Date();
  const overdue = diff < 0;
  const hrs  = Math.abs(Math.floor(diff / 3600000));
  const mins = Math.abs(Math.floor((diff % 3600000) / 60000));
  const color = overdue ? '#ef4444' : hrs < 2 ? '#f97316' : hrs < 8 ? '#eab308' : '#22c55e';
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}
    >
      <Clock size={14} color={color} />
      <span>
        {overdue ? `SLA Overdue by ${hrs}h ${mins}m` : `SLA: ${hrs}h ${mins}m remaining`}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StaffTicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const commentEndRef = useRef(null);

  const [ticket, setTicket]           = useState(null);
  const [comments, setComments]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [error, setError]             = useState(null);

  // Status panel state
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [newStatus, setNewStatus]     = useState('');
  const [reason, setReason]           = useState('');
  const [resolution, setResolution]   = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const [statusSuccess, setStatusSuccess] = useState(null);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal]   = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState(null);

  // ─── Fetch ticket ───
  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get(`/tickets/${id}`);
      setTicket(data.ticket);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load ticket.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ─── Fetch comments ───
  const fetchComments = useCallback(async () => {
    try {
      setCommentsLoading(true);
      const data = await getTicketComments(id);
      setComments(data.comments || []);
    } catch (e) {
      console.error('Failed to load comments:', e.message);
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
    fetchComments();
  }, [fetchTicket, fetchComments]);

  // Socket.IO comment handler
  useEffect(() => {
    if (!socket || !ticket) return;

    const handleNewComment = (commentObj) => {
      setComments((prev) => {
        if (prev.some(c => (c._id && commentObj._id && c._id === commentObj._id) || (c.createdAt === commentObj.createdAt && (c.content === commentObj.content || c.message === commentObj.message)))) {
          return prev;
        }
        return [...prev, commentObj];
      });
      setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const event1 = `ticket:${ticket.ticketId}:comment`;
    const event2 = `ticket:${ticket._id}:comment`;
    socket.on(event1, handleNewComment);
    socket.on(event2, handleNewComment);
    socket.on('comment:new', handleNewComment);

    return () => {
      socket.off(event1, handleNewComment);
      socket.off(event2, handleNewComment);
      socket.off('comment:new', handleNewComment);
    };
  }, [socket, ticket]);

  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // ─── Check if this staff is assigned ───
  const isAssigned = ticket?.assignedTo?._id === user?._id || ticket?.assignedTo === user?._id;
  const canUpdate = isAssigned && STAFF_TRANSITIONS[ticket?.status];

  // ─── Update status ───
  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    if (newStatus === 'RESOLVED' && !resolution.trim()) {
      setStatusError('Resolution summary is required when resolving a ticket.');
      return;
    }
    try {
      setSubmittingStatus(true);
      setStatusError(null);
      const data = await updateTicketStatus(ticket._id, {
        status: newStatus,
        reason,
        resolution: newStatus === 'RESOLVED' ? resolution : undefined,
        internalNotes: internalNotes.trim() || undefined,
      });
      setTicket(data.ticket);
      setStatusSuccess(`Status updated to "${STATUS_CFG[newStatus]?.label || newStatus}"`);
      setNewStatus('');
      setReason('');
      setResolution('');
      setInternalNotes('');
      setShowStatusPanel(false);
      setTimeout(() => setStatusSuccess(null), 4000);
    } catch (e) {
      setStatusError(e.response?.data?.message || 'Failed to update status.');
    } finally {
      setSubmittingStatus(false);
    }
  };

  // ─── Add comment ───
  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setSubmittingComment(true);
      setCommentError(null);
      const data = await addTicketComment(ticket._id, commentText, isInternal);
      const createdComment = data.comment || {
        _id: Date.now().toString(),
        content: commentText,
        author: { _id: user._id, fullName: user.fullName },
        isInternal,
        createdAt: new Date().toISOString(),
      };

      setComments(prev => {
        if (prev.some(c => c._id === createdComment._id)) return prev;
        return [...prev, createdComment];
      });

      setCommentText('');
      setIsInternal(false);
    } catch (e) {
      setCommentError(e.response?.data?.message || 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="py-20 text-center text-slate-400">
          <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading ticket details…</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !ticket) {
    return (
      <MainLayout>
        <div className="py-20 text-center space-y-4 max-w-md mx-auto">
          <AlertTriangle size={48} className="text-red-500 mx-auto opacity-80" />
          <p className="text-red-500 font-semibold">{error || 'Ticket not found.'}</p>
          <button onClick={() => navigate('/staff/tickets/assigned')} className="btn-primary">
            Back to My Tickets
          </button>
        </div>
      </MainLayout>
    );
  }

  const priorityCfg = PRIORITY_CFG[ticket.priority] || PRIORITY_CFG.MEDIUM;
  const statusCfg   = STATUS_CFG[ticket.status]   || { color: '#94a3b8', label: ticket.status };
  const transitions = STAFF_TRANSITIONS[ticket.status] || [];

  return (
    <MainLayout title={`Staff — ${ticket.ticketId}`}>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* ─ Back nav ─ */}
        <button
          onClick={() => navigate('/staff/tickets/assigned')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors shadow-sm"
        >
          <ArrowLeft size={14} /> Back to My Tickets
        </button>

        {/* ─ Status messages ─ */}
        {statusSuccess && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <CheckCircle size={16} /> {statusSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ─── LEFT: Main Ticket Details ─── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Header */}
            <div
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5"
              style={{ borderLeft: `4px solid ${priorityCfg.color}` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-1 rounded-lg border border-primary-200 dark:border-primary-800/40">
                  {ticket.ticketId}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge text={priorityCfg.label} color={priorityCfg.color} bg={priorityCfg.bg} />
                  <Badge text={statusCfg.label} color={statusCfg.color} bg={`${statusCfg.color}18`} />
                </div>
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-2">{ticket.title}</h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
              </div>

              <SlaCountdown deadline={ticket.slaDeadline} resolved={['RESOLVED','CLOSED'].includes(ticket.status)} />

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {[
                  { label: 'Category',    value: ticket.category },
                  { label: 'Urgency',     value: ticket.urgency },
                  { label: 'Impact',      value: ticket.impact },
                  { label: 'Affected',    value: `${ticket.affectedUsers} user${ticket.affectedUsers !== 1 ? 's' : ''}` },
                  { label: 'Created',     value: new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                  { label: 'Requester',   value: ticket.createdBy?.fullName },
                  { label: 'Department',  value: ticket.createdBy?.departmentName || '—' },
                  { label: 'Assigned To', value: ticket.assignedTo?.fullName || 'Unassigned' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution (if resolved) */}
            {ticket.resolution && (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 space-y-2">
                <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle size={16} /> Resolution Summary
                </h3>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{ticket.resolution}</p>
              </div>
            )}

            {/* Attachments */}
            {ticket.attachments?.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip size={15} className="text-primary-600 dark:text-primary-400" /> Attachments ({ticket.attachments.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ticket.attachments.map((a, i) => (
                    <a
                      key={i}
                      href={`http://localhost:5000/uploads/${a.filename}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
                    >
                      <FileText size={14} className="text-primary-600 dark:text-primary-400" />
                      <span className="truncate max-w-[200px]">{a.originalName || a.filename}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare size={16} className="text-primary-600 dark:text-primary-400" /> Communication ({comments.length})
                </h3>
                <button
                  onClick={fetchComments}
                  className="p-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>

              {/* Comment List */}
              <div className="max-h-96 overflow-y-auto p-5 space-y-4">
                {commentsLoading ? (
                  <div className="text-center text-slate-400 py-6 text-xs">Loading comments…</div>
                ) : comments.length === 0 ? (
                  <div className="text-center text-slate-400 py-10 space-y-2">
                    <MessageSquare size={32} className="mx-auto opacity-30" />
                    <p className="text-xs font-medium">No messages yet. Start the conversation below.</p>
                  </div>
                ) : (
                  comments.map((c, idx) => {
                    const authorId = c.author?._id || c.author || c.sender;
                    const isMe     = authorId === user?._id;
                    const name     = c.author?.fullName || c.authorName || c.senderName || 'Staff Member';
                    const text     = c.content || c.message || '';
                    const initial  = name[0] || '?';

                    return (
                      <div key={c._id || idx} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm ${isMe ? 'bg-gradient-to-tr from-primary-600 to-indigo-600' : 'bg-slate-700'}`}>
                          {initial}
                        </div>
                        <div className="max-w-[80%] space-y-1">
                          <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                            c.isInternal
                              ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 text-amber-900 dark:text-amber-200'
                              : isMe
                              ? 'bg-primary-600 text-white rounded-tr-xs'
                              : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                          }`}>
                            {c.isInternal && (
                              <div className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 mb-1">
                                <Lock size={12} /> Internal Note (Staff Only)
                              </div>
                            )}
                            <p className="whitespace-pre-wrap">{text}</p>
                          </div>
                          <div className={`text-[10px] text-slate-400 dark:text-slate-500 ${isMe ? 'text-right' : 'text-left'}`}>
                            {name} · {c.createdAt ? new Date(c.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={commentEndRef} />
              </div>

              {/* Add Comment */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                {commentError && (
                  <div className="text-xs text-red-500 mb-2">{commentError}</div>
                )}
                <form onSubmit={handleComment} className="space-y-3">
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder={isInternal ? 'Write an internal note (only visible to IT staff)…' : 'Type a reply to the user…'}
                    rows={3}
                    className={`w-full p-3 rounded-xl text-xs bg-white dark:bg-slate-800 border text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                      isInternal ? 'border-amber-400/60 focus:ring-amber-500' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400 font-medium">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={e => setIsInternal(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500 accent-amber-500"
                      />
                      <Lock size={13} className="text-amber-500" />
                      Internal note (staff only)
                    </label>
                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Send size={13} />
                      {submittingComment ? 'Sending…' : isInternal ? 'Add Note' : 'Reply'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* History Timeline */}
            {ticket.history?.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity size={16} className="text-primary-600 dark:text-primary-400" /> Activity Timeline
                </h3>
                <div className="space-y-3 relative pl-4">
                  <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-800" />
                  {[...ticket.history].reverse().map((h, i) => (
                    <div key={i} className="relative flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full bg-primary-600 border-2 border-white dark:border-slate-900 flex-shrink-0 -left-1.5 relative top-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{h.description}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {h.performedByName} · {new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── RIGHT: Actions Sidebar ─── */}
          <div className="space-y-5 lg:sticky lg:top-6">
            {/* Ticket Summary */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ticket Summary</h3>
              <div className="space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {[
                  { label: 'Priority Score', value: ticket.priorityScore ?? '—' },
                  { label: 'SLA Deadline', value: ticket.slaDeadline ? new Date(ticket.slaDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' },
                  { label: 'SLA Breached', value: ticket.slaBreached ? '⚠ Yes' : 'No', color: ticket.slaBreached ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold' },
                  { label: 'Resolution Time', value: ticket.resolutionTime ? `${(ticket.resolutionTime/3600000).toFixed(1)}h` : '—' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center pt-2.5 first:pt-0">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{label}</span>
                    <span className={`font-semibold ${color || 'text-slate-900 dark:text-slate-100'}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Update Panel */}
            {canUpdate && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-primary-500/30 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap size={16} className="text-primary-600 dark:text-primary-400" /> Update Status
                </h3>

                {statusError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs font-medium">
                    {statusError}
                  </div>
                )}

                <div className="space-y-3">
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="">Choose new status…</option>
                    {transitions.map(s => (
                      <option key={s} value={s}>{STATUS_CFG[s]?.label || s}</option>
                    ))}
                  </select>

                  {newStatus && (
                    <>
                      <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Reason for status change (optional)…"
                        rows={2}
                        className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs resize-none"
                      />

                      {newStatus === 'RESOLVED' && (
                        <>
                          <textarea
                            value={resolution}
                            onChange={e => setResolution(e.target.value)}
                            placeholder="Resolution summary (required for RESOLVED)…"
                            rows={3}
                            className="input bg-slate-50 dark:bg-slate-800 border-emerald-500/40 text-slate-900 dark:text-white text-xs resize-none"
                          />
                          <textarea
                            value={internalNotes}
                            onChange={e => setInternalNotes(e.target.value)}
                            placeholder="Internal notes (optional, staff only)…"
                            rows={2}
                            className="input bg-slate-50 dark:bg-slate-800 border-amber-500/40 text-slate-900 dark:text-white text-xs resize-none"
                          />
                        </>
                      )}

                      <button
                        onClick={handleStatusUpdate}
                        disabled={submittingStatus || (newStatus === 'RESOLVED' && !resolution)}
                        className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all"
                      >
                        {submittingStatus ? 'Updating…' : `Set to ${STATUS_CFG[newStatus]?.label || newStatus}`}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {!canUpdate && ticket.assignedTo && !isAssigned && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-4 text-center space-y-1">
                <User size={24} className="text-amber-500 mx-auto" />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Assigned to <strong className="text-slate-900 dark:text-white">{ticket.assignedTo?.fullName}</strong>
                </p>
              </div>
            )}

            {['RESOLVED', 'CLOSED'].includes(ticket.status) && (
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-4 text-center space-y-1">
                <CheckCircle size={24} className="text-emerald-500 mx-auto" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Ticket {ticket.status}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
