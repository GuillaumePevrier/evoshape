type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  id?: string;
  className?: string;
  showArea?: boolean;
  showBaseline?: boolean;
  showLastDot?: boolean;
};

export function Sparkline({
  values,
  width = 260,
  height = 80,
  id = "default",
  className,
  showArea = true,
  showBaseline = true,
  showLastDot = true,
}: SparklineProps) {
  if (values.length === 0) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const gradientId = `sparkline-${id}`;

  const points = values.map((value, index) => {
    const x =
      values.length === 1 ? width / 2 : (width / (values.length - 1)) * index;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  const linePath = points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    )
    .join(" ");

  const areaPath = `M ${points[0].x} ${height} ${linePath} L ${
    points[points.length - 1].x
  } ${height} Z`;
  const lastPoint = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className ?? "text-[var(--accent)]"}
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {showBaseline ? (
        <line
          x1="0"
          y1={height}
          x2={width}
          y2={height}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="2"
        />
      ) : null}
      {showArea ? (
        <path d={areaPath} fill={`url(#${gradientId})`} />
      ) : null}
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showLastDot ? (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="4"
          fill="currentColor"
          stroke="white"
          strokeWidth="2"
        />
      ) : null}
    </svg>
  );
}
