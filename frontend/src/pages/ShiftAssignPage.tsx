import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AppHeader from '../components/layout/AppHeader';

export default function ShiftAssignPage() {
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

      <main className="flex-1 min-h-0 overflow-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex text-sm text-gray-600 mb-4" aria-label="Breadcrumb">
          <Link to="/dashboard" className="hover:text-gray-900">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/time-attendance" className="hover:text-gray-900">Time attendance</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Shift Assign</span>
        </nav>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Shift Assign</h2>
          <p className="text-gray-600 mb-6">
            Assign shifts to employees. List and assignment forms can be implemented here.
          </p>
          <div className="border border-gray-200 rounded-lg p-6 text-center text-gray-500">
            Shift Assign list and forms can be implemented here.
          </div>
        </div>
      </main>
    </div>
  );
}
