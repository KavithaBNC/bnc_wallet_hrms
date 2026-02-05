import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AppHeader from '../components/layout/AppHeader';
import employeeService, { Employee } from '../services/employee.service';
import shiftService, { Shift } from '../services/shift.service';
import { attendanceService } from '../services/attendance.service';
import { format, eachDayOfInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';

function fullName(e: Employee): string {
  const parts = [e.firstName, e.middleName, e.lastName].filter(Boolean);
  return parts.join(' ').trim() || e.employeeCode || '';
}

interface ShiftAssignment {
  employeeId: string;
  date: string;
  shiftName: string;
  isWeekOff: boolean;
}

export default function AssociateShiftGridPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuthStore();
  const organizationName = user?.employee?.organization?.name;
  const organizationId = user?.employee?.organizationId || user?.employee?.organization?.id;

  // Support both single associateId (legacy) and multiple associateIds (comma-separated)
  const associateIdParam = searchParams.get('associateId');
  const associateIdsParam = searchParams.get('associateIds');
  const monthParam = searchParams.get('month'); // Optional: YYYY-MM format
  
  // Parse multiple associate IDs from comma-separated string
  const selectedAssociateIds = associateIdsParam 
    ? associateIdsParam.split(',').filter(id => id.trim() !== '')
    : associateIdParam 
      ? [associateIdParam] 
      : [];

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<Map<string, ShiftAssignment>>(new Map());
  const [initialAssignments, setInitialAssignments] = useState<Map<string, ShiftAssignment>>(new Map()); // Track initial state
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (monthParam) {
      return parseISO(`${monthParam}-01`);
    }
    return new Date();
  });

  // Generate date range for current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const dateRange = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });

  // Fetch shifts from Shift Master separately - this only updates dropdown options
  useEffect(() => {
    if (!organizationId) {
      console.warn('Cannot fetch shifts: organizationId is missing');
      return;
    }
    
    console.log('Fetching shifts from Shift Master for organizationId:', organizationId);
    
    shiftService
      .getAll({
        organizationId,
        limit: 1000,
        // Don't filter by isActive - fetch all shifts, then filter active ones on frontend
      })
      .then((res) => {
        // shiftService.getAll returns ShiftListResponse: { shifts: Shift[], pagination: {...} }
        const allShifts = res?.shifts || [];
        
        // Filter for active shifts only on the frontend
        const shiftList = allShifts.filter(shift => shift.isActive === true);
        
        console.log('✅ Fetched shifts from Shift Master');
        console.log('   - Full response:', res);
        console.log('   - Total shifts (all):', allShifts.length);
        console.log('   - Active shifts:', shiftList.length);
        console.log('   - Shift names:', shiftList.map(s => s.name));
        console.log('   - Shift details:', shiftList);
        
        if (shiftList.length === 0) {
          console.error('❌ No active shifts found in Shift Master!');
          console.error('   - Total shifts in database:', allShifts.length);
          console.error('   - Please ensure shifts are marked as Active in Shift Master page.');
          console.error('   - Response received:', res);
        } else {
          console.log('✅ Successfully loaded', shiftList.length, 'active shifts from Shift Master');
        }
        
        setShifts(shiftList);
      })
      .catch((error) => {
        console.error('Error fetching shifts from Shift Master:', error);
        console.error('Error details:', error.response || error.message);
        setShifts([]);
      });
  }, [organizationId]);

  // Fetch employees and initialize shift assignments - preserves existing assignments
  useEffect(() => {
    if (!organizationId) {
      console.warn('Organization ID is missing');
      setLoading(false);
      return;
    }
    
    // Generate date range for current month (inside useEffect to ensure it's current)
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    let currentDateRange: Date[] = [];
    try {
      currentDateRange = eachDayOfInterval({
        start: monthStart,
        end: monthEnd,
      });
    } catch (error) {
      console.error('Error generating date range in useEffect:', error);
      const today = new Date();
      currentDateRange = eachDayOfInterval({
        start: startOfMonth(today),
        end: endOfMonth(today),
      });
    }
    
    setLoading(true);
    
    employeeService
      .getAll({
        organizationId,
        page: 1,
        limit: 1000,
        employeeStatus: 'ACTIVE',
      })
      .then((res) => {
        let filtered = res.employees || [];
        
        // Filter by associate IDs if provided - only show selected associates
        if (selectedAssociateIds.length > 0) {
          filtered = filtered.filter((emp) => selectedAssociateIds.includes(emp.id));
        }
        
        console.log('Selected associate IDs:', selectedAssociateIds);
        console.log('Filtered employees count:', filtered.length);
        console.log('Filtered employees:', filtered.map(e => `${fullName(e)} (${e.employeeCode})`));
        
        setEmployees(filtered);
        
        // Preserve existing shift assignments, only initialize new ones
        setShiftAssignments((prevAssignments) => {
          const newAssignments = new Map(prevAssignments);
          const defaultShift = shifts && shifts.length > 0 ? shifts[0].name : 'General Shift';
          
          filtered.forEach((emp) => {
            currentDateRange.forEach((date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const key = `${emp.id}-${dateStr}`;
              
              // Only initialize if assignment doesn't exist (preserve existing assignments)
              if (!newAssignments.has(key)) {
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                newAssignments.set(key, {
                  employeeId: emp.id,
                  date: dateStr,
                  shiftName: isWeekend ? 'W' : defaultShift,
                  isWeekOff: isWeekend,
                });
              }
            });
          });
          
          // Save initial state for comparison (only on first load)
          setInitialAssignments(new Map(newAssignments));
          
          return newAssignments;
        });
        
        // Reset page to 1 when data changes
        setPage(1);
      })
      .catch((error) => {
        console.error('Error fetching employees:', error);
        setEmployees([]);
      })
      .finally(() => setLoading(false));
  }, [organizationId, currentMonth, selectedAssociateIds.join(','), shifts.length]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleClose = () => {
    navigate('/time-attendance/associate-shift-change');
  };

  const handleSave = async () => {
    if (!organizationId) {
      alert('Organization ID is missing');
      return;
    }

    // Only save assignments that have been changed from initial state
    const changedAssignments: Array<{ employeeId: string; date: string; shiftName: string }> = [];
    
    shiftAssignments.forEach((assignment, key) => {
      const initialAssignment = initialAssignments.get(key);
      
      // Include if:
      // 1. Assignment doesn't exist in initial state (new)
      // 2. Shift name has changed from initial state
      if (!initialAssignment || initialAssignment.shiftName !== assignment.shiftName) {
        changedAssignments.push({
          employeeId: assignment.employeeId,
          date: assignment.date,
          shiftName: assignment.shiftName,
        });
      }
    });

    if (changedAssignments.length === 0) {
      alert('No changes to save.');
      return;
    }

    setSaving(true);
    try {
      console.log('Saving changed shift assignments:', changedAssignments);
      console.log(`Total assignments: ${shiftAssignments.size}, Changed: ${changedAssignments.length}`);

      const result = await attendanceService.bulkUpdateShiftAssignments(
        organizationId,
        changedAssignments
      );

      console.log('Shift assignments saved:', result);

      // Show detailed error messages
      const errorResults = result.results.filter(r => r.status === 'error');
      const successCount = result.summary.successful;
      const errorCount = result.summary.errors;
      const skippedCount = result.summary.skipped;

      if (errorCount > 0) {
        const errorMessages = errorResults.map(r => 
          `${r.date}: ${r.message || 'Unknown error'}`
        ).join('\n');
        alert(`Shift assignments saved with ${errorCount} error(s):\n\n${errorMessages}\n\nPlease check the console for details.`);
      } else {
        const message = `Shift assignments saved successfully!\n${successCount} assignment(s) updated.${skippedCount > 0 ? `\n${skippedCount} week off(s) skipped.` : ''}`;
        alert(message);
        
        // Update initial assignments to reflect saved state
        setInitialAssignments(new Map(shiftAssignments));
      }
    } catch (error: any) {
      console.error('Error saving shift assignments:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to save shift assignments';
      alert(`Failed to save shift assignments: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const updateShiftAssignment = (employeeId: string, date: string, shiftName: string) => {
    const key = `${employeeId}-${date}`;
    setShiftAssignments((prev) => {
      const newMap = new Map(prev);
      newMap.set(key, {
        employeeId,
        date,
        shiftName,
        isWeekOff: shiftName === 'W',
      });
      return newMap;
    });
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const name = fullName(emp).toLowerCase();
    const code = emp.employeeCode.toLowerCase();
    return name.includes(searchLower) || code.includes(searchLower);
  });

  const paginatedEmployees = filteredEmployees.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredEmployees.length / pageSize);

  const getShiftAssignment = (employeeId: string, date: Date): ShiftAssignment | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const key = `${employeeId}-${dateStr}`;
    return shiftAssignments.get(key) || null;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-50">
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
          <Link to="/time-attendance/associate-shift-change" className="hover:text-gray-900">Associate Shift Change</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Associate Shift</span>
        </nav>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Header Section */}
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-600">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-white">Associate Shift</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const prevMonth = new Date(currentMonth);
                      prevMonth.setMonth(prevMonth.getMonth() - 1);
                      setCurrentMonth(prevMonth);
                    }}
                    className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-white"
                  >
                    ←
                  </button>
                  <div className="bg-white px-4 py-2 rounded text-sm font-medium text-blue-600">
                    {format(currentMonth, 'MMMM yyyy')}
                  </div>
                  <button
                    onClick={() => {
                      const nextMonth = new Date(currentMonth);
                      nextMonth.setMonth(nextMonth.getMonth() + 1);
                      setCurrentMonth(nextMonth);
                    }}
                    className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-white"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">W - Week Off</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">W</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Search:</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by name or code..."
                    className="h-8 px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Print
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="relative">
                <table className="min-w-full divide-y divide-gray-200 border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-20">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300 sticky left-0 bg-gray-50 z-30 shadow-sm">
                        Associate Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300 sticky left-[140px] bg-gray-50 z-30 shadow-sm">
                        Associate Name
                      </th>
                      {dateRange.map((date) => (
                        <th
                          key={format(date, 'yyyy-MM-dd')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[140px] bg-gray-50"
                        >
                          <div className="font-semibold">{format(date, 'dd/MM/yyyy')}</div>
                          <div className="text-gray-600 font-normal mt-1">({format(date, 'EEE')})</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={dateRange.length + 2} className="px-4 py-8 text-center text-gray-500">
                          No associates found.
                        </td>
                      </tr>
                    ) : (
                      paginatedEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-300 sticky left-0 bg-white z-20 shadow-sm">
                            {emp.employeeCode}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300 sticky left-[140px] bg-white z-20 shadow-sm">
                            {fullName(emp)}
                          </td>
                          {dateRange.map((date) => {
                            const assignment = getShiftAssignment(emp.id, date);
                            // Use first shift from Shift Master as default, or 'W' if no shifts available
                            const defaultShift = shifts && shifts.length > 0 ? shifts[0].name : 'W';
                            const shiftName = assignment?.shiftName || defaultShift;
                            const isWeekOff = assignment?.isWeekOff || false;
                            const dateStr = format(date, 'yyyy-MM-dd');
                            
                            // Debug: Log shifts array when rendering first dropdown
                            if (emp.id === paginatedEmployees[0]?.id && dateStr === format(dateRange[0], 'yyyy-MM-dd')) {
                              console.log('🔍 Rendering dropdown - shifts array:', shifts);
                              console.log('🔍 Rendering dropdown - shifts count:', shifts?.length || 0);
                              console.log('🔍 Rendering dropdown - shift names:', shifts.map(s => s.name));
                            }

                            return (
                              <td
                                key={dateStr}
                                className="px-2 py-2 text-center border-r border-gray-300 bg-white"
                              >
                                <select
                                  value={isWeekOff ? 'W' : shiftName}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    if (newValue === 'W') {
                                      updateShiftAssignment(emp.id, dateStr, 'W');
                                    } else {
                                      updateShiftAssignment(emp.id, dateStr, newValue);
                                    }
                                  }}
                                  className={`w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    isWeekOff ? 'bg-green-100 text-green-800 font-medium' : 'bg-white text-gray-900'
                                  }`}
                                >
                                  {/* Week Off option - always first */}
                                  <option value="W">W</option>
                                  {/* Shift Master options - dynamically loaded from Shift Master */}
                                  {/* Display only Shift Name from Shift Master List - NO STATIC VALUES */}
                                  {shifts.map((shift) => (
                                    <option key={shift.id} value={shift.name}>
                                      {shift.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Section */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </button>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Show</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <label className="text-sm text-gray-700">entries</label>
                </div>
                <div className="text-sm text-gray-700">
                  Showing {paginatedEmployees.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
                  {Math.min(page * pageSize, filteredEmployees.length)} of {filteredEmployees.length} entries
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium">{page}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
