/**
 * Authentication service - connects to Django backend auth endpoints.
 */

import { api } from "./api";

export const authService = {
  login: async (email, password) => {
    const data = await api.post("/auth/login/", { email, password });
    return {
      ok: true,
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        maxDiscountPercent: data.maxDiscountPercent,
        companyName: data.companyName,
      },
    };
  },

  register: async (formData) => {
    const data = await api.post("/auth/register/", {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      businessName: formData.businessName,
      businessType: formData.businessType || "",
      phone: formData.phone || "",
      address: formData.address || "",
    });
    return {
      ok: true,
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
      },
    };
  },
};
