import { Navigate, Outlet } from "react-router-dom";
import { isAuthed } from "../api/auth";

export function RequireAuth() {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return <Outlet />;
}