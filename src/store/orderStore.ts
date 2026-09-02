import {create} from 'zustand';
import type {OrderContext} from '../types/orderContext';

interface OrderState {
  orderContext: OrderContext | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  dirty: boolean;
  remoteUpdatePending: boolean;
  sessionScopeKey: string | null;
  setOrderContext: (context: OrderContext | null) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setRemoteUpdatePending: (pending: boolean) => void;
  setSessionScopeKey: (key: string | null) => void;
  reset: () => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orderContext: null,
  loading: false,
  saving: false,
  error: null,
  dirty: false,
  remoteUpdatePending: false,
  sessionScopeKey: null,
  setOrderContext: (context) => set({orderContext: context}),
  setLoading: (loading) => set({loading}),
  setSaving: (saving) => set({saving}),
  setError: (error) => set({error}),
  setDirty: (dirty) => set({dirty}),
  setRemoteUpdatePending: (pending) => set({remoteUpdatePending: pending}),
  setSessionScopeKey: (key) => set({sessionScopeKey: key}),
  reset: () =>
    set({
      orderContext: null,
      loading: false,
      saving: false,
      error: null,
      dirty: false,
      remoteUpdatePending: false,
      sessionScopeKey: null,
    }),
}));
