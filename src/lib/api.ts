import { toast } from "@/hooks/useToast";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  const response = await fetch(endpoint, config);

  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    throw new Error("Failed to parse server response");
  }

  if (response.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new Error(json.message || "Unauthorized");
  }

  if (response.status === 403) {
    toast.error("You don't have permission to perform this action.", "Access Denied");
    throw new Error(json.message || "Forbidden");
  }

  if (!response.ok || json.success === false) {
    const errorMsg = json.message || "An unexpected error occurred.";
    throw new Error(errorMsg);
  }

  return json.data as T;
}
