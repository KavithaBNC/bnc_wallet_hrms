import React, { useEffect, useState } from 'react';
import { useDepartmentStore } from '../../store/departmentStore';
<<<<<<< Updated upstream
import { useEmployeeStore } from '../../store/employeeStore';
import { Department } from '../../services/department.service';
=======
import departmentService, { Department } from '../../services/department.service';
>>>>>>> Stashed changes

interface DepartmentFormProps {
  department?: Department | null;
  organizationId: string;
  onSuccess?: (createdDepartment?: Department) => void;
  onCancel?: () => void;
}

const DepartmentForm: React.FC<DepartmentFormProps> = ({
  department,
  organizationId,
  onSuccess,
  onCancel,
}) => {
  const { departments, fetchDepartments, createDepartment, updateDepartment, loading } = useDepartmentStore();
  const { employees, fetchEmployees } = useEmployeeStore();

  const [formData, setFormData] = useState({
    name: department?.name || '',
<<<<<<< Updated upstream
    code: department?.code || '',
    description: department?.description || '',
    parentDepartmentId: department?.parentDepartmentId || '',
    managerId: department?.managerId || '',
    costCenter: department?.costCenter || '',
    location: department?.location || '',
    isActive: department?.isActive !== undefined ? department.isActive : true,
=======
>>>>>>> Stashed changes
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch departments for parent selection
    fetchDepartments(organizationId);
    // Fetch employees for manager selection
    fetchEmployees({ organizationId, employeeStatus: 'ACTIVE' });
  }, [organizationId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Department name is required';
    }

    // Prevent self-referencing parent
    if (department && formData.parentDepartmentId === department.id) {
      newErrors.parentDepartmentId = 'Department cannot be its own parent';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    if (!validate()) {
      console.log('DepartmentForm validation failed');
      return;
    }

    const trimmedName = formData.name.trim();

    // Duplicate name check: same department name must not exist in this organization
    try {
      const { departments } = await departmentService.getAll({
        organizationId,
        limit: 500,
        listView: true,
      });
      const existingList = departments || [];
      const isDuplicate = existingList.some(
        (d) =>
          d.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
          (!department || d.id !== department.id)
      );
      if (isDuplicate) {
        setErrors({ name: 'A department with this name already exists. Please use a different name.' });
        return;
      }
    } catch (err) {
      console.error('Error checking duplicate department:', err);
      // Continue with create/update if check fails (e.g. network); backend may still enforce uniqueness
    }

    try {
      const submitData = {
        organizationId,
<<<<<<< Updated upstream
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        description: formData.description.trim() || undefined,
        parentDepartmentId: formData.parentDepartmentId || null,
        managerId: formData.managerId || null,
        costCenter: formData.costCenter.trim() || undefined,
        location: formData.location.trim() || undefined,
        isActive: formData.isActive,
=======
        name: trimmedName,
        isActive: true,
>>>>>>> Stashed changes
      };

      console.log('Creating department with data:', submitData);
      let createdDepartment: Department | undefined;
      if (department) {
        createdDepartment = await updateDepartment(department.id, submitData);
        console.log('Department updated:', createdDepartment);
      } else {
        createdDepartment = await createDepartment(submitData);
        console.log('Department created:', createdDepartment);
      }

      if (createdDepartment && onSuccess) {
        console.log('Calling onSuccess with department:', createdDepartment);
        onSuccess(createdDepartment);
      } else {
        console.error('Department creation failed or onSuccess not provided');
      }
    } catch (error: any) {
      console.error('Error creating/updating department:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save department';
      setErrors({ submit: errorMessage });
    }
  };

  // Filter out current department from parent options (can't be its own parent)
  const availableParentDepartments = departments.filter(d => d.id !== department?.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
<<<<<<< Updated upstream
      {/* Name */}
      <div>
=======
      <div>
        {/* Department Name */}
>>>>>>> Stashed changes
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Department Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`mt-1 block w-full h-10 bg-white text-black rounded-md border shadow-sm sm:text-sm ${
            errors.name
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500'
              : 'border-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          }`}
          placeholder="e.g., Engineering, Sales, HR"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
<<<<<<< Updated upstream
      </div>

      {/* Code */}
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Department Code
        </label>
        <input
          type="text"
          id="code"
          name="code"
          value={formData.code}
          onChange={handleChange}
          className="mt-1 block w-full h-10 bg-white text-black rounded-md border border-black shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="e.g., ENG, SAL, HR"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full min-h-[2.5rem] bg-white text-black rounded-md border border-black shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Brief description of the department's purpose and responsibilities"
        />
      </div>

      {/* Parent Department */}
      <div>
        <label htmlFor="parentDepartmentId" className="block text-sm font-medium text-gray-700">
          Parent Department
        </label>
        <select
          id="parentDepartmentId"
          name="parentDepartmentId"
          value={formData.parentDepartmentId}
          onChange={handleChange}
          className={`mt-1 block w-full h-10 bg-white text-black rounded-md border shadow-sm sm:text-sm ${
            errors.parentDepartmentId
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500'
              : 'border-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          }`}
        >
          <option value="">None (Top-level department)</option>
          {availableParentDepartments.map(dept => (
            <option key={dept.id} value={dept.id}>
              {dept.name} {dept.code ? `(${dept.code})` : ''}
            </option>
          ))}
        </select>
        {errors.parentDepartmentId && (
          <p className="mt-1 text-sm text-red-600">{errors.parentDepartmentId}</p>
        )}
      </div>

      {/* Manager */}
      <div>
        <label htmlFor="managerId" className="block text-sm font-medium text-gray-700">
          Department Manager
        </label>
        <select
          id="managerId"
          name="managerId"
          value={formData.managerId}
          onChange={handleChange}
          className="mt-1 block w-full h-10 bg-white text-black rounded-md border border-black shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">Select a manager</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.firstName} {emp.lastName} ({emp.employeeCode})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cost Center */}
        <div>
          <label htmlFor="costCenter" className="block text-sm font-medium text-gray-700">
            Cost Center
          </label>
          <input
            type="text"
            id="costCenter"
            name="costCenter"
            value={formData.costCenter}
            onChange={handleChange}
            className="mt-1 block w-full h-10 bg-white text-black rounded-md border border-black shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g., CC-001"
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="mt-1 block w-full h-10 bg-white text-black rounded-md border border-black shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g., Building A, Floor 3"
          />
        </div>
      </div>

      {/* Is Active */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
          className="h-4 w-4 rounded border-black text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
          Active Department
        </label>
=======
>>>>>>> Stashed changes
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-black rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : department ? 'Update Department' : 'Create Department'}
        </button>
      </div>
    </form>
  );
};

export default DepartmentForm;
