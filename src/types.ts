export interface Stat {
  label: string;
  value: string | number;
  change: string;
  trend: "up" | "down" | "stable";
  icon: string;
}

export interface RMAItem {
  id: string;
  rmaId?: string;
  productId: string;
  productName?: string;
  productReference?: string;
  quantity: number;
  serialNumber?: string;
  faultDescription?: string;
  repairDescription?: string;
  repairStatus?: string;
  warranty: "Ativa" | "Expirada";
}

export interface RMA {
  id: string;
  customerId: string;
  clientName?: string;
  supplierId?: string;
  supplierName?: string;
  status: string;
  supplierStatus?: string;
  isSupplierActive?: boolean;
  supplierCreditNote?: string;
  supplierResolutionNote?: string;
  odooDoc?: string;
  seqNumber?: number;
  year?: number;
  dateCreated: string;
  updatedAt?: string;
  items?: RMAItem[];
  customers?: { name: string };
  suppliers?: { name: string };
  rma_items?: any[]; // For raw Supabase response if needed
  
  // Derived properties for UI compatibility
  equipment?: string;
  productReference?: string;
  itemsCount?: number;
  serialNumber?: string;
  repairDescription?: string;
  repairStatus?: string;
  warranty?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  activeRMAs: number;
  initials: string;
}

export interface Product {
  id: string;
  name: string;
  reference?: string;
  brand: string;
  serialRequired: boolean;
  supplierId?: string;
  supplierName?: string;
}

export interface Customer {
  id: string;
  name: string;
  type: "Empresarial" | "Padrão" | "Cliente Final";
  contact: string;
  email: string;
}

export interface RMAStatus {
  id: string;
  name: string;
  color: string;
  category: "client" | "supplier";
  description?: string;
}
