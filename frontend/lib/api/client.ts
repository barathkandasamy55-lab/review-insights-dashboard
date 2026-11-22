import axios from 'axios';

/** Single axios instance for the Nest API. Base URL comes from NEXT_PUBLIC_API_URL. */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  timeout: 20000,
});

/** Turns any axios failure into a short message safe to show to operations staff. */
export function toErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Cannot reach the server. Check that the backend is running.';
    const msg = (err.response.data as { message?: string | string[] })?.message;
    if (msg) return Array.isArray(msg) ? msg.join(', ') : msg;
    return `The server returned an error (${err.response.status}).`;
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}
