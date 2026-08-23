import { API_BASE_URL } from "./env";

export type ApiErrorPayload = {
  message?: string;
  issues?: unknown;
};

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload | null;

  constructor(status: number, payload: ApiErrorPayload | null) {
    super(payload?.message ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

function buildUrl(path: string) {
  if (path.startsWith("http")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function parseResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return response.text();
  }

  return response.json();
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    body:
      options.body === undefined || typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body),
    credentials: "include",
    headers,
  });
  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof data === "object" && data !== null ? data : null,
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
