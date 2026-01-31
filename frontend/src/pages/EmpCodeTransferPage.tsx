import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AppHeader from '../components/layout/AppHeader';
import employeeService, { Employee } from '../services/employee.service';

interface RowState {
  id: string;
  associateName: string;
  associateCode: string;
  newCode: string;
  profilePictureUrl?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function fullName(e: Employee): string {
  return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '-';
}

export default function EmpCodeTransferPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const organizationName = user?.employee?.organization?.name;
  const organizationId = user?.employee?.organizationId || user?.employee?.organization?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<RowState[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    setLoadError(null);
    employeeService
      .getAll({
        organizationId,
        page: currentPage,
        limit: pageSize,
        search: searchTerm.trim() || undefined,
        employeeStatus: 'ACTIVE',
      })
      .then((res) => {
        setTotalEntries(res.pagination.total);
        setRows(
          res.employees.map((e) => ({
            id: e.id,
            associateName: fullName(e),
            associateCode: e.employeeCode ?? '-',
            newCode: '',
            profilePictureUrl: e.profilePictureUrl,
          }))
        );
      })
      .catch((err: { response?: { data?: { message?: string } }; message?: string }) => {
        setLoadError(err.response?.data?.message || err.message || 'Failed to load employees');
        setRows([]);
        setTotalEntries(0);
      })
      .finally(() => setLoading(false));
  }, [organizationId, currentPage, pageSize, searchTerm]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalEntries);

  const handlePrint = () => window.print();
  const handleSave = () => {
    const withNewCode = rows.filter((r) => r.newCode.trim());
    if (withNewCode.length === 0) {
      alert('Enter at least one New Code to save.');
      return;
    }
    setSubmitting(true);
    // Placeholder: in future call API to update employee codes
    setTimeout(() => {
      setSubmitting(false);
      alert(`Save: ${withNewCode.length} code(s) would be updated. Backend integration can be added here.`);
    }, 300);
  };

  const handleSubmit = () => {
    const withNewCode = rows.filter((r) => r.newCode.trim());
    if (withNewCode.length === 0) {
      alert('Enter at least one New Code to submit.');
      return;
    }
    setSubmitting(true);
    // Placeholder: in future call API to apply code transfers
    setTimeout(() => {
      setSubmitting(false);
      alert(`Submit: ${withNewCode.length} code transfer(s) would be applied. Backend integration can be added here.`);
    }, 300);
  };

  const setNewCode = (employeeId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === employeeId ? { ...r, newCode: value } : r))
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-100">
      <AppHeader
        title="Emp Code Transfer"
        subtitle={organizationName ? `Organization: ${organizationName}` : undefined}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-h-0 overflow-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex flex-wrap items-center justify-between gap-3 mb-0">
          <h1 className="text-lg font-semibold">Emp Code Transfer</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Associate Code, Associate Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 rounded border border-gray-300 text-gray-900 text-sm min-w-[220px]"
            />
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded font-medium hover:bg-blue-50 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded font-medium hover:bg-blue-50 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {loadError}
          </div>
        )}

        <div className="bg-white rounded-b-lg shadow overflow-hidden border border-t-0 border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Associate Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Associate Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New Code
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {row.profilePictureUrl ? (
                            <img
                              src={row.profilePictureUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-gray-500">
                                {row.associateName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-900">{row.associateName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.associateCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          placeholder="New Code"
                          value={row.newCode}
                          onChange={(e) => setNewCode(row.id, e.target.value)}
                          className="w-full max-w-[180px] px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>entries</span>
            </div>
            <div className="text-sm text-gray-700">
              {totalEntries === 0
                ? 'No entries'
                : `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = currentPage <= 3 ? i + 1 : Math.max(1, currentPage - 2 + i);
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1 border rounded text-sm font-medium ${
                      currentPage === p
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="px-1 text-gray-500">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 ${
                      currentPage === totalPages ? 'bg-blue-600 border-blue-600 text-white' : ''
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Submit
          </button>
        </div>
      </main>
    </div>
  );
}
