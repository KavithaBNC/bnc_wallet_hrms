import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AppHeader from '../components/layout/AppHeader';
import transferPromotionEntryService, {
  TransferPromotionEntryRecord as ApiRecord,
} from '../services/transfer-promotion-entry.service';

interface EntryRecord {
  id: string;
  associateCode: string;
  associateName: string;
  effectiveDate: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function formatEffectiveDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function mapApiRecordToEntry(r: ApiRecord): EntryRecord {
  const name = r.employee
    ? [r.employee.firstName, r.employee.middleName, r.employee.lastName].filter(Boolean).join(' ')
    : '';
  return {
    id: r.id,
    associateCode: r.employee?.employeeCode ?? '-',
    associateName: name || '-',
    effectiveDate: formatEffectiveDate(r.effectiveDate),
  };
}

export default function TransferPromotionEntryPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const organizationName = user?.employee?.organization?.name;
  const organizationId = user?.employee?.organizationId || user?.employee?.organization?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [records, setRecords] = useState<EntryRecord[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewRecordId, setViewRecordId] = useState<string | null>(null);
  const [viewDetail, setViewDetail] = useState<ApiRecord | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    setLoadError(null);
    transferPromotionEntryService
      .getAll({
        organizationId,
        page: currentPage,
        limit: pageSize,
        search: searchTerm.trim() || undefined,
      })
      .then((res) => {
        setRecords(res.transferPromotionEntries.map(mapApiRecordToEntry));
        setTotalEntries(res.pagination.total);
      })
      .catch((err: { response?: { data?: { message?: string } }; message?: string }) => {
        setLoadError(err.response?.data?.message || err.message || 'Failed to load records');
        setRecords([]);
        setTotalEntries(0);
      })
      .finally(() => setLoading(false));
  }, [organizationId, currentPage, pageSize, searchTerm]);

  useEffect(() => {
    if (!viewRecordId) {
      setViewDetail(null);
      setViewError(null);
      return;
    }
    setViewLoading(true);
    setViewError(null);
    transferPromotionEntryService
      .getById(viewRecordId)
      .then((record) => setViewDetail(record))
      .catch((err: { response?: { data?: { message?: string } }; message?: string }) => {
        setViewError(err.response?.data?.message || err.message || 'Failed to load record');
        setViewDetail(null);
      })
      .finally(() => setViewLoading(false));
  }, [viewRecordId]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalEntries);

  const handleAdd = () => navigate('/transaction/transfer-promotion-entry/add');
  const handlePrint = () => window.print();
  const handleSave = () => {}; // TODO: save/export
  const handleView = (record: EntryRecord) => setViewRecordId(record.id);
  const closeViewModal = () => setViewRecordId(null);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-100">
      <AppHeader
        title="Transaction"
        subtitle={organizationName ? `Organization: ${organizationName}` : undefined}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-h-0 overflow-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex flex-wrap items-center justify-between gap-3 mb-0">
          <h1 className="text-lg font-semibold">Transfer And Promotion Entry</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search: Associate Code, Associate Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 rounded border border-gray-300 text-gray-900 text-sm min-w-[220px]"
            />
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded font-medium hover:bg-blue-50 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
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
                    Associate Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Associate Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effective Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No records found. Add one using the Add button.
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-gray-500">
                              {record.associateName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{record.associateCode}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.associateName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.effectiveDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleView(record)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded"
                          title="View"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
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

        {viewRecordId != null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-entry-title"
          >
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 id="view-entry-title" className="text-lg font-semibold text-gray-900">
                  Record Details
                </h2>
                <button
                  type="button"
                  onClick={closeViewModal}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {viewLoading && (
                  <div className="py-8 text-center text-gray-500">Loading...</div>
                )}
                {viewError && (
                  <div className="py-4 px-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {viewError}
                  </div>
                )}
                {!viewLoading && !viewError && viewDetail && (
                  <div className="space-y-4">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-gray-500 font-medium">Associate Code</dt>
                        <dd className="text-gray-900 mt-0.5">{viewDetail.employee?.employeeCode ?? '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 font-medium">Associate Name</dt>
                        <dd className="text-gray-900 mt-0.5">
                          {viewDetail.employee
                            ? [viewDetail.employee.firstName, viewDetail.employee.middleName, viewDetail.employee.lastName]
                                .filter(Boolean)
                                .join(' ')
                            : '-'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 font-medium">Paygroup</dt>
                        <dd className="text-gray-900 mt-0.5">{viewDetail.paygroup?.name ?? '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 font-medium">Effective Date</dt>
                        <dd className="text-gray-900 mt-0.5">{viewDetail.effectiveDate ? formatEffectiveDate(viewDetail.effectiveDate) : '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 font-medium">Remarks</dt>
                        <dd className="text-gray-900 mt-0.5">{viewDetail.remarks ?? '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 font-medium">Promotion</dt>
                        <dd className="mt-0.5">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${viewDetail.promotionEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {viewDetail.promotionEnabled ? 'YES' : 'NO'}
                          </span>
                        </dd>
                      </div>
                      {viewDetail.promotionEnabled && (
                        <>
                          <div>
                            <dt className="text-gray-500 font-medium">Promotion From</dt>
                            <dd className="text-gray-900 mt-0.5">{viewDetail.promotionFrom?.title ?? '-'}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500 font-medium">Promotion To</dt>
                            <dd className="text-gray-900 mt-0.5">{viewDetail.promotionTo?.title ?? '-'}</dd>
                          </div>
                        </>
                      )}
                    </dl>
                    {viewDetail.transferComponents && Array.isArray(viewDetail.transferComponents) && viewDetail.transferComponents.length > 0 && (
                      <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Transfer Components</h3>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Value</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">New Value</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {viewDetail.transferComponents.map((row: { component: string; currentValue: string; newValue: string }, idx: number) => (
                                <tr key={idx}>
                                  <td className="px-4 py-2 text-sm text-gray-900">{row.component}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900">{row.currentValue}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900">{row.newValue}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  type="button"
                  onClick={closeViewModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
