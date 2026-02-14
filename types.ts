
export interface ExcelRow {
  [key: string]: any;
}

export interface ExcelSheet {
  name: string;
  columns: string[];
  rows: ExcelRow[];
}

export interface ExcelData {
  sheets: Record<string, ExcelSheet>;
  activeSheetName: string;
}

export interface InventoryItem {
  id: string;
  manufacturer: string;
  brand: string;
  size: string;
  initialStock: number;
  usageCount: number;
  currentStock: number;
  recommendedStock: number;
  monthlyAvgUsage?: number;
  dailyMaxUsage?: number;
}

export type OrderType = 'replenishment' | 'fail_exchange';
export type OrderStatus = 'ordered' | 'received';

export interface OrderItem {
  brand: string;
  size: string;
  quantity: number;
}

export interface Order {
  id: string;
  type: OrderType;
  manufacturer: string;
  date: string;
  items: OrderItem[];
  manager: string;
  status: OrderStatus;
  receivedDate?: string;
}

// Deprecated in favor of Order, but kept for compatibility if needed
export interface FailOrder extends Order { }

export type UserRole = 'master' | 'dental_staff' | 'staff';

export interface Hospital {
  id: string;
  name: string;
  masterAdminId: string; // email of the master admin
  createdAt: string;
}

export interface User {
  email: string;
  name: string;
  role: UserRole;
  hospitalId: string;
  status?: 'pending' | 'active'; // New field for approval flow
}

export type View = 'landing' | 'login' | 'signup' | 'dashboard' | 'admin_panel' | 'pricing' | 'contact';
export type DashboardTab = 'overview' | 'fixture_upload' | 'fixture_edit' | 'inventory_master' | 'surgery_upload' | 'surgery_database' | 'fail_management' | 'order_management' | 'member_management';
export type UploadType = 'fixture' | 'surgery';

export interface ParsedSize {
  diameter: number | null;
  length: number | null;
  cuff: string | null;
  suffix: string | null;
  raw: string;
  matchKey: string;
}

export interface AppState {
  fixtureData: ExcelData | null;
  surgeryData: ExcelData | null;
  fixtureFileName: string | null;
  surgeryFileName: string | null;
  inventory: InventoryItem[];
  orders: Order[];
  surgeryMaster: Record<string, ExcelRow[]>;
  activeSurgerySheetName: string;
  selectedFixtureIndices: Record<string, Set<number>>;
  selectedSurgeryIndices: Record<string, Set<number>>;
  isLoading: boolean;
  user: User | null;
  currentView: View;
  dashboardTab: DashboardTab;
  isFixtureLengthExtracted: boolean;
  fixtureBackup: Record<string, { rows: ExcelRow[], columns: string[] }> | null;
}
