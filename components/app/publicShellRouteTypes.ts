import type {
  BillingCycle,
  HospitalPlanState,
  PlanType,
  User,
  View,
} from '../../types';

export interface InviteInfo {
  token: string;
  email: string;
  hospitalName: string;
  name: string;
}

export interface ConsultationPrefill {
  email: string;
  hospitalName?: string;
  region?: string;
  contact?: string;
}

export interface PaymentRequestHandler {
  (
    plan: PlanType,
    billing: BillingCycle,
    contactName: string,
    contactPhone: string,
    paymentMethod: 'card' | 'transfer',
    receiptType?: 'cash_receipt' | 'tax_invoice'
  ): Promise<boolean>;
}

export interface PlanSelectHandler {
  (plan: PlanType, billing: BillingCycle): Promise<void> | void;
}

export interface PublicShellRouteContentProps {
  currentView: View;
  user: User | null;
  hospitalName: string;
  isSystemAdmin: boolean;
  isLoggedIn: boolean;
  preSelectedPlan?: PlanType;
  planState: HospitalPlanState | null;
  userCreditBalance?: number;
  inviteInfo: InviteInfo | null;
  mfaPendingEmail?: string;
  consultationPrefill: ConsultationPrefill;
  onNavigate: (view: View) => void;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void | Promise<void>;
  onSetMfaPendingEmail: (email?: string) => void;
  onGetStartedWithPlan: (plan?: PlanType) => void;
  onGoToDenjoyLogin: () => void;
  onGoToDenjoySignup: (plan?: PlanType) => void;
  onHandleNavigate: (view: View) => void;
  onNavigateToCourse: (slug: string) => void;
  onProfileClick: () => void;
  onSetConsultationPrefill: React.Dispatch<React.SetStateAction<ConsultationPrefill>>;
  onPlanSelect?: PlanSelectHandler;
  onRequestPayment?: PaymentRequestHandler;
}
