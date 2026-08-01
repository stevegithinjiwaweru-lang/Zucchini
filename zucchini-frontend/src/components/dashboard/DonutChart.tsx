import React from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  centerValue: string | number;
  centerLabel: string;
  size?: number;
}

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  centerValue,
  centerLabel,
  size = 190,
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <PieChart width={size} height={size}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={size / 2 - 28}
            outerRadius={size / 2}
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="#fff"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((slice, i) => (
              <Cell key={i} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, name: string) => [
              `${v} (${total ? Math.round((v / total) * 100) : 0}%)`,
              name,
            ]}
          />
        </PieChart>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0b2136" }}>
            {centerValue}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center" }}>
            {centerLabel}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((slice, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: slice.color,
                display: "inline-block",
              }}
            />
            <span style={{ color: "#0b2136" }}>{slice.name}</span>
            <span style={{ color: "#6b7280", fontWeight: 700 }}>{slice.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
