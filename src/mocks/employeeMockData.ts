export interface MockEmployee {
  id: string;
  name: string;
  role?: string;
  staffDiscount?: number;
  color?: string;
}

export const MOCK_EMPLOYEES: MockEmployee[] = [
  {
    id: 'emp-master',
    name: 'Master Terminal',
    role: 'Master Terminal',
    staffDiscount: 0,
    color: '#4f46e5',
  },
  {
    id: 'emp-manager-term',
    name: 'Manager Terminal',
    role: 'Manager Terminal',
    staffDiscount: 20,
    color: '#0ea5e9',
  },
  {
    id: 'emp-akhil',
    name: 'Akhil Maratha',
    role: 'Staff',
    staffDiscount: 0,
    color: '#4ade80',
  },
  {
    id: 'emp-priya',
    name: 'Priya Patel',
    role: 'Staff',
    staffDiscount: 15,
    color: '#f97316',
  },
  {
    id: 'emp-james',
    name: 'James Wilson',
    role: 'Staff',
    staffDiscount: 10,
    color: '#e11d48',
  },
  {
    id: 'emp-sarah',
    name: 'Sarah Chen',
    role: 'Staff',
    staffDiscount: 20,
    color: '#a855f7',
  },
];

export function getMockEmployeeById(id: string): MockEmployee | undefined {
  return MOCK_EMPLOYEES.find((emp) => emp.id === id);
}
