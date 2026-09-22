import api from './api';

export const getSLAConfigs = async () => {
  const res = await api.get('/sla/configs');
  return res.data;
};

export const updateSLAConfig = async (priority, configData) => {
  const res = await api.put(`/sla/configs/${priority}`, configData);
  return res.data;
};

export const getSLAReports = async () => {
  const res = await api.get('/sla/reports');
  return res.data;
};

export const getBreachedTickets = async () => {
  const res = await api.get('/sla/breached');
  return res.data;
};

export const escalateTicket = async (ticketId, reason) => {
  const res = await api.patch(`/sla/escalate/${ticketId}`, { reason });
  return res.data;
};
