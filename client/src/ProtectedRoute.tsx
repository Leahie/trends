import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/auth';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  console.log(user);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login"  />;
}