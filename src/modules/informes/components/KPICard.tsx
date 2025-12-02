import React from "react";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  tooltip?: string;
  onClick?: () => void;
};

const KPICard: React.FC<Props> = ({ title, value, subtitle, tooltip, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border p-4 shadow-sm transition hover:shadow-md hover:border-primary"
      title={tooltip}
    >
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-gray-400">{subtitle}</div>}
    </button>
  );
};

export default KPICard;
