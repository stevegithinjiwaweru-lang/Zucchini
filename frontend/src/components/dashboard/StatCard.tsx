import React from "react";
import { Card } from "antd";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "good" | "critical" | "muted";
  trend?: number[];
  trendColor?: string;
}

const TONE_COLOR: Record<string, string> = {
  good: "#006300",
  critical: "#d03b3b",
  muted: "#898781",
};

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  deltaTone = "muted",
  trend,
  trendColor = "#e87ba4",
}) => {
  const trendData = trend?.map((v, i) => ({ i, v }));

  return (
    <Card
      styles={{ body: { padding: "16px 18px" } }}
      style={{ height: "100%" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#e40d6e", fontWeight: 700, fontSize: 13 }}>
            {label}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6, color: "#0b2136" }}>
            {value}
          </div>
          {delta && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                marginTop: 4,
                color: TONE_COLOR[deltaTone],
              }}
            >
              {delta}
            </div>
          )}
        </div>

        {trendData && trendData.length > 1 && (
          <div style={{ width: 70, height: 40, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={trendColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
