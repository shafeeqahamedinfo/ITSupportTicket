import api from './api';

export const getArticles = async (category = '', search = '') => {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (search) params.append('search', search);

  const res = await api.get(`/knowledge-base?${params.toString()}`);
  return res.data;
};

export const getArticleById = async (id) => {
  const res = await api.get(`/knowledge-base/${id}`);
  return res.data;
};

export const createArticle = async (articleData) => {
  const res = await api.post('/knowledge-base', articleData);
  return res.data;
};

export const rateArticle = async (id, helpful) => {
  const res = await api.patch(`/knowledge-base/${id}/rate`, { helpful });
  return res.data;
};
