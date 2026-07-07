import { apiRequest } from '../api';

export async function pollProxyReady(projectId, { interval = 1500, timeout = 180000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await apiRequest(`/api/project/${projectId}/proxy-status`);
      if (res.status === 'ready') return res;
    } catch (err) {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('proxy timeout');
}
