import axios from 'axios';

const API = 'https://ecole-manager-backend.onrender.com/api';

let sessionUser = null;

export const getSessionUser = () => sessionUser;

export const setSessionUser = (user) => {
  sessionUser = user || null;
};

export const clearSessionUser = () => {
  sessionUser = null;
};

export const fetchSessionUser = async () => {
  const res = await axios.get(API + '/auth/moi');
  sessionUser = res.data || null;
  return sessionUser;
};
