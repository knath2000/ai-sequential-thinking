import axios from 'axios';

export interface SubmitModalJobArgs {
  task: string;
  payload: Record<string, unknown>;
  callbackPath: string; // e.g. '/webhook/modal'
}

export async function submitModalJob({ task, payload, callbackPath }: SubmitModalJobArgs) {
  const baseUrl = process.env.MODAL_BASE_URL || 'https://api.modal.run';
  const token = process.env.MODAL_API_TOKEN;
  const publicBaseUrl = process.env.PUBLIC_BASE_URL;
  if (!token || !publicBaseUrl) throw new Error('Missing MODAL_API_TOKEN or PUBLIC_BASE_URL');

  const callback_url = new URL(callbackPath, publicBaseUrl).toString();
  const url = `${baseUrl}/v1/jobs`;
  const { data } = await axios.post(url, {
    task,
    payload,
    callback_url,
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
  return data;
}


