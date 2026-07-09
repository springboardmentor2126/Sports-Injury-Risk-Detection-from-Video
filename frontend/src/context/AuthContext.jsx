import React, { createContext, useContext, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const role = localStorage.getItem("role");
    const full_name = localStorage.getItem("full_name");
    const access_token = localStorage.getItem("access_token");
    return access_token ? { role, full_name } : null;
  });

  const login = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("full_name", data.full_name);
    setUser({ role: data.role, full_name: data.full_name });
    return data;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    localStorage.removeItem("full_name");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
