import { apiRequest } from '../api';

const DEFAULT_INTERVAL_MS = 1000;
const DEFAULT_TIMEOUT_MS = 1000 * 60 * 60;

export async function pollJob(jobId, {
  intervalMs = DEFAULT_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onStatus,
} = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const job = await apiRequest(`/api/jobs/${jobId}`);
    onStatus?.(job);

    if (job.status === 'succeeded') return job.result;
    if (job.status === 'cancelled') throw new Error('งานถูกยกเลิกแล้ว');
    if (job.status === 'failed') throw new Error(job.error || job.message || 'Job failed');

    await wait(intervalMs);
  }

  throw new Error('งานใช้เวลานานเกินไป กรุณาตรวจสอบสถานะ backend แล้วลองใหม่');
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
