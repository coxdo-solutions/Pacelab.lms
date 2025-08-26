// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      credentials: "include", // Include cookies for JWT auth
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMsg = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || JSON.stringify(errorData);
      } catch {
        const errorText = await response.text();
        if (errorText) errorMsg = errorText;
      }
      throw new Error(errorMsg);
    }

    return response.json() as Promise<T>;
  }

  // ---------- AUTH ----------
  login(email: string, password: string) {
    return this.request<{ accessToken: string; refreshToken: string }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
  }

  logout() {
    return this.request<void>("/auth/logout", { method: "POST" });
  }

  refreshToken() {
    return this.request<{ accessToken: string }>("/auth/refresh", {
      method: "POST",
    });
  }

  // ---------- USERS ----------
  getUsers() {
    return this.request<any[]>("/admin/users");
  }

  createUser(userData: any) {
    return this.request<any>("/admin/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  updateUser(userId: string, userData: any) {
    return this.request<any>(`/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  deleteUser(userId: string) {
    return this.request<void>(`/admin/users/${userId}`, {
      method: "DELETE",
    });
  }

  // ---------- COURSES ----------
  getCourses() {
    return this.request<any[]>("/admin/courses");
  }

  getCourse(courseId: string) {
    return this.request<any>(`/courses/${courseId}`);
  }

  createCourse(courseData: any) {
    return this.request<any>("/admin/courses", {
      method: "POST",
      body: JSON.stringify(courseData),
    });
  }

  updateCourse(courseId: string, courseData: any) {
    return this.request<any>(`/admin/courses/${courseId}`, {
      method: "PUT",
      body: JSON.stringify(courseData),
    });
  }

  deleteCourse(courseId: string) {
    return this.request<void>(`/admin/courses/${courseId}`, {
      method: "DELETE",
    });
  }

  // ---------- LESSONS ----------
  getLesson(lessonId: string) {
    return this.request<any>(`/lessons/${lessonId}`);
  }

  updateProgress(lessonId: string, progress: any) {
    return this.request<any>(`/lessons/${lessonId}/progress`, {
      method: "POST",
      body: JSON.stringify(progress),
    });
  }

  // ---------- CHAT ----------
  getChatMessages(lessonId: string) {
    return this.request<any[]>(`/lessons/${lessonId}/chats`);
  }

  sendChatMessage(lessonId: string, message: any) {
    return this.request<any>(`/lessons/${lessonId}/chats`, {
      method: "POST",
      body: JSON.stringify(message),
    });
  }

  // ---------- ENROLLMENTS ----------
  getUserEnrollments() {
    return this.request<any[]>("/me/enrollments");
  }

  enrollUser(courseId: string, userId: string, expiresAt?: string) {
    return this.request<any>("/admin/enrollments", {
      method: "POST",
      body: JSON.stringify({ courseId, userId, expiresAt }),
    });
  }

  // ---------- ANALYTICS ----------
  getAnalytics() {
    return this.request<any>("/admin/reports");
  }

  // ---------- VIDEO ----------
  getSignedVideoUrl(lessonId: string) {
    return this.request<{ url: string }>(`/lessons/${lessonId}/video-url`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
