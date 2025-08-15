// Use env override when provided; otherwise, during dev rely on Vite proxy by using /api
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "/api";


