export interface UpcomingOfferItem {
  name: string;
  qty: number;
  price?: number;
  isOffer?: boolean;
  inclusions?: string[];
  choices?: string[];
  drinks?: string[];
  notes?: string;
}

export interface UpcomingOfferOrder {
  id?: string;
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  source?: string;
  partyName?: string;
  contactNumber?: string;
  guestEmail?: string | null;
  offerFulfillmentDate?: string | null;
  pickup?: {time?: string; date?: string} | null;
  specialNote?: string | null;
  totalAmount?: number;
  items?: UpcomingOfferItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UpcomingOfferCountResponse {
  success: boolean;
  message?: string;
  data?: {pendingCount: number};
}

export interface UpcomingOffersListResponse {
  success: boolean;
  message?: string;
  data?: UpcomingOfferOrder[];
}
