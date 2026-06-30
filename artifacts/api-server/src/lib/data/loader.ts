import fs from "fs";
import path from "path";

const DATA_DIR = (() => {
  const cwd = process.cwd();
  const base = cwd.endsWith(path.join("artifacts", "api-server"))
    ? path.resolve(cwd, "../..")
    : cwd;
  return path.resolve(base, "artifacts/api-server/data");
})();

function loadJson<T>(filename: string): T {
  const filepath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filepath, "utf-8")) as T;
}

export interface InventoryItem {
  itemId: string;
  name: string;
  warehouse: string;
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  avgDailyDemand: number;
  daysOfSupply: number;
  unitCost: number;
  category: string;
  criticality: string;
}

export interface Supplier {
  supplierId: string;
  name: string;
  tier: number;
  reliabilityScore: number;
  avgLeadTimeDays: number;
  expeditedLeadTimeDays: number;
  currentStatus: string;
  delayReason: string | null;
  delayDays: number;
  categories: string[];
  contactEmail: string;
  contractValue: number;
  ytdIncidents: number;
  costIndex: number;
}

export interface Shipment {
  shipmentId: string;
  orderId: string;
  supplierId: string;
  status: string;
  origin: string;
  destination: string;
  carrier: string;
  dispatchDate: string;
  originalEta: string;
  currentEta: string;
  delayDays: number;
  delayReason: string | null;
  items: { itemId: string; quantity: number }[];
  totalValue: number;
  weatherRisk: string;
}

export interface Order {
  orderId: string;
  customerId: string;
  customerName: string;
  customerTier: string;
  orderDate: string;
  requiredDelivery: string;
  status: string;
  items: { itemId: string; quantity: number; unitPrice: number }[];
  totalValue: number;
  slaHours: number;
  notes: string | null;
}

export interface Warehouse {
  warehouseId: string;
  name: string;
  location: string;
  capacityPct: number;
  processingTimeDays: number;
  region: string;
}

let _inventory: InventoryItem[] | null = null;
let _suppliers: Supplier[] | null = null;
let _shipments: Shipment[] | null = null;
let _orders: Order[] | null = null;
let _warehouses: Warehouse[] | null = null;

export function getInventory(): InventoryItem[] {
  if (!_inventory) _inventory = loadJson<InventoryItem[]>("inventory.json");
  return _inventory;
}

export function getSuppliers(): Supplier[] {
  if (!_suppliers) _suppliers = loadJson<Supplier[]>("suppliers.json");
  return _suppliers;
}

export function getShipments(): Shipment[] {
  if (!_shipments) _shipments = loadJson<Shipment[]>("shipments.json");
  return _shipments;
}

export function getOrders(): Order[] {
  if (!_orders) _orders = loadJson<Order[]>("orders.json");
  return _orders;
}

export function getWarehouses(): Warehouse[] {
  if (!_warehouses) _warehouses = loadJson<Warehouse[]>("warehouses.json");
  return _warehouses;
}
