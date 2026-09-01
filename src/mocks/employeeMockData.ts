export interface MockEmployee {
  id: string;
  name: string;
  role?: string;
  staffDiscount?: number;
}

export const MOCK_EMPLOYEES: MockEmployee[] = [
  {
    id: 'emp-akhil',
    name: 'Akhil Maratha',
    role: 'Server',
    staffDiscount: 0,
  },
  {
    id: 'emp-priya',
    name: 'Priya Patel',
    role: 'Server',
    staffDiscount: 15,
  },
  {
    id: 'emp-james',
    name: 'James Wilson',
    role: 'Kitchen',
    staffDiscount: 10,
  },
  {
    id: 'emp-sarah',
    name: 'Sarah Chen',
    role: 'Manager',
    staffDiscount: 20,
  },
];

export function getMockEmployeeById(id: string): MockEmployee | undefined {
  return MOCK_EMPLOYEES.find((emp) => emp.id === id);
}
