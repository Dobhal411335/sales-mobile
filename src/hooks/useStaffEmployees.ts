import {useCallback, useEffect, useState} from 'react';
import {
  fetchSalesEmployees,
  isEmployeeApiConfigured,
  type SalesEmployee,
} from '../services/employeeService';
import {MOCK_EMPLOYEES} from '../mocks/employeeMockData';

function mockEmployeesAsSales(): SalesEmployee[] {
  return MOCK_EMPLOYEES.map((emp) => ({
    id: emp.id,
    name: emp.name,
    role: emp.role,
    staffDiscount: emp.staffDiscount,
    color: emp.color,
  }));
}

export function useStaffEmployees() {
  const [employees, setEmployees] = useState<SalesEmployee[]>(
    isEmployeeApiConfigured() ? [] : mockEmployeesAsSales(),
  );
  const [loading, setLoading] = useState(isEmployeeApiConfigured());
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    if (!isEmployeeApiConfigured()) {
      setEmployees(mockEmployeesAsSales());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSalesEmployees();
      setEmployees(rows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load employees.',
      );
      setEmployees(mockEmployeesAsSales());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  return {employees, loading, error, refresh: loadEmployees};
}

export function getStaffEmployeeName(
  employees: SalesEmployee[],
  staffId: string,
): string {
  const employee = employees.find((emp) => emp.id === staffId);
  return employee?.name ?? 'Staff';
}
