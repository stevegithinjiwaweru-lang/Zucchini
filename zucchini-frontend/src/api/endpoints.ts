export const endpoints = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    me: "/auth/me",
    logout: "/auth/logout",
  },

  orders: {
    create: "/orders",
    getAll: "/orders",
    getMine: "/orders/mine",
    getOne: (id: string) => `/orders/${id}`,
    assign: (id: string) => `/orders/${id}/assign`,
    delete: (id: string) => `/orders/${id}`,
    updateStatus: (id: string) => `/orders/${id}/status`,
    uploadPod: (id: string) => `/orders/${id}/pod`,
    bulkCsv: "/orders/bulk-csv",
  },

  riders: {
    getAll: "/riders",
    create: "/riders",
    update: (id: string) => `/riders/${id}`,
    delete: (id: string) => `/riders/${id}`,
    locationUpdate: (id: string) => `/riders/${id}/location`,
  },

  merchants: {
    getAll: "/merchants",
    create: "/merchants",
    update: (id: string) => `/merchants/${id}`,
    sync: (id: string) => `/merchants/${id}/sync`,
  },
};