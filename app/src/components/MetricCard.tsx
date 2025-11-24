interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-gray-400">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-3 text-4xl font-bold text-[#05112b]">{value}</p>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-500 flex items-center">
              <span className="w-1.5 h-1.5 bg-[#05112b] rounded-full mr-2"></span>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="mt-3 flex items-center">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  trend.isPositive
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                <svg
                  className={`w-3 h-3 mr-1 ${
                    trend.isPositive ? "rotate-0" : "rotate-180"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {Math.abs(trend.value)}%
              </span>
              <span className="ml-2 text-xs text-gray-500">vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="ml-4 p-3 bg-gray-100 rounded-xl text-[#05112b]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
