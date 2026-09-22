import api from './api';

// ── Ticket API Service ────────────────────────────────────────────────────────

/** Create a new ticket (supports file uploads via FormData) */
export const createTicket = async (formData) => {
  const res = await api.post('/tickets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

/** Get current user's tickets with filters */
export const getMyTickets = async (params = {}) => {
  const res = await api.get('/tickets/my', { params });
  return res.data;
};

/** Get dashboard stats for current user */
export const getMyStats = async () => {
  const res = await api.get('/tickets/stats/my');
  return res.data;
};

/** Get single ticket by ID or ticketId */
export const getTicketById = async (id) => {
  const res = await api.get(`/tickets/${id}`);
  return res.data;
};

/** Update ticket status */
export const updateTicketStatus = async (id, status, reason = '') => {
  const res = await api.patch(`/tickets/${id}/status`, { status, reason });
  return res.data;
};

/** Add comment to ticket */
export const addComment = async (ticketId, message, isInternal = false) => {
  const res = await api.post(`/tickets/${ticketId}/comments`, { message, isInternal });
  return res.data;
};

/** Submit CSAT star rating feedback */
export const submitTicketFeedback = async (ticketId, rating, comment = '') => {
  const res = await api.post(`/tickets/${ticketId}/feedback`, { rating, comment });
  return res.data;
};

/** Export tickets as CSV download blob */
export const exportTicketsCSV = async () => {
  const res = await api.get('/tickets/export/csv', { responseType: 'blob' });
  return res.data;
};

/** Get AI Suggested Solution & FAQ Recommendations */
export const getAISuggestedSolution = async (ticketId) => {
  const res = await api.get(`/tickets/${ticketId}/ai-solution`);
  return res.data;
};
