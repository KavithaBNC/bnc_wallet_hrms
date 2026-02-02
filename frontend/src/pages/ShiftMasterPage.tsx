import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AppHeader from '../components/layout/AppHeader';
import shiftService, { Shift } from '../services/shift.service';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const COLUMN_KEYS = [
  'shortName',
  'shiftName',
  'fromTime',
  'toTime',
  'firstHalfEnd',
  'secondHalfStart',
  'punchInTime',
  'punchOutTime',
  'active',
  'flexiType',
  'action',
] as const;

const COLUMN_LABELS: Record<(typeof COLUMN_KEYS)[number], string> = {
  shortName: 'Short Name',
  shiftName: 'Shift Name',
  fromTime: 'From Time',
  toTime: 'To Time',
  firstHalfEnd: 'First Half End',
  secondHalfStart: 'Second Half Start',
  punchInTime: 'PunchIn Time',
  punchOutTime: 'PunchOut Time',
  active: 'Active',
  flexiType: 'Flexi Type',
  action: 'Action',
};

export default function ShiftMasterPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const organizationName = user?.employee?.organization?.name;
  const organizationId = user?.employee?.organizationId || user?.employee?.organization?.id;

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateFormat24, setDateFormat24] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(COLUMN_KEYS as unknown as string[]));
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchList = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await shiftService.getAll({
        organizationId,
        search: searchTerm.trim() || undefined,
        page,
        limit: pageSize,
      });
      setShifts(result.shifts);
      setPagination(result.pagination);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to load shifts';
      setError(String(message || 'Failed to load shifts'));
      setShifts([]);
      setPagination({ page: 1, limit: pageSize, total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) fetchList();
  }, [organizationId, page, pageSize, searchTerm]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAdd = () => navigate('/time-attendance/shift-master/add');
  const handlePrint = () => window.print();
  const handleSave = () => {}; // placeholder for export

  const handleDelete = async (id: string) => {
    try {
      await shiftService.delete(id);
      setDeleteConfirmId(null);
      fetchList();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Delete failed';
      setError(String(message));
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalPages = Math.max(1, pagination.totalPages);
  const startEntry = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endEntry = Math.min(pagination.page * pagination.limit, pagination.total);

  const formatTime = (time: string | null | undefined) => {
    if (!time) return '—';
    if (dateFormat24) return time;
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-100">
      <AppHeader
        title="Time attendance"
        subtitle={organizationName ? `Organization: ${organizationName}` : undefined}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-h-0 overflow-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        <nav className="flex text-sm text-gray-600 mb-4" aria-label="Breadcrumb">
          <Link to="/dashboard" className="hover:text-gray-900">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/time-attendance" className="hover:text-gray-900">Time attendance</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Master</span>
        </nav>

        {/* Toolbar: title, date format, search, actions */}
        <div className="bg-white rounded-t-lg border border-gray-200 shadow-sm mb-0">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-200">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-lg font-semibold text-gray-900">Master</h1>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDateFormat24(true)}
                  className={`px-3 py-2 text-sm font-medium ${dateFormat24 ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  24Hrs
                </button>
                <button
                  type="button"
                  onClick={() => setDateFormat24(false)}
                  className={`px-3 py-2 text-sm font-medium ${!dateFormat24 ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  12Hrs
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[140px]"
              />
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColumnPicker((v) => !v)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Show / hide columns
                </button>
                {showColumnPicker && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowColumnPicker(false)} aria-hidden="true" />
                    <div className="absolute right-0 mt-1 w-56 py-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                      {COLUMN_KEYS.filter((k) => k !== 'action').map((key) => (
                        <label key={key} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleColumns.has(key)}
                            onChange={() => toggleColumn(key)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">{COLUMN_LABELS[key]}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {visibleColumns.has('shortName') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Short Name
                    </th>
                  )}
                  {visibleColumns.has('shiftName') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shift Name
                    </th>
                  )}
                  {visibleColumns.has('fromTime') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From Time
                    </th>
                  )}
                  {visibleColumns.has('toTime') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To Time
                    </th>
                  )}
                  {visibleColumns.has('firstHalfEnd') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      First Half End
                    </th>
                  )}
                  {visibleColumns.has('secondHalfStart') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Second Half Start
                    </th>
                  )}
                  {visibleColumns.has('punchInTime') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PunchIn Time
                    </th>
                  )}
                  {visibleColumns.has('punchOutTime') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PunchOut Time
                    </th>
                  )}
                  {visibleColumns.has('active') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active
                    </th>
                  )}
                  {visibleColumns.has('flexiType') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Flexi Type
                    </th>
                  )}
                  {visibleColumns.has('action') && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={COLUMN_KEYS.length} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : shifts.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_KEYS.length} className="px-4 py-8 text-center text-gray-500">
                      No shifts found. Add a shift using the Add button.
                    </td>
                  </tr>
                ) : (
                  shifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-gray-50">
                      {visibleColumns.has('shortName') && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {shift.code ?? '—'}
                        </td>
                      )}
                      {visibleColumns.has('shiftName') && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{shift.name}</td>
                      )}
                      {visibleColumns.has('fromTime') && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {formatTime(shift.startTime)}
                        </td>
                      )}
                      {visibleColumns.has('toTime') && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {formatTime(shift.endTime)}
                        </td>
                      )}
                      {visibleColumns.has('firstHalfEnd') && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {shift.firstHalfEnd ? formatTime(shift.firstHalfEnd) : '—'}
                        </td>
                      )}
                      {visibleColumns.has('secondHalfStart') && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {shift.secondHalfStart ? formatTime(shift.secondHalfStart) : '—'}
                        </td>
                      )}
                      {visibleColumns.has('punchInTime') && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {shift.punchInTime ? formatTime(shift.punchInTime) : '—'}
                        </td>
                      )}
                      {visibleColumns.has('punchOutTime') && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {shift.punchOutTime ? formatTime(shift.punchOutTime) : '—'}
                        </td>
                      )}
                      {visibleColumns.has('active') && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              shift.isActive ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {shift.isActive ? 'Yes' : 'No'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.has('flexiType') && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {shift.flexiType === 'FULL_FLEXI'
                            ? 'Full Flexi'
                            : shift.flexiType === 'SHIFT_START'
                              ? 'Shift Start'
                              : shift.flexiType === 'SHIFT_END'
                                ? 'Shift End'
                                : shift.isFlexible
                                  ? 'Full Flexi'
                                  : 'None'}
                        </td>
                      )}
                      {visibleColumns.has('action') && (
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/time-attendance/shift-master/edit/${shift.id}`)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            {deleteConfirmId === shift.id ? (
                              <span className="flex items-center gap-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(shift.id)}
                                  className="text-red-600 font-medium hover:underline"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-gray-600 hover:underline"
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(shift.id)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} entries
                  </option>
                ))}
              </select>
              <span>entries</span>
            </div>
            <div className="text-sm text-gray-700">
              Showing {startEntry} to {endEntry} of {pagination.total} entries
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
