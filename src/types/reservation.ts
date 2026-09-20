export type ReservationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'SEATED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type ReservationFilter =
  | 'PENDING'
  | 'ACCEPTED'
  | 'SEATED'
  | 'DONE'
  | 'ALL';

export type ReservationPatchAction =
  | 'accept'
  | 'decline'
  | 'seat'
  | 'no-show'
  | 'cancel';

export interface TableReservation {
  id: string;
  _id: string;
  guestName: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  guests: number;
  status: ReservationStatus;
  notes?: string;
  staffNote?: string;
  assignedTableNo?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReservationsResponse {
  success: boolean;
  message?: string;
  data?: TableReservation[];
}

export interface PendingCountResponse {
  success: boolean;
  message?: string;
  data?: {pendingCount: number};
}

export interface PatchReservationResponse {
  success: boolean;
  message?: string;
  data?: TableReservation;
}

export const RESERVATION_FILTERS: {
  id: ReservationFilter;
  label: string;
}[] = [
  {id: 'PENDING', label: 'Pending'},
  {id: 'ACCEPTED', label: 'Accepted'},
  {id: 'SEATED', label: 'Seated'},
  {id: 'DONE', label: 'Closed'},
  {id: 'ALL', label: 'All'},
];
