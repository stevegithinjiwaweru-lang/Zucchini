import React, { useMemo, useState } from "react";
import OrdersHeader from "./OrdersHeader";
import OrdersStatusTabs from "./OrdersStatusTabs";
import OrdersFilters from "./OrdersFilters";
import SummaryCards from "./SummaryCards";
import BulkActionsToolbar from "./BulkActionsToolbar";
import OrdersTable from "./OrdersTable"; // reuse existing table component in same folder
import AssignRiderModal from "./AssignRiderModal";
import RemoveRiderDialog from "./RemoveRiderDialog";
import "./orders-page.css";

const OrdersPage: React.FC = () => {
  const [filters, setFilters] = useState<any>({ page: 1, limit: 25 });
  const [statusTab, setStatusTab] = useState<string | null>("NEW");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const handleFilterChange = (patch: any) => setFilters((f: any) => ({ ...f, ...patch, page: 1 }));

  // when statusTab changes, set filters.status accordingly
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (statusTab && statusTab !== "ALL") f.status = statusTab;
    else delete f.status;
    return f;
  }, [filters, statusTab]);

  return (
    <div className="orders-page">
      <OrdersHeader />

      <div className="orders-top-row">
        <OrdersStatusTabs value={statusTab} onChange={(v: string) => setStatusTab(v)} />
        <div style={{ flex: 1 }}>
          <OrdersFilters filters={effectiveFilters} onChange={handleFilterChange} />
          <SummaryCards filters={effectiveFilters} />
        </div>
      </div>

      <BulkActionsToolbar
        selectedIds={selectedOrderIds}
        onRefresh={() => {
          // OrdersTable uses react-query; it will refresh when actions complete via query invalidation
        }}
      />

      <div className="orders-table-wrap">
        <OrdersTable
          filters={effectiveFilters}
          onSelectionChange={(ids: string[]) => setSelectedOrderIds(ids)}
          selectedRowKeys={selectedOrderIds}
        />
      </div>

      <AssignRiderModal selectedOrderIds={selectedOrderIds} />
      <RemoveRiderDialog selectedOrderIds={selectedOrderIds} />
    </div>
  );
};

export default OrdersPage;
