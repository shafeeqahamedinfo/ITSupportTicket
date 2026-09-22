import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import {
  getTicketById,
  updateTicketStatus,
  addComment,
  getAISuggestedSolution
} from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import FeedbackModal from '../../components/FeedbackModal';
import {
  ArrowLeft, Clock, MapPin, Paperclip, CheckCircle, AlertCircle,
  Loader, RefreshCw, MessageSquare, Tag, Send, Sparkles, Star, Lock, BookOpen, User
} from 'lucide-react';
import { formatDateTime, timeAgo, STATUS_LABELS, cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  NEW:              'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/30',
  ASSIGNED:         'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/30',
  IN_PROGRESS:      'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700/30',
  WAITING_FOR_USER: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/30',
  RESOLVED:         'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/30',
  CLOSED:           'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  REOPENED:         'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700/30',
};

const PRIORITY_STYLE = {
  CRITICAL: 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/30',
  HIGH:     'bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700/30',
  MEDIUM:   'bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700/30',
  LOW:      'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/30',
};

function InfoRow({ label, value, children }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm flex-shrink-0 w-28 sm:w-36">{label}</span>
      <span className="text-slate-900 dark:text-slate-200 text-xs sm:text-sm font-medium text-right flex-1 min-w-0 break-words">
        {children || value || '—'}
      </span>
    </div>
  );
}

