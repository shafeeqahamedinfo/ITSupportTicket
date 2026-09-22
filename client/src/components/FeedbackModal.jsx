import { useState } from 'react';
import { Star, X, CheckCircle, MessageSquare } from 'lucide-react';
import { submitTicketFeedback } from '../services/ticketService';
import toast from 'react-hot-toast';

export default function FeedbackModal({ isOpen, onClose, ticket, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [timelinessRating, setTimelinessRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !ticket) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitTicketFeedback(ticket._id || ticket.ticketId, rating, comment);
      toast.success('Thank you for rating our IT Support!');
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (val) => {
    switch (val) {
      case 5: return '⭐⭐⭐⭐⭐ Excellent Support!';
      case 4: return '⭐⭐⭐⭐ Good Service';
      case 3: return '⭐⭐⭐ Average Experience';
      case 2: return '⭐⭐ Needs Improvement';
      case 1: return '⭐ Poor Experience';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Star className="w-5 h-5 fill-indigo-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Rate IT Support Resolution</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ticket #{ticket.ticketId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 5 Star Selection */}
          <div className="text-center py-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Overall Satisfaction
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-2 h-4">
              {getRatingLabel(hoverRating || rating)}
            </p>
          </div>

          {/* Timeliness Rating */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <span>Resolution Speed & Timeliness</span>
              <span className="text-indigo-600 dark:text-indigo-400">{timelinessRating} / 5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={timelinessRating}
              onChange={(e) => setTimelinessRating(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Comments or Feedback (Optional)
            </label>
            <textarea
              rows="3"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what went well or how we can improve our campus IT support..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
            ></textarea>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
