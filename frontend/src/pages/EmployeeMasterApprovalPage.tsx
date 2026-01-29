import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AppHeader from '../components/layout/AppHeader';
import {
  employeeChangeRequestService,
  type EmployeeChangeRequestListItem,
  type EmployeeChangeRequestDetail,
} from '../services/employee-change-request.service';

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DiffSection({
  title,
  existing,
  requested,
  expanded: defaultExpanded = false,
}: {
  title: string;
  existing: Record<string, unknown>;
  requested: Record<string, unknown>;
  expanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const keys = new Set([...Object.keys(existing || {}), ...Object.keys(requested || {})]);
  const entries = Array.from(keys).filter(
    (k) => existing?.[k] !== requested?.[k] || (existing?.[k] != null && requested?.[k] != null)
  );
  if (entries.length === 0 && !existing && !requested) return null;

  const hasDiff = entries.length > 0 || (existing && requested && JSON.stringify(existing) !== JSON.stringify(requested));

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-left text-sm font-medium text-gray-900 hover:bg-gray-100"
      >
        <span>{title}</span>
        <span className="text-gray-500">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="p-4 bg-white border-t border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-700 w-48">Field</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Existing</th>
                <th className="text-left py-2 font-medium text-gray-700">To Approve</th>
              </tr>
            </thead>
            <tbody>
              {entries.length > 0 ? (
                entries.map((key) => (
                  <tr key={key} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                    <td className="py-2 pr-4 text-gray-900">
                      {existing?.[key] != null ? String(existing[key]) : '—'}
                    </td>
                    <td className="py-2 text-gray-900">
                      {requested?.[key] != null ? String(requested[key]) : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-2 text-gray-500">
                    {hasDiff ? 'Object/array changed' : 'No changes'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function EmployeeMasterApprovalPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [list, setList] = useState<EmployeeChangeRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmployeeChangeRequestDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await employeeChangeRequestService.listPending();
      setList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    employeeChangeRequestService
      .getById(selectedId)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  const handleApprove = async () => {
    if (!selectedId || !detail) return;
    setApproving(true);
    try {
      await employeeChangeRequestService.approve(selectedId);
      setSelectedId(null);
      setDetail(null);
      await fetchList();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to approve');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedId || !detail) return;
    setRejecting(true);
    try {
      await employeeChangeRequestService.reject(selectedId, rejectReason);
      setSelectedId(null);
      setDetail(null);
      setRejectReason('');
      await fetchList();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to reject');
    } finally {
      setRejecting(false);
    }
  };

  const existingData = (detail?.existingData || {}) as Record<string, unknown>;
  const requestedData = (detail?.requestedData || {}) as Record<string, unknown>;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-100">
      <AppHeader title="Employee Master Approval" onLogout={handleLogout} />

      <main className="flex-1 min-h-0 overflow-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-nowrap items-center justify-between gap-3 mb-6 min-w-0">
          <h1 className="text-2xl font-bold text-blue-900 whitespace-nowrap">Employee Master Approval</h1>
        </div>

        {!selectedId ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <p className="p-4 text-sm text-gray-600 border-b border-gray-200">
              Employees who have changed their details and are waiting for approval. Click a row to review and approve or reject.
            </p>
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : list.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No pending approvals.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Employee Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {list.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.employee.firstName} {item.employee.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.employee.employeeCode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.submittedAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(item.id);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loadingDetail ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : detail ? (
              <>
                <div className="p-4 bg-blue-600 text-white">
                  <h2 className="text-lg font-semibold">Associate Master Approval</h2>
                </div>
                <div className="p-4 border-b border-gray-200 space-y-2 text-sm">
                  <p><strong>Submitted By:</strong> By Employee</p>
                  <p><strong>Action:</strong> <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded">Edited</span></p>
                  <p><strong>Date:</strong> {formatDate(detail.submittedAt)}</p>
                  <p><strong>Employee:</strong> {detail.employee.firstName} {detail.employee.lastName} ({detail.employee.employeeCode})</p>
                </div>

                <div className="p-4 space-y-4">
                  <DiffSection title="Personal / Company" existing={existingData} requested={requestedData} expanded />
                  {existingData.address || requestedData.address ? (
                    <DiffSection
                      title="Permanent Address"
                      existing={(existingData.address as Record<string, unknown>) || {}}
                      requested={(requestedData.address as Record<string, unknown>) || {}}
                    />
                  ) : null}
                  {existingData.bankDetails || requestedData.bankDetails ? (
                    <DiffSection
                      title="Bank Details"
                      existing={(existingData.bankDetails as Record<string, unknown>) || {}}
                      requested={(requestedData.bankDetails as Record<string, unknown>) || {}}
                    />
                  ) : null}
                  {existingData.emergencyContacts || requestedData.emergencyContacts ? (
                    <DiffSection
                      title="Others / Emergency"
                      existing={
                        Array.isArray(existingData.emergencyContacts)
                          ? (existingData.emergencyContacts[0] as Record<string, unknown>) || {}
                          : {}
                      }
                      requested={
                        Array.isArray(requestedData.emergencyContacts)
                          ? (requestedData.emergencyContacts[0] as Record<string, unknown>) || {}
                          : {}
                      }
                    />
                  ) : null}
                </div>

                <div className="p-4 border-t border-gray-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(null);
                        setRejectReason('');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <span className="text-red-500">✕</span> Cancel
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={rejecting}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                      >
                        <span>✕</span> Reject
                      </button>
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={approving}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        <span>✓</span> {approving ? 'Approving...' : 'Approve'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rejection reason (optional)</label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="block w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Reason for rejection"
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
