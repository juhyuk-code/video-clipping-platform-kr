const BASE_URL = "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }

  return res.json();
}

// Projects
export const api = {
  projects: {
    list(role?: "creator" | "clipper", status?: string) {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      return request<any[]>(`/projects?${params}`);
    },
    get(id: string) {
      return request<any>(`/projects/${id}`);
    },
    create(data: any) {
      return request<any>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update(id: string, data: any) {
      return request<any>(`/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete(id: string) {
      return request<any>(`/projects/${id}`, { method: "DELETE" });
    },
  },

  applications: {
    list(projectId: string) {
      return request<any[]>(`/projects/${projectId}/applications`);
    },
    create(projectId: string, data: any) {
      return request<any>(`/projects/${projectId}/applications`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update(projectId: string, appId: string, data: { status: string }) {
      return request<any>(`/projects/${projectId}/applications/${appId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
  },

  clips: {
    list(projectId: string) {
      return request<any[]>(`/projects/${projectId}/clips`);
    },
    submit(projectId: string, data: any) {
      return request<any>(`/projects/${projectId}/clips`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    review(projectId: string, clipId: string, data: any) {
      return request<any>(`/projects/${projectId}/clips/${clipId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
  },

  messages: {
    list(projectId: string) {
      return request<any[]>(`/projects/${projectId}/messages`);
    },
    send(projectId: string, data: { content: string }) {
      return request<any>(`/projects/${projectId}/messages`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  marketplace: {
    search(params?: Record<string, string>) {
      const qs = new URLSearchParams(params);
      return request<{ projects: any[]; pagination: any }>(`/marketplace?${qs}`);
    },
  },

  users: {
    me() {
      return request<any>("/users/me");
    },
    update(data: any) {
      return request<any>("/users/me", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    getPublic(id: string) {
      return request<any>(`/users/${id}`);
    },
  },

  notifications: {
    list(unreadOnly = false) {
      return request<{ notifications: any[]; unreadCount: number }>(
        `/notifications${unreadOnly ? "?unread=true" : ""}`
      );
    },
    markRead(id: string) {
      return request<any>(`/notifications/${id}/read`, { method: "PUT" });
    },
    markAllRead() {
      return request<any>(`/notifications/all/read`, { method: "PUT" });
    },
  },

  reviews: {
    create(projectId: string, data: any) {
      return request<any>(`/projects/${projectId}/review`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },
};
