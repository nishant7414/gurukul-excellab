import { defineDataset as ds } from "./define";
import { cols, type Dataset } from "./types";
import { D, dateIn, pad } from "./rng";
import type { Scalar } from "../engine/types";
import { SUPPLIERS, WAREHOUSES, products } from "./masters";

const skus = () => products().map((p) => p.id);

export const SUPPLY_DATASETS: Dataset[] = [
  ds({
    id: "DS-INV-SUPPLIERS", alias: "suppliers", sheet: "Suppliers", title: "Supplier catalogue", category: "Inventory and Supply Chain", tier: "Easy", rowCount: 15, related: ["DS-INV-PO", "DS-INV-DELIVERY"],
    description: "15 suppliers with a code, category and typical lead time in days.",
    topics: ["Supplier catalogs"], concepts: ["LK", "DA", "SF", "CA"],
    columns: cols([["code", "Supplier code", "id"], ["name", "Supplier", "text"], ["cat", "Category", "text"], ["lead", "Lead time (days)", "number"]]),
    gen: () => SUPPLIERS.map(([c, n, cat, l]) => [c, n, cat, l]),
  }),
  ds({
    id: "DS-INV-WAREHOUSES", alias: "wh", sheet: "Warehouses", title: "Warehouse master", category: "Inventory and Supply Chain", tier: "Easy", rowCount: 5, related: ["DS-INV-STOCK"],
    description: "Five warehouses with code, city, nickname and storage capacity (pallets).",
    topics: ["Multi-warehouse inventory", "Warehouse stock"], concepts: ["LK"],
    columns: cols([["code", "Warehouse", "id"], ["city", "City", "text"], ["name", "Name", "text"], ["capacity", "Capacity (pallets)", "number"]]),
    gen: () => WAREHOUSES.map(([c, city, n], i) => [c, city, n, [800, 650, 500, 720, 400][i]]),
  }),
  ds({
    id: "DS-INV-STOCK", alias: "stock", sheet: "Stock", title: "Warehouse stock levels", category: "Inventory and Supply Chain", tier: "Medium", rowCount: 75, related: ["DS-SAL-PRODUCTS", "DS-INV-WAREHOUSES"],
    description: "Stock of 25 products across 3 of the 5 warehouses: quantity on hand, reorder level and unit cost.",
    topics: ["Warehouse stock", "Reorder alerts", "Inventory and reorder levels"], concepts: ["LK", "LG", "CA", "SF", "CS", "FIN"],
    columns: cols([["sku", "Product ID", "id"], ["wh", "Warehouse", "id"], ["onhand", "On hand", "number"], ["reorder", "Reorder level", "number"], ["cost", "Unit cost", "currency"], ["updated", "Last counted", "date"]]),
    gen: (r) => skus().flatMap((id, pi) => ["WH-N", "WH-S", "WH-W"].map((w) => { const lvl = r.int(15, 60); const p = products()[pi]; return [id, w, r.chance(0.3) ? Math.max(0, lvl - r.int(5, 50)) : lvl + r.int(0, 140), lvl, p.cost, dateIn(r, D(2025, 9, 1), 28)]; })),
  }),
  ds({
    id: "DS-INV-PO", alias: "po", sheet: "PurchaseOrders", title: "Purchase orders", category: "Inventory and Supply Chain", tier: "Medium", rowCount: 120, related: ["DS-INV-SUPPLIERS", "DS-INV-GRN"],
    description: "120 purchase orders with supplier, product, ordered quantity, unit cost and dates.",
    topics: ["Purchase orders"], concepts: ["LK", "CA", "DT", "CS", "FIN", "LG"],
    columns: cols([["no", "PO No", "id"], ["supplier", "Supplier code", "id"], ["sku", "Product ID", "id"], ["qty", "Qty ordered", "number"], ["cost", "Unit cost", "currency"], ["ordered", "Ordered on", "date"], ["expected", "Expected on", "date"]]),
    gen: (r) => Array.from({ length: 120 }, (_, i) => { const o = D(2025, 1, 6) + Math.floor(i * 2.1); const sup = SUPPLIERS[r.int(0, 14)]; return [`PO${pad(i + 1, 4)}`, sup[0], r.pick(skus()), r.pick([50, 100, 150, 200, 250, 500]), r.money(40, 1800, 5), o, o + sup[3] + r.int(0, 2)]; }),
  }),
  ds({
    id: "DS-INV-GRN", alias: "grn", sheet: "GoodsReceived", title: "Goods received notes", category: "Inventory and Supply Chain", tier: "Medium", rowCount: 110, related: ["DS-INV-PO"],
    description: "110 receipts against the 120 purchase orders (10 are still open): received date, quantity received and damaged units.",
    topics: ["Goods received records", "Delivery performance"], concepts: ["LK", "LG", "DT", "CS", "CA"],
    columns: cols([["grn", "GRN", "id"], ["po", "PO No", "id"], ["received", "Received on", "date"], ["qty", "Qty received", "number"], ["damaged", "Damaged", "number"]]),
    gen: (r) => { const po = DS_PO_ROWS(); return Array.from({ length: 110 }, (_, i) => { const row = po[i]; const qty = r.chance(0.8) ? row[3] as number : Math.round((row[3] as number) * r.money(0.7, 0.98, 0.01)); return [`GRN${pad(i + 1, 4)}`, row[0], (row[6] as number) + r.weighted([-1, 0, 1, 3, 6], [2, 6, 3, 2, 1]), qty, r.weighted([0, 1, 2, 5], [12, 3, 2, 1])]; }); },
  }),
  ds({
    id: "DS-INV-MOVES", alias: "moves", sheet: "Movements", title: "Stock movement ledger", category: "Inventory and Supply Chain", tier: "Hard", rowCount: 1000, related: ["DS-INV-STOCK"],
    description: "1,000 stock movements (receipts IN, issues OUT, adjustments ADJ) across products and warehouses.",
    topics: ["Stock movement"], concepts: ["CA", "DT", "DA", "CS", "LG"],
    columns: cols([["id", "Move ID", "id"], ["date", "Date", "date"], ["sku", "Product ID", "id"], ["wh", "Warehouse", "id"], ["type", "Type", "text"], ["qty", "Quantity", "number"]]),
    gen: (r) => Array.from({ length: 1000 }, (_, i) => { const t = r.weighted(["IN", "OUT", "ADJ"], [4, 7, 1]); return [`M${pad(i + 1, 5)}`, D(2025, 7, 1) + Math.floor(i * 0.12), r.pick(skus()), r.pick(["WH-N", "WH-S", "WH-W"]), t, t === "ADJ" ? r.int(-6, 6) : t === "IN" ? r.int(20, 200) : r.int(1, 60)]; }),
  }),
  ds({
    id: "DS-INV-DELIVERY", alias: "delivery", sheet: "Deliveries", title: "Supplier delivery performance", category: "Inventory and Supply Chain", tier: "Medium", rowCount: 150, related: ["DS-INV-SUPPLIERS"],
    description: "150 supplier deliveries with promised and actual dates and quantity delivered.",
    topics: ["Delivery performance"], concepts: ["CA", "LG", "DT", "FIN", "CS"],
    columns: cols([["id", "Delivery ID", "id"], ["supplier", "Supplier code", "id"], ["promised", "Promised", "date"], ["actual", "Delivered", "date"], ["qty", "Qty", "number"]]),
    gen: (r) => Array.from({ length: 150 }, (_, i) => { const p = dateIn(r, D(2025, 3, 1), 200); return [`DL${pad(i + 1, 4)}`, SUPPLIERS[r.int(0, 14)][0], p, p + r.weighted([-1, 0, 1, 2, 4, 7], [2, 8, 4, 3, 2, 1]), r.pick([40, 80, 120, 200, 300])]; }),
  }),
  ds({
    id: "DS-INV-EXPIRY", alias: "expiry", sheet: "Batches", title: "Product expiry tracking", category: "Inventory and Supply Chain", tier: "Medium", rowCount: 80, related: ["DS-SAL-PRODUCTS"],
    description: "80 batches of perishable stock with manufacturing date, expiry date and quantity on hand.",
    topics: ["Product expiry tracking"], concepts: ["DT", "LG", "CA", "SF", "DA"],
    columns: cols([["batch", "Batch", "id"], ["sku", "Product ID", "id"], ["mfg", "Manufactured", "date"], ["expiry", "Expiry", "date"], ["qty", "Quantity", "number"]]),
    gen: (r) => Array.from({ length: 80 }, (_, i) => { const m = dateIn(r, D(2025, 3, 1), 240); return [`B${pad(i + 1, 4)}`, r.pick(["P021", "P022", "P023", "P024", "P025", "P011", "P012"]), m, m + r.pick([120, 180, 270, 365]), r.int(10, 240)]; }),
  }),
  ds({
    id: "DS-INV-MULTIWH", alias: "multiwh", sheet: "MultiWarehouse", title: "Multi-warehouse inventory matrix", category: "Inventory and Supply Chain", tier: "Medium", rowCount: 25, related: ["DS-INV-STOCK"],
    description: "25 products x 4 warehouse columns (a wide table) with a company-wide reorder level.",
    topics: ["Multi-warehouse inventory"], concepts: ["SM", "LG", "LK", "CA"],
    columns: cols([["sku", "Product ID", "id"], ["n", "North", "number"], ["s", "South", "number"], ["e", "East", "number"], ["w", "West", "number"], ["reorder", "Company reorder level", "number"]]),
    gen: (r) => skus().map((id) => [id, r.int(0, 120), r.int(0, 120), r.int(0, 90), r.int(0, 140), r.pick([80, 100, 150, 200])]),
  }),
];

/** purchase orders (same seed => same data as DS-INV-PO) so goods-received notes quote real PO numbers */
function DS_PO_ROWS(): Scalar[][] { return SUPPLY_DATASETS.find((d) => d.id === "DS-INV-PO")!.rows(); }
