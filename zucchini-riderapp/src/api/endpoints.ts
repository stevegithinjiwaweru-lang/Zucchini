// Matches src/api/endpoints.ts in the Easybox web dashboard.
export const endpoints = {
  auth: {
    login: "/auth/login",
    me: "/auth/me",
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
