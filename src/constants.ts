import { RMA, Supplier, Product, Customer } from "./types";

export const MOCK_RMAS: RMA[] = [
  {
    id: "RMA#1/2026",
    customerId: "mock-cust-1",
    clientName: "Global Logistics Corp.",
    status: "Recebida",
    warranty: "Ativa",
    dateCreated: "12 de Jan, 2026",
    equipment: "Switch Industrial GX4",
    serialNumber: "SN-4492-X12",
  },
  {
    id: "RMA#2/2026",
    customerId: "mock-cust-2",
    clientName: "SkyTech Solutions",
    status: "Em Análise",
    warranty: "Expirada",
    dateCreated: "14 de Jan, 2026",
    equipment: "Core Router v2.1",
    serialNumber: "SN-9921-A90",
  },
  {
    id: "RMA#3/2026",
    customerId: "mock-cust-3",
    clientName: "NexGen Media",
    status: "Concluída",
    warranty: "Ativa",
    dateCreated: "15 de Jan, 2026",
    equipment: "Módulo de Fibra X-500",
    serialNumber: "SN-2281-Z04",
  },
  {
    id: "RMA#4/2026",
    customerId: "mock-cust-4",
    clientName: "Apex Peak Industries",
    status: "Pendente Fornecedor",
    warranty: "Ativa",
    dateCreated: "16 de Jan, 2026",
    equipment: "Bridge Sem Fios Pro",
    serialNumber: "SN-7711-K82",
  },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: "1", name: "Global Tech Inc.", contact: "John Smith", email: "john@globaltech.com", activeRMAs: 42, initials: "GT" },
  { id: "2", name: "Silicon Core Co.", contact: "Sarah Lee", email: "s.lee@siliconcore.io", activeRMAs: 15, initials: "SC" },
  { id: "3", name: "Vertex Logistics", contact: "Mike Ross", email: "m.ross@vertex.net", activeRMAs: 8, initials: "VL" },
  { id: "4", name: "Pinnacle Parts", contact: "Emma Wilson", email: "emma.w@pinnacle.com", activeRMAs: 27, initials: "PP" },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: "PRD-10294", name: "iPhone 15 Pro Max", brand: "Apple", serialRequired: true },
  { id: "PRD-10385", name: "Smart TV 65\" Ultra-HD", brand: "Samsung", serialRequired: true },
  { id: "PRD-98271", name: "Filtro de Ar de Substituição", brand: "EcoFlow", serialRequired: false },
  { id: "PRD-55012", name: "Berbequim Industrial", brand: "Bosch", serialRequired: true },
];

export const MOCK_CUSTOMER: Customer = {
  id: "CUST-88291",
  name: "OmniSystems",
  type: "Empresarial",
  contact: "John Doe",
  email: "contact@omnisystems.com",
};
