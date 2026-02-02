import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AppHeader from '../components/layout/AppHeader';

export default function AssociateShiftChangePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const organizationName = user?.employee?.organization?.name;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-100">
      <AppHeader
        title="Time attendance"
        subtitle={organizationName ? `Organization: ${organizationName}` : undefined}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-h-0 overflow-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex text-sm text-gray-600 mb-4" aria-label="Breadcrumb">
          <Link to="/dashboard" className="hover:text-gray-900">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/time-attendance" className="hover:text-gray-900">Time attendance</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Associate Shift Change</span>
        </nav>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h1 className="text-lg font-semibold text-gray-900">Associate Shift Change</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage associate shift changes. Content for this module can be added here.
          </p>
        </div>
      </main>
    </div>
  );
}
