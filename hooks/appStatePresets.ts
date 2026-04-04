import { AppState, DEFAULT_WORK_DAYS, User } from '../types';

interface HospitalReadyStateParams {
  user: User;
  inventory: AppState['inventory'];
  surgeryMaster: AppState['surgeryMaster'];
  orders: AppState['orders'];
  planState: AppState['planState'];
  memberCount: number;
  hospitalName: string;
  hospitalMasterAdminId: string;
  hospitalWorkDays: number[];
  hospitalBillingProgram: AppState['hospitalBillingProgram'];
  hospitalBizFileUrl: AppState['hospitalBizFileUrl'];
  userCreditBalance?: number;
}

interface InventoryDataStateParams {
  inventory: AppState['inventory'];
  surgeryMaster: AppState['surgeryMaster'];
  orders: AppState['orders'];
  planState: AppState['planState'];
}

function getEmptyWorkspaceData(): Pick<AppState, 'fixtureData' | 'inventory' | 'orders' | 'surgeryMaster'> {
  return {
    fixtureData: null,
    inventory: [],
    orders: [],
    surgeryMaster: {},
  };
}

function getEmptyHospitalContext(): Pick<
  AppState,
  'planState'
  | 'memberCount'
  | 'hospitalName'
  | 'hospitalMasterAdminId'
  | 'hospitalWorkDays'
  | 'hospitalBillingProgram'
  | 'hospitalBizFileUrl'
> {
  return {
    planState: null,
    memberCount: 0,
    hospitalName: '',
    hospitalMasterAdminId: '',
    hospitalWorkDays: DEFAULT_WORK_DAYS,
    hospitalBillingProgram: null,
    hospitalBizFileUrl: null,
  };
}

export function buildPausedState(prev: AppState, user: User): AppState {
  return {
    ...prev,
    user,
    currentView: 'suspended',
    dashboardTab: 'overview',
    ...getEmptyWorkspaceData(),
    ...getEmptyHospitalContext(),
    isLoading: false,
  };
}

export function buildNoHospitalState(prev: AppState, user: User): AppState {
  return {
    ...prev,
    user,
    currentView: 'mypage',
    dashboardTab: 'overview',
    ...getEmptyWorkspaceData(),
    ...getEmptyHospitalContext(),
    isLoading: false,
  };
}

export function buildHospitalReadyState(prev: AppState, params: HospitalReadyStateParams): AppState {
  const {
    user,
    inventory,
    surgeryMaster,
    orders,
    planState,
    memberCount,
    hospitalName,
    hospitalMasterAdminId,
    hospitalWorkDays,
    hospitalBillingProgram,
    hospitalBizFileUrl,
    userCreditBalance,
  } = params;

  return {
    ...prev,
    user,
    currentView: 'mypage',
    dashboardTab: 'overview',
    inventory,
    surgeryMaster,
    orders,
    planState,
    memberCount,
    hospitalName,
    hospitalMasterAdminId,
    hospitalWorkDays,
    hospitalBillingProgram,
    hospitalBizFileUrl,
    userCreditBalance: userCreditBalance ?? prev.userCreditBalance ?? 0,
    isLoading: false,
  };
}

export function buildHospitalLoadFailureState(prev: AppState, user: User): AppState {
  return {
    ...prev,
    user,
    currentView: 'mypage',
    dashboardTab: 'overview',
    ...getEmptyWorkspaceData(),
    ...getEmptyHospitalContext(),
    isLoading: false,
  };
}

export function buildInventoryDataState(prev: AppState, params: InventoryDataStateParams): AppState {
  return {
    ...prev,
    planState: params.planState,
    inventory: params.inventory,
    surgeryMaster: params.surgeryMaster,
    orders: params.orders,
  };
}

export function buildSignedOutState(prev: AppState): AppState {
  return {
    ...prev,
    user: null,
    currentView: 'homepage',
    dashboardTab: 'overview',
    ...getEmptyWorkspaceData(),
    ...getEmptyHospitalContext(),
    showProfile: false,
    isLoading: false,
  };
}

export function buildLeaveHospitalState(prev: AppState, user: User): AppState {
  return {
    ...prev,
    user,
    currentView: 'mypage',
    dashboardTab: 'overview',
    ...getEmptyWorkspaceData(),
    ...getEmptyHospitalContext(),
    showProfile: false,
  };
}
