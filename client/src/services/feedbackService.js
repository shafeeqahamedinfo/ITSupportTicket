import api from './api';

export const submitFeedback = async (feedbackData) => {
  const res = await api.post('/feedback', feedbackData);
  return res.data;
};

export const getTicketFeedback = async (ticketId) => {
  const res = await api.get(`/feedback/ticket/${ticketId}`);
  return res.data;
};

export const getCSATMetrics = async () => {
  const res = await api.get('/feedback/csat');
  return res.data;
};
