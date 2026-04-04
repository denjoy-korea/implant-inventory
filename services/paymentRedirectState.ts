export type PendingPaymentType = 'plan' | 'service';

export interface PendingPaymentRedirectState {
  orderId?: string | null;
  paymentType?: PendingPaymentType | null;
  serviceCartKey?: string | null;
}

const PENDING_ORDER_ID_KEY = '_pendingOrderId';
const PENDING_PAYMENT_TYPE_KEY = '_pendingPaymentType';
const PENDING_SERVICE_CART_KEY = '_pendingServiceCartKey';

function readSessionStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage unavailable
  }
}

function removeSessionStorage(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // sessionStorage unavailable
  }
}

export function getPendingPaymentRedirectState(): PendingPaymentRedirectState {
  const paymentType = readSessionStorage(PENDING_PAYMENT_TYPE_KEY);
  return {
    orderId: readSessionStorage(PENDING_ORDER_ID_KEY),
    paymentType: paymentType === 'plan' || paymentType === 'service' ? paymentType : null,
    serviceCartKey: readSessionStorage(PENDING_SERVICE_CART_KEY),
  };
}

export function storePendingPaymentRedirectState(state: PendingPaymentRedirectState) {
  if (state.orderId) {
    writeSessionStorage(PENDING_ORDER_ID_KEY, state.orderId);
  } else {
    removeSessionStorage(PENDING_ORDER_ID_KEY);
  }

  if (state.paymentType) {
    writeSessionStorage(PENDING_PAYMENT_TYPE_KEY, state.paymentType);
  } else {
    removeSessionStorage(PENDING_PAYMENT_TYPE_KEY);
  }

  if (state.serviceCartKey) {
    writeSessionStorage(PENDING_SERVICE_CART_KEY, state.serviceCartKey);
  } else {
    removeSessionStorage(PENDING_SERVICE_CART_KEY);
  }
}

export function clearPendingPaymentRedirectState() {
  removeSessionStorage(PENDING_ORDER_ID_KEY);
  removeSessionStorage(PENDING_PAYMENT_TYPE_KEY);
  removeSessionStorage(PENDING_SERVICE_CART_KEY);
}
