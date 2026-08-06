import React from "react";
import { Row, Col, Input, DatePicker, Select } from "antd";
import { useQuery } from "@tanstack/react-query";
import client from "../../api/client";

const { RangePicker } = DatePicker;

const OrderFilters: React.FC<{ filters: any; onChange: (patch: any) => void }> = ({ filters, onChange }) => {
  const { data: merchantsData } = useQuery({ queryKey: ["merchants"], queryFn: async () => { try { return (await client.get('/merchants')).data; } catch { return []; } } });
  const { data: ridersData } = useQuery({ queryKey: ["riders"], queryFn: async () => (await client.get('/riders', { params: { limit: 200 } })).data });

  const merchants = merchantsData?.items || merchantsData || [];
  const riders = ridersData?.items || ridersData || [];

  return (
    <div>
      <Row gutter={8}>
        <Col sm={24} md={8}>
          <Input placeholder="Search" defaultValue={filters.q} onChange={(e) => onChange({ q: e.target.value })} />
        </Col>
        <Col sm={12} md={8}>
          <Select allowClear placeholder="Merchant (Zucchini)" style={{ width: "100%" }} onChange={(v) => onChange({ merchantId: v })} value={filters.merchantId}>
            {merchants.map((m: any) => (<Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>))}
          </Select>
        </Col>
        <Col sm={12} md={8}>
          <Select allowClear placeholder="Rider" style={{ width: "100%" }} onChange={(v) => onChange({ riderId: v })} value={filters.riderId}>
            {riders.map((r: any) => (<Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>))}
          </Select>
        </Col>
        <Col span={24} style={{ marginTop: 8 }}>
          <RangePicker style={{ width: "100%" }} onChange={(dates, dateStrings) => onChange({ from: dateStrings[0], to: dateStrings[1] })} />
        </Col>
      </Row>
    </div>
  );
};

export default OrderFilters;
