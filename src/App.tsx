import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useSession } from '@/lib/store';
import { ToastStack } from '@/components/ui/Feedback';
import { Shell } from '@/app/Shell';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { SignIn } from '@/features/auth/SignIn';
import { SignUp } from '@/features/auth/SignUp';
import { VerifyEmail } from '@/features/auth/VerifyEmail';
import { EmployeeDirectory } from '@/features/employees/Directory';
import { EmployeeDashboard } from '@/features/dashboard/EmployeeDashboard';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { AdminAttendance } from '@/features/attendance/AdminAttendance';
import { MyAttendance } from '@/features/attendance/MyAttendance';
import { AdminTimeOff } from '@/features/timeoff/AdminTimeOff';
import { MyTimeOff } from '@/features/timeoff/MyTimeOff';
import { PayrollPage } from '@/features/payroll/PayrollPage';

export default function App() {
  const { user } = useSession();
  const isAuth = !!user;

  return (
    <>
      <Routes>
        {/* Auth pages — centered card, no shell */}
        <Route path="/signin" element={isAuth ? <Navigate to="/" replace /> : <SignIn />} />
        <Route path="/signup" element={isAuth ? <Navigate to="/" replace /> : <SignUp />} />
        <Route path="/signup/verify-email" element={<VerifyEmail />} />

        <Route
          element={
            <ProtectedRoute>
              <Shell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/dashboard" element={<EmployeeDashboard />} />
          <Route path="/employees" element={<EmployeeRoleGate />} />
          <Route path="/employees/:id" element={<EmployeeProfileGate />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/attendance" element={<AttendanceGate />} />
          <Route path="/time-off" element={<TimeOffGate />} />
          <Route path="/payroll" element={<PayrollPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global toast stack (§11) — success/error/info feedback on every screen */}
      <ToastStack />
    </>
  );
}

function HomeRedirect() {
  const { role } = useSession();
  return <Navigate to={role === 'admin' ? '/employees' : '/dashboard'} replace />;
}

/** Employees directory is an Admin/HR screen; employees get their dashboard. */
function EmployeeRoleGate() {
  const { role } = useSession();
  return role === 'admin' ? <EmployeeDirectory /> : <Navigate to="/dashboard" replace />;
}

function AttendanceGate() {
  const { role } = useSession();
  return role === 'admin' ? <AdminAttendance /> : <MyAttendance />;
}

function TimeOffGate() {
  const { role } = useSession();
  return role === 'admin' ? <AdminTimeOff /> : <MyTimeOff />;
}

function EmployeeProfileGate() {
  const { role, user } = useSession();
  const { id } = useParams();
  if (role === 'employee' && id && id !== user?.id) {
    return <Navigate to="/profile" replace />;
  }
  return <ProfilePage />;
}