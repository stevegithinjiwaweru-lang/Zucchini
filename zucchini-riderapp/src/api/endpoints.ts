/**
 * Must match zucchini-backend routes under /api
 * client baseURL already includes /api
 */
export const endpoints = {
  auth: {
    login: "/auth/login",
    riderLogin: "/auth/rider/login",
    me: "/auth/me",
    logout: "/auth/logout",
  },
  orders: {
    getMine: "/orders/mine",
    getOne: (id: string) => `/orders/${id}`,
    updateStatus: (id: string) => `/orders/${id}/status`,
    uploadPod: (id: string) => `/orders/${id}/pod`,
  },
  riders: {
    locationUpdate: (id: string) => `/riders/${id}/location`,
  },
};
