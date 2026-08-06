/**
 * Canonical API paths — must match zucchini-backend/src/routes/*
 * Base URL already includes /api (see api/client.ts).
 */
export const endpoints = {
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    me: "/auth/me",
    logout: "/auth/logout",
  },

  orders: {
    list: "/orders",
    create: "/orders",
    createWhatsapp: "/orders/whatsapp",
    getMine: "/orders/mine",
    getOne: (id: string) => `/orders/${id}`,
    update: (id: string) => `/orders/${id}`,
    assign: (id: string) => `/orders/${id}/assign`,
    unassign: (id: string) => `/orders/${id}/unassign`,
    delete: (id: string) => `/orders/${id}`,
    restore: (id: string) => `/orders/${id}/restore`,
    updateStatus: (id: string) => `/orders/${id}/status`,
    uploadPod: (id: string) => `/orders/${id}/pod`,
    bulkCsv: "/orders/bulk-csv",
    uploadCsv: "/orders/upload-csv",
    dashboardStats: "/orders/stats/dashboard",
  },

  riders: {
    getAll: "/riders",
    create: "/riders",
    update: (id: string) => `/riders/${id}`,
    delete: (id: string) => `/riders/${id}`,
    locationUpdate: (id: string) => `/riders/${id}/location`,
  },

  dispatches: {
    list: "/dispatches",
  },
};
