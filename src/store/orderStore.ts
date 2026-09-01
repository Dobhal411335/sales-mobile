import {create} from 'zustand';
import type {OrderContext} from '../types/cart';

interface OrderState {
  orderContext: OrderContext | null;
  loading: boolean;
  error: string | null;
  setOrderContext: (context: OrderContext | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orderContext: null,
  loading: false,
  error: null,
  setOrderContext: (context) => set({orderContext: context}),
  setLoading: (loading) => set({loading}),
  setError: (error) => set({error}),
  reset: () => set({orderContext: null, loading: false, error: null}),
}));