function Timeline({ history }) {
  if (!history?.length) return null;
  return (
    <div className="relative pl-5">
      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-4">
        {history.map((event, i) => (
          <div key={i} className="relative flex items-start gap-3">
            <div className="absolute -left-3 top-1 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 dark:text-slate-200 text-sm font-medium">{event.description}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-slate-500 dark:text-slate-400 text-xs">{event.performedByName || 'System'}</span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-slate-400 dark:text-slate-500 text-xs">{timeAgo(event.timestamp)}</span>
                {event.oldValue && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {event.oldValue} → <span className="text-indigo-600 dark:text-indigo-400">{event.newValue}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SLAStatus({ ticket }) {
  if (!ticket.slaDeadline) return null;
  const now  = new Date();
  const dead = new Date(ticket.slaDeadline);
  const done = ['RESOLVED','CLOSED'].includes(ticket.status);

  let label, color;
  if (done && ticket.resolvedAt) {
    const breached = new Date(ticket.resolvedAt) > dead;
    label = breached ? '🔴 SLA Breached' : '🟢 Within SLA';
    color = breached ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';
  } else if (!done && now > dead) {
    label = '🔴 SLA Breached';
    color = 'text-red-500 dark:text-red-400';
  } else {
    const diff = dead - now;
    const hrs  = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    label = hrs > 0 ? `🟢 ${hrs}h ${mins}m remaining` : `🟡 ${mins}m remaining`;
    color = hrs > 2 ? 'text-emerald-600 dark:text-emerald-400' : hrs > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500 dark:text-red-400';
  }

  return <span className={cn('text-sm font-medium', color)}>{label}</span>;
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  // Real-time Comments Chat
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const commentsEndRef = useRef(null);

  // CSAT Feedback Modal
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // AI Solution Assistant
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState(null);

  const fetchTicket = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTicketById(id);
      setTicket(data.ticket);
      setComments(data.ticket.comments || []);
    } catch (err) {
      setError(err.message || 'Ticket not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  // Socket.IO real-time comment handler
  useEffect(() => {
    if (!socket || !ticket) return;

    const eventName = `ticket:${ticket.ticketId}:comment`;
    const handleNewComment = (commentObj) => {
      setComments((prev) => {
        // avoid duplicates if emitted to sender
        if (prev.some(c => c._id === commentObj._id || (c.createdAt === commentObj.createdAt && c.message === commentObj.message))) {
          return prev;
        }
        return [...prev, commentObj];
      });
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    socket.on(eventName, handleNewComment);
    return () => {
      socket.off(eventName, handleNewComment);
    };
  }, [socket, ticket]);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || sendingComment) return;

    setSendingComment(true);
    try {
      const res = await addComment(ticket.ticketId, newComment, isInternal);
      if (res.comment) {
        setComments((prev) => [...prev, res.comment]);
        setNewComment('');
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send comment');
    } finally {
      setSendingComment(false);
    }
  };

  const handleFetchAISolution = async () => {
    setAiLoading(true);
    try {
      const res = await getAISuggestedSolution(ticket.ticketId);
      setAiRecommendation(res.aiRecommendation);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate AI solution');
    } finally {
      setAiLoading(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Are you sure you want to close this ticket?')) return;
    setUpdating(true);
    try {
      await updateTicketStatus(id, 'CLOSED', 'Closed by user');
      toast.success('Ticket closed successfully.');
      fetchTicket();
    } catch (err) {
      toast.error(err.message || 'Failed to close ticket.');
    } finally {
      setUpdating(false);
    }
  };

  const handleReopen = async () => {
    setUpdating(true);
    try {
      await updateTicketStatus(id, 'REOPENED', 'Reopened by user');
      toast.success('Ticket reopened.');
      fetchTicket();
    } catch (err) {
      toast.error(err.message || 'Failed to reopen ticket.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Loading Ticket…">
        <div className="flex items-center justify-center py-20">
          <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Error">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-slate-900 dark:text-white font-semibold text-lg mb-2">{error}</h2>
          <Link to="/tickets" className="btn-primary btn-sm mt-4 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Tickets
          </Link>
        </div>
      </MainLayout>
    );
  }

  const isStaffOrAdmin = user?.role === 'staff' || user?.role === 'admin';

  return (
    <MainLayout title={ticket.ticketId}>
      <div className="max-w-4xl mx-auto space-y-5 pb-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link to="/tickets" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> My Tickets
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-slate-900 dark:text-slate-300 font-mono text-xs font-bold">{ticket.ticketId}</span>
        </div>

        {/* Ticket Header */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">{ticket.ticketId}</span>
                <span className={cn('px-2.5 py-1 rounded-lg border text-xs font-semibold', STATUS_STYLE[ticket.status])}>
                  {STATUS_LABELS[ticket.status]}
                </span>
                <span className={cn('px-2.5 py-1 rounded-lg border text-xs font-semibold', PRIORITY_STYLE[ticket.priority])}>
                  {ticket.priority}
                </span>
              </div>
              <h1 className="text-slate-900 dark:text-white font-bold text-xl">{ticket.title}</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={fetchTicket} className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Refresh">
                <RefreshCw className={cn('w-4 h-4', updating && 'animate-spin')} />
              </button>

              <button
                onClick={handleFetchAISolution}
                disabled={aiLoading}
                className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {aiLoading ? 'Analyzing...' : 'AI Solution'}
              </button>

              {ticket.status === 'RESOLVED' && (
                <>
                  <button onClick={handleReopen} disabled={updating} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition">
                    Reopen
                  </button>
                  <button onClick={handleClose} disabled={updating} className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Close
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-800 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Tags */}
          {ticket.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {ticket.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
                  <Tag className="w-3 h-3 text-slate-400" />{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* AI Solution Assistant Drawer / Card */}
        {aiRecommendation && (
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-slate-900/5 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800/50 p-6 shadow-md animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-800/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">AI Automated Solution & FAQ Recommendations</h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Match Confidence: {aiRecommendation.confidenceScore}</p>
                </div>
              </div>
              <button onClick={() => setAiRecommendation(null)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                Dismiss
              </button>
            </div>

            {/* Suggested Resolution Steps */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">Recommended Standard Resolution Procedure:</h4>
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {aiRecommendation.suggestedResolution}
              </div>
            </div>

            {/* Related KB Articles */}
            {aiRecommendation.relatedArticles?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Related Knowledge Base Articles:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {aiRecommendation.relatedArticles.map((article) => (
                    <Link
                      key={article.id}
                      to="/kb"
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition group flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{article.title}</p>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{article.category} · {article.views} views</span>
                      </div>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform">Read →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Details Panel */}
          <div className="md:col-span-2 space-y-5">
            {/* Ticket Info */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="text-slate-900 dark:text-white font-semibold text-sm mb-4">Ticket Information</h3>
              <div>
                <InfoRow label="Category"   value={ticket.category} />
                <InfoRow label="Department" value={ticket.department} />
                <InfoRow label="Created By" value={ticket.createdBy?.fullName} />
                <InfoRow label="Assigned To" value={ticket.assignedTo?.fullName || 'Not yet assigned'} />
                <InfoRow label="Created"    value={formatDateTime(ticket.createdAt)} />
                <InfoRow label="Updated"    value={formatDateTime(ticket.updatedAt)} />
                {ticket.resolvedAt && (
                  <InfoRow label="Resolved" value={formatDateTime(ticket.resolvedAt)} />
                )}
                <InfoRow label="Affected Users" value={`${ticket.affectedUsers} user(s)`} />
                <InfoRow label="Service Impact" value={ticket.serviceImpact} />
              </div>
            </div>

            {/* Location */}
            {(ticket.location?.building || ticket.location?.room) && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <h3 className="text-slate-900 dark:text-white font-semibold text-sm mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Location
                </h3>
                <div className="text-slate-700 dark:text-slate-300 text-sm space-y-1">
                  {ticket.location.building && <p>Building: {ticket.location.building}</p>}
                  {ticket.location.room     && <p>Room: {ticket.location.room}</p>}
                  {ticket.location.floor    && <p>Floor: {ticket.location.floor}</p>}
                </div>
              </div>
            )}

            {/* Attachments */}
            {ticket.attachments?.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <h3 className="text-slate-900 dark:text-white font-semibold text-sm mb-4 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Attachments ({ticket.attachments.length})
                </h3>
                <div className="space-y-2">
                  {ticket.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={`/uploads/${att.filename}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors group"
                    >
                      <span className="text-lg">{att.mimetype?.includes('image') ? '🖼️' : att.mimetype?.includes('pdf') ? '📄' : '📎'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 dark:text-slate-300 text-xs font-medium truncate group-hover:text-indigo-600 dark:group-hover:text-white">{att.originalName}</p>
                        <p className="text-slate-500 dark:text-slate-500 text-xs">{att.size ? `${(att.size / 1024).toFixed(1)} KB` : ''}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Real-Time Live Comments & Discussion Chat */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-slate-900 dark:text-white font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Live Discussion Chat ({comments.length})
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Socket.IO Connected
                </span>
              </div>

              {/* Chat Message Stream */}
              <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No comments yet. Start the conversation below!</p>
                  </div>
                ) : (
                  comments.map((c, i) => {
                    const isMe = c.sender === user?._id || c.senderName === user?.fullName;
                    if (c.isInternal && !isStaffOrAdmin) return null; // hide internal notes from standard users

                    return (
                      <div
                        key={c._id || i}
                        className={cn(
                          'p-3 rounded-2xl max-w-[85%] text-sm space-y-1',
                          c.isInternal
                            ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 ml-auto'
                            : isMe
                            ? 'bg-indigo-600 text-white ml-auto'
                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 text-[11px] opacity-80 border-b border-black/10 dark:border-white/10 pb-1">
                          <span className="font-semibold flex items-center gap-1">
                            {c.isInternal && <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                            {c.senderName || 'Staff Member'}
                            <span className="text-[10px] font-normal uppercase opacity-75">({c.senderRole})</span>
                          </span>
                          <span>{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{c.message}</p>
                      </div>
                    );
                  })
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendComment} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                {isStaffOrAdmin && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <input
                      type="checkbox"
                      id="internalCheck"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="accent-amber-500 rounded cursor-pointer"
                    />
                    <label htmlFor="internalCheck" className="cursor-pointer font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Post as Internal Staff Note (Hidden from Ticket Creator)
                    </label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type a message or update..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingComment || !newComment.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition shadow-md flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-5">
            {/* CSAT Feedback Section */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
              <h3 className="text-slate-900 dark:text-white font-semibold text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> CSAT Ticket Feedback
              </h3>

              {ticket.feedback?.rating ? (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-center space-y-2">
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          'w-5 h-5',
                          s <= ticket.feedback.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-200">{ticket.feedback.rating} / 5 Stars</p>
                  {ticket.feedback.comment && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{ticket.feedback.comment}"</p>
                  )}
                  <p className="text-[10px] text-slate-400">Submitted {timeAgo(ticket.feedback.givenAt)}</p>
                </div>
              ) : ['RESOLVED', 'CLOSED'].includes(ticket.status) ? (
                <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300">How was your IT support resolution experience?</p>
                  <button
                    onClick={() => setFeedbackOpen(true)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    <Star className="w-4 h-4 fill-amber-300 text-amber-300" /> Rate IT Support
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">Feedback star rating will unlock once ticket is marked resolved.</p>
              )}
            </div>

            {/* SLA */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="text-slate-900 dark:text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> SLA Status
              </h3>
              <SLAStatus ticket={ticket} />
              {ticket.slaDeadline && (
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">Deadline: {formatDateTime(ticket.slaDeadline)}</p>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="text-slate-900 dark:text-white font-semibold text-sm mb-4">Activity Timeline</h3>
              {ticket.history?.length ? (
                <Timeline history={[...ticket.history].reverse()} />
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-xs">No activity recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSAT Modal */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        ticket={ticket}
        onSubmitted={() => fetchTicket()}
      />
    </MainLayout>
  );
}
