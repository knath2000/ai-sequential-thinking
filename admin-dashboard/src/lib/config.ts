// Use env override when provided; otherwise call the same host FastAPI under /api/v1
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "/api/v1";


