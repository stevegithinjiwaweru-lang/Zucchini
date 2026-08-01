import React from "react";
import { Card, Button, Tag, message, Spin } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";

const fetchMerchants = async () => {
  const { data } = await client.get("/merchants");

  console.log("MERCHANT RESPONSE:", data);

  return Array.isArray(data?.items) ? data.items : [];
};

// Accept common spellings used in seed/docs
const ZUCCHINI_NAMES = new Set(["zucchini", "zuchinni"]);

const Merchants: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: merchants = [], isLoading, isError, error } = useQuery({
    queryKey: ["merchants"],
    queryFn: fetchMerchants,
  });

  // Filter to Zucchini only
  const visibleMerchants = merchants.filter((m: any) => ZUCCHINI_NAMES.has((m?.name || "").toLowerCase()));

  const syncMerchant = async (id: string) => {
    try {
      await client.post(`/merchants/${id}/sync`);

      message.success("Merchant synced successfully");

      queryClient.invalidateQueries({
        queryKey: ["merchants"],
      });
    } catch (err: any) {
      console.error(err);

      message.error(err?.response?.data?.message || err?.response?.data?.error || "Sync failed");
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", marginTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 20 }}>
        <h3>Failed to load merchants</h3>

        <pre style={{ color: "red" }}>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div>
      <h2>Merchant Integration</h2>

      <div style={{ marginTop: 20 }}>
        {visibleMerchants.length > 0 ? (
          visibleMerchants.map((m: any) => (
            <Card key={m.id} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{m?.name}</div>

                  <div style={{ color: "#777", marginTop: 4 }}>Connector: {m?.connector || "N/A"}</div>

                  <div style={{ color: "#777", marginTop: 4 }}>
                    Last Sync: {m?.lastSyncAt ? new Date(m.lastSyncAt).toLocaleString() : "Never"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <Tag color={m?.status === "CONNECTED" ? "green" : "orange"}>{m?.status || "UNKNOWN"}</Tag>

                  <Button type="primary" onClick={() => syncMerchant(m.id)}>
                    Sync
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <h3>No merchant integrations found</h3>

              <p>Only Zucchini integrations are shown in this deployment.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Merchants;
