export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:8000';
}