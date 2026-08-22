import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/lib/store';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}