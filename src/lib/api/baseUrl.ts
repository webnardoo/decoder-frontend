export function getApiBaseUrl(): string {
  // ex.: NEXT_PUBLIC_API_BASE_URL=http://localhost:4100/api/v1
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
    "http://localhost:4100/api/v1"
  );
}
