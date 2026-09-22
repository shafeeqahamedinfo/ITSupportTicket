import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { createTicket } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import {
  Ticket, Upload, X, AlertCircle, Loader, CheckCircle,
  ChevronRight, Zap, Info, Users, MapPin, Tag
} from 'lucide-react';
import { cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'Hardware',        icon: '🖥️',  label: 'Hardware' },
  { value: 'Software',        icon: '💿',  label: 'Software' },
  { value: 'Network',         icon: '🌐',  label: 'Network' },
  { value: 'Wi-Fi',           icon: '📶',  label: 'Wi-Fi' },
  { value: 'Printer',         icon: '🖨️',  label: 'Printer' },
  { value: 'Projector',       icon: '📽️',  label: 'Projector' },
  { value: 'Email',           icon: '📧',  label: 'Email' },
  { value: 'Account/Login',   icon: '🔑',  label: 'Account/Login' },
  { value: 'Operating System',icon: '⚙️',  label: 'OS Issues' },
  { value: 'Application',     icon: '📱',  label: 'Application' },
  { value: 'Cybersecurity',   icon: '🔒',  label: 'Cybersecurity' },
  { value: 'Other',           icon: '🔧',  label: 'Other' },
];

const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Mechanical Engineering',
  'Civil Engineering', 'Electrical Engineering', 'Electronics Engineering',
  'Administration', 'Library', 'Hostel', 'Accounts', 'Other',
];

const URGENCY_OPTIONS = [
  { value: 'LOW',      label: '🟢 Low',      desc: 'Can wait a few days' },
  { value: 'MEDIUM',   label: '🟡 Medium',   desc: 'Needed within a day' },
  { value: 'HIGH',     label: '🟠 High',     desc: 'Needed within hours' },
  { value: 'CRITICAL', label: '🔴 Critical', desc: 'Immediate action needed' },
];

const IMPACT_OPTIONS = [
  { value: 'NONE',            label: 'No Impact',       desc: 'Work continues normally' },
  { value: 'MINOR',           label: 'Minor Impact',    desc: 'Slight inconvenience' },
  { value: 'MODERATE',        label: 'Moderate Impact', desc: 'Partial work stoppage' },
  { value: 'MAJOR',           label: 'Major Impact',    desc: 'Significant work blocked' },
  { value: 'COMPLETE_OUTAGE', label: 'Complete Outage', desc: 'No work possible' },
];

