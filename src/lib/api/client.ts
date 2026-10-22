import "server-only";
import { getSessionToken } from "@/lib/auth/session";

export type ValidationIssue = {
  loc: (string | number)[];
  msg: string;
  type: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string | ValidationIssue[] | null,
  ) {
    super(typeof detail === "string" ? detail : `API request failed with ${status}`);
  }
}

type ApiRequestInit = Omit<RequestInit, "body"> & { json?: unknown };

async function readDetail(response: Response): Promise<ApiError["detail"]> {
  try {
    const body = (await response.json()) as { detail?: ApiError["detail"] };
    return body.detail ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, { json, ...init }: ApiRequestInit = {}): Promise<T> {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) throw new Error("API_BASE_URL is not set");
  const token = await getSessionToken();
  if (!token) throw new ApiError(401, "Not authenticated");

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1${path}`, {
    ...init,
    headers: {
      ...init.headers,
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(json === undefined ? {} : { "content-type": "application/json" }),
    },
    body: json === undefined ? undefined : JSON.stringify(json),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ApiError(response.status, await readDetail(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export type Page<T> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
};

const MAX_PAGE = 100;

export async function fetchAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  for (let offset = 0; ; offset += MAX_PAGE) {
    const page = await apiFetch<Page<T>>(`${path}?limit=${MAX_PAGE}&offset=${offset}`);
    items.push(...page.items);
    if (page.items.length < MAX_PAGE || items.length >= page.total) return items;
  }
}
