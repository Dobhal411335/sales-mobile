import {useEffect, useState} from 'react';
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
  }));
}

export function useStaffEmployees() {
  const [employees, setEmployees] = useState<SalesEmployee[]>(
  isEmployeeApiConfigured() ? [] : mockEmployeesAsSales(),
  );
  const [loading, setLoading] = useState(isEmployeeApiConfigured());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEmployeeApiConfigured()) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSalesEmployees()
      .then((rows) => {
        if (!cancelled) {
          setEmployees(rows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to load employees.',
          );
          setEmployees(mockEmployeesAsSales());
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {employees, loading, error};
}

export function getStaffEmployeeName(
  employees: SalesEmployee[],
  staffId: string,
): string {
  const employee = employees.find((emp) => emp.id === staffId);
  return employee?.name ?? 'Staff';
}