function PriorityBadge({ priority }) {
  const cfg = {
    CRITICAL: { color: 'text-red-400 bg-red-900/30 border-red-700/30',    label: '🔴 CRITICAL' },
    HIGH:     { color: 'text-orange-400 bg-orange-900/30 border-orange-700/30', label: '🟠 HIGH' },
    MEDIUM:   { color: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30', label: '🟡 MEDIUM' },
    LOW:      { color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/30', label: '🟢 LOW' },
  };
  const c = cfg[priority] || cfg.MEDIUM;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg border text-sm font-semibold ${c.color}`}>
      {c.label}
    </span>
  );
}

// Smart priority preview calculation (mirrors backend logic)
function previewPriority({ category, affectedUsers, urgency, serviceImpact, userPriority }) {
  const CAT_W = { 'Network':4,'Wi-Fi':4,'Cybersecurity':5,'Hardware':2,'Software':2,'Printer':1,'Projector':2,'Email':3,'Account/Login':3,'Operating System':2,'Application':2,'Other':1 };
  const URG_W = { LOW:0, MEDIUM:1, HIGH:2, CRITICAL:3 };
  const IMP_W = { NONE:0, MINOR:1, MODERATE:2, MAJOR:3, COMPLETE_OUTAGE:4 };
  const PRI_W = { LOW:0, MEDIUM:1, HIGH:2, CRITICAL:3 };

  let score = (CAT_W[category] || 1) + (URG_W[urgency] || 0) + (IMP_W[serviceImpact] || 0) + (PRI_W[userPriority] || 0);
  const n = parseInt(affectedUsers) || 1;
  if (n >= 100) score += 5; else if (n >= 50) score += 4; else if (n >= 20) score += 3; else if (n >= 5) score += 2;

  let priority = score >= 12 ? 'CRITICAL' : score >= 8 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW';
  if (category === 'Cybersecurity' && ['LOW','MEDIUM'].includes(priority)) priority = 'HIGH';
  if (serviceImpact === 'COMPLETE_OUTAGE') priority = 'CRITICAL';
  return priority;
}

export default function CreateTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', category: '', department: user?.departmentName || '',
    building: '', room: '', floor: '',
    userPriority: 'MEDIUM', affectedUsers: '1',
    urgency: 'MEDIUM', serviceImpact: 'MINOR',
    tags: '',
  });
  const [files, setFiles]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [step, setStep]         = useState(1); // Steps: 1=Basic, 2=Priority, 3=Location
  const fileInputRef            = useRef();

  const smartPriority = form.category
    ? previewPriority(form)
    : null;

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCategorySelect = (cat) =>
    setForm((p) => ({ ...p, category: cat }));

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const totalSize = [...files, ...newFiles].reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 10 * 1024 * 1024) { toast.error('Total file size cannot exceed 10MB'); return; }
    setFiles((p) => [...p, ...newFiles].slice(0, 5));
  };

  const removeFile = (idx) => setFiles((p) => p.filter((_, i) => i !== idx));

  const validateStep1 = () => {
    if (!form.title.trim()) return 'Ticket title is required';
    if (form.title.length < 5) return 'Title must be at least 5 characters';
    if (!form.description.trim()) return 'Description is required';
    if (form.description.length < 10) return 'Description must be at least 10 characters';
    if (!form.category) return 'Please select a category';
    if (!form.department) return 'Please select your department';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));
      files.forEach((f) => formData.append('attachments', f));

      const data = await createTicket(formData);
      toast.success(`✅ Ticket ${data.ticket.ticketId} created! Priority: ${data.ticket.priority}`);
      navigate(`/tickets/${data.ticket.ticketId}`);
    } catch (err) {
      setError(err.message || 'Failed to create ticket. Please try again.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <MainLayout title="Create New Ticket">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <div className="w-8 h-8 rounded-xl bg-primary-600/10 dark:bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <Ticket className="w-4 h-4" />
            </div>
            Create Support Ticket
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1.5 pl-10">
            Describe your IT issue in detail so our support team can resolve it quickly.
          </p>
        </div>

        {/* Step Indicator Container */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 p-4 md:p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { n: 1, label: 'Issue Details' },
              { n: 2, label: 'Priority & Impact' },
              { n: 3, label: 'Location & Files' },
            ].map(({ n, label }, idx, arr) => (
              <div key={n} className="flex items-center gap-3 flex-1 last:flex-initial">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => step > n && setStep(n)}
                    className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border transition-all duration-200 shadow-sm',
                      step === n ? 'bg-primary-600 border-primary-500 text-white shadow-primary-600/30' :
                      step > n  ? 'bg-emerald-600 border-emerald-500 text-white cursor-pointer' :
                                  'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {step > n ? <CheckCircle className="w-4 h-4" /> : n}
                  </button>
                  <span className={cn('text-xs font-semibold hidden sm:inline-block', step >= n ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500')}>
                    {label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className={cn('flex-1 h-0.5 mx-2 rounded-full transition-colors', step > n ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800')} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ── STEP 1: Issue Details ─────────────────────── */}
          {step === 1 && (
            <div className="space-y-5 animate-enter">
              {/* Title */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 space-y-4 shadow-sm">
                <h3 className="text-slate-900 dark:text-white font-bold text-sm">Issue Details</h3>

                <div className="form-group">
                  <label htmlFor="ticket-title" className="label text-slate-700 dark:text-slate-300 font-semibold">
                    Issue Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="ticket-title" name="title" type="text"
                    value={form.title} onChange={handleChange}
                    placeholder="e.g. Cannot connect to campus Wi-Fi in Lab 3"
                    className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500"
                    maxLength={200}
                  />
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 text-right">{form.title.length}/200</p>
                </div>

                <div className="form-group">
                  <label htmlFor="ticket-desc" className="label text-slate-700 dark:text-slate-300 font-semibold">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="ticket-desc" name="description"
                    value={form.description} onChange={handleChange}
                    rows={5}
                    placeholder="Describe the problem in detail: What happened? When did it start? What error messages are you seeing? What have you already tried?"
                    className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500 resize-none"
                  />
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{form.description.length} chars (min. 10)</p>
                </div>
              </div>

              {/* Category */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm">
                <h3 className="text-slate-900 dark:text-white font-bold text-sm mb-4">
                  Category <span className="text-red-500">*</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
                  {CATEGORIES.map(({ value, icon, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleCategorySelect(value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all',
                        form.category === value
                          ? 'bg-primary-50 dark:bg-primary-600/20 border-primary-500 text-primary-700 dark:text-primary-300 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      )}
                    >
                      <span className="text-xl">{icon}</span>
                      <span className="text-center leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Department */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm">
                <div className="form-group">
                  <label htmlFor="ticket-dept" className="label text-slate-700 dark:text-slate-300 font-semibold">
                    Your Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="ticket-dept" name="department" value={form.department} onChange={handleChange}
                    className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 appearance-none"
                  >
                    <option value="" className="bg-white dark:bg-slate-900">Select department</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d} className="bg-white dark:bg-slate-900">{d}</option>)}
                  </select>
                </div>
              </div>

              <button type="button" onClick={handleNext} className="w-full btn-primary btn-lg">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP 2: Priority & Impact ──────────────────── */}
          {step === 2 && (
            <div className="space-y-5 animate-enter">
              {/* Smart Priority Preview */}
              {smartPriority && (
                <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary-400" />
                      <span className="text-white font-semibold text-sm">Smart Priority Preview</span>
                    </div>
                    <PriorityBadge priority={smartPriority} />
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    Priority is automatically calculated based on category, affected users, urgency and impact.
                  </p>
                </div>
              )}

              {/* Urgency */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <h3 className="text-slate-900 dark:text-white font-semibold text-sm mb-4">How urgent is this? <span className="text-red-500">*</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {URGENCY_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value} type="button"
                      onClick={() => setForm((p) => ({ ...p, urgency: value }))}
                      className={cn(
                        'text-left p-3.5 rounded-xl border transition-all',
                        form.urgency === value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-slate-900 dark:text-white font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      )}
                    >
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Impact */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <h3 className="text-slate-900 dark:text-white font-semibold text-sm mb-4">Service Impact <span className="text-red-500">*</span></h3>
                <div className="space-y-2">
                  {IMPACT_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value} type="button"
                      onClick={() => setForm((p) => ({ ...p, serviceImpact: value }))}
                      className={cn(
                        'w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all',
                        form.serviceImpact === value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-slate-900 dark:text-white font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      )}
                    >
                      <div className={cn('w-3 h-3 rounded-full flex-shrink-0', {
                        'bg-slate-400':  value === 'NONE',
                        'bg-emerald-500': value === 'MINOR',
                        'bg-yellow-500':  value === 'MODERATE',
                        'bg-orange-500':  value === 'MAJOR',
                        'bg-red-500':     value === 'COMPLETE_OUTAGE',
                      })} />
                      <div>
                        <p className="font-semibold text-sm">{label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Affected Users */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <div className="form-group">
                  <label htmlFor="ticket-users" className="label text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" /> Number of Affected Users
                  </label>
                  <input
                    id="ticket-users" name="affectedUsers" type="number"
                    value={form.affectedUsers} onChange={handleChange}
                    min="1" max="10000"
                    className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500"
                  />
                  <p className="text-slate-500 dark:text-slate-500 text-xs mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    More affected users = higher priority automatically assigned
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button type="button" onClick={() => { setError(''); setStep(3); }} className="btn-primary flex-1">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Location & Files ───────────────────── */}
          {step === 3 && (
            <div className="space-y-5 animate-enter">
              {/* Location */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <h3 className="text-slate-900 dark:text-white font-semibold text-sm mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  Location <span className="text-slate-400 text-xs font-normal">(optional)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="building" className="label text-slate-700 dark:text-slate-300">Building</label>
                    <input id="building" name="building" type="text" value={form.building} onChange={handleChange}
                      placeholder="e.g. Block A" className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="room" className="label text-slate-700 dark:text-slate-300">Room / Lab</label>
                    <input id="room" name="room" type="text" value={form.room} onChange={handleChange}
                      placeholder="e.g. Lab 301" className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="floor" className="label text-slate-700 dark:text-slate-300">Floor</label>
                    <input id="floor" name="floor" type="text" value={form.floor} onChange={handleChange}
                      placeholder="e.g. 3rd Floor" className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="tags" className="label text-slate-700 dark:text-slate-300 flex items-center gap-1"><Tag className="w-3 h-3" />Tags</label>
                    <input id="tags" name="tags" type="text" value={form.tags} onChange={handleChange}
                      placeholder="e.g. urgent, lab, wifi" className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500" />
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <h3 className="text-slate-900 dark:text-white font-semibold text-sm mb-4 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  Attachments <span className="text-slate-400 text-xs font-normal">(optional, max 5 files · 10MB)</span>
                </h3>

                {/* Drop Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all"
                >
                  <Upload className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">Click to upload or drag files here</p>
                  <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">JPG, PNG, PDF, DOC, DOCX — Max 10MB total</p>
                </div>
                <input
                  ref={fileInputRef} type="file" multiple
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-lg flex-shrink-0">
                          {file.type.includes('image') ? '🖼️' : file.type.includes('pdf') ? '📄' : '📎'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-800 dark:text-slate-300 text-xs font-medium truncate">{file.name}</p>
                          <p className="text-slate-500 dark:text-slate-500 text-xs">{formatBytes(file.size)}</p>
                        </div>
                        <button type="button" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500 transition-colors p-1 flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 space-y-3">
                <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Ticket Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500 dark:text-slate-400">Category:</span> <span className="text-slate-900 dark:text-slate-200 font-medium">{form.category || '—'}</span></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Department:</span> <span className="text-slate-900 dark:text-slate-200 font-medium">{form.department || '—'}</span></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Urgency:</span> <span className="text-slate-900 dark:text-slate-200 font-medium">{form.urgency}</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">Smart Priority:</span>
                    {smartPriority && <PriorityBadge priority={smartPriority} />}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                <button type="submit" id="create-ticket-submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? (
                    <><Loader className="w-4 h-4 animate-spin" /> Creating…</>
                  ) : (
                    <><Ticket className="w-4 h-4" /> Submit Ticket</>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </MainLayout>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
