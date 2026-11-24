
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Users,
  UserPlus,
  BadgeCheck,
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Globe,
  RefreshCw,
  AlertCircle,
  ChartNoAxesCombined,
} from "lucide-react";

import {
  getAdminAnalytics,
} from "../services/api";

import "./AdminAnalytics.css";


/* ======================================================
   PERIOD OPTIONS
====================================================== */

const PERIOD_OPTIONS = [
  { value: "7days", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "3months", label: "Last 3 months" },
  { value: "6months", label: "Last 6 months" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];


/* ======================================================
   HELPERS
====================================================== */

const formatNumber = (value) => {
  return Number(value || 0).toLocaleString();
};


const formatDate = (value, period) => {
  if (!value) return "";

  const date = new Date(
    `${String(value).slice(0, 10)}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  if (period === "7days" || period === "month") {
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
};


const getGrowthText = (growth) => {
  if (growth === null || growth === undefined) {
    return "No comparison available";
  }

  const value = Number(growth);

  if (!Number.isFinite(value)) {
    return "No comparison available";
  }

  if (value > 0) {
    return `Up ${value}% from previous period`;
  }

  if (value < 0) {
    return `Down ${Math.abs(value)}% from previous period`;
  }

  return "No change from previous period";
};


/* ======================================================
   REGISTRATION GRAPH
====================================================== */

function RegistrationChart({
  registrations = [],
  period,
}) {

  const chart = useMemo(() => {

    const data = registrations.map((item) => ({
      date: item.date,
      users: Number(item.users || 0),
    }));

    const width = 900;
    const height = 300;

    const paddingLeft = 55;
    const paddingRight = 25;
    const paddingTop = 25;
    const paddingBottom = 55;

    const graphWidth =
      width - paddingLeft - paddingRight;

    const graphHeight =
      height - paddingTop - paddingBottom;

    const maxValue = Math.max(
      ...data.map((item) => item.users),
      1
    );

    const roundedMax =
      Math.ceil(maxValue / 5) * 5 || 5;

    const points = data.map((item, index) => {

      const x = data.length <= 1
        ? paddingLeft + graphWidth / 2
        : paddingLeft +
          (index / (data.length - 1)) * graphWidth;

      const y =
        paddingTop +
        graphHeight -
        (item.users / roundedMax) * graphHeight;

      return {
        ...item,
        x,
        y,
      };
    });

    const linePath = points.length
      ? points
          .map((point, index) =>
            `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
          )
          .join(" ")
      : "";

    const areaPath = points.length
      ? `${linePath} L ${points[points.length - 1].x} ${
          paddingTop + graphHeight
        } L ${points[0].x} ${
          paddingTop + graphHeight
        } Z`
      : "";

    const gridLines = Array.from(
      { length: 5 },
      (_, index) => {

        const value =
          (roundedMax / 4) * (4 - index);

        const y =
          paddingTop +
          (index / 4) * graphHeight;

        return {
          value: Math.round(value),
          y,
        };
      }
    );

    const labelIndexes = points.length <= 5
      ? points.map((_, index) => index)
      : [
          0,
          Math.round((points.length - 1) / 4),
          Math.round((points.length - 1) / 2),
          Math.round((3 * (points.length - 1)) / 4),
          points.length - 1,
        ];

    return {
      width,
      height,
      paddingLeft,
      paddingTop,
      graphHeight,
      points,
      linePath,
      areaPath,
      gridLines,
      labelIndexes: [...new Set(labelIndexes)],
    };

  }, [registrations]);


  if (!registrations.length) {
    return (
      <div className="admin-analytics-empty-chart">
        <BarChart3 size={36} />

        <p>No registration data available.</p>
      </div>
    );
  }


  return (
    <div className="admin-analytics-chart-wrapper">

      <svg
        className="admin-analytics-chart"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label="User registration graph"
      >

        {/* GRID LINES */}

        {chart.gridLines.map((line, index) => (

          <g key={index}>

            <line
              x1={chart.paddingLeft}
              y1={line.y}
              x2={chart.width - 25}
              y2={line.y}
              className="admin-chart-grid-line"
            />

            <text
              x={chart.paddingLeft - 12}
              y={line.y + 4}
              textAnchor="end"
              className="admin-chart-axis-label"
            >
              {line.value}
            </text>

          </g>

        ))}


        {/* AREA */}

        <path
          d={chart.areaPath}
          className="admin-chart-area"
        />


        {/* LINE */}

        <path
          d={chart.linePath}
          className="admin-chart-line"
        />


        {/* POINTS */}

        {chart.points.map((point, index) => (

          <g key={`${point.date}-${index}`}>

            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              className="admin-chart-point"
            >
              <title>
                {point.date}: {point.users} registrations
              </title>
            </circle>

          </g>

        ))}


        {/* DATE LABELS */}

        {chart.labelIndexes.map((index) => {

          const point = chart.points[index];

          return (
            <text
              key={`${point.date}-label`}
              x={point.x}
              y={chart.height - 20}
              textAnchor="middle"
              className="admin-chart-axis-label"
            >
              {formatDate(point.date, period)}
            </text>
          );

        })}

      </svg>

    </div>
  );

}


/* ======================================================
   BREAKDOWN COMPONENT
====================================================== */

function BreakdownList({
  title,
  icon: Icon,
  items = [],
  nameKey,
  emptyMessage,
}) {

  const maximum = Math.max(
    ...items.map((item) => Number(item.users || 0)),
    1
  );

  return (
    <section className="admin-analytics-panel">

      <div className="admin-analytics-panel-heading">

        <div className="admin-analytics-panel-icon">
          <Icon size={19} />
        </div>

        <h3>{title}</h3>

      </div>


      {items.length === 0 ? (

        <div className="admin-analytics-breakdown-empty">
          {emptyMessage}
        </div>

      ) : (

        <div className="admin-analytics-breakdown-list">

          {items.map((item, index) => {

            const name =
              item[nameKey] || "Unknown";

            const count =
              Number(item.users || 0);

            const percentage =
              (count / maximum) * 100;

            return (
              <div
                className="admin-analytics-breakdown-item"
                key={`${name}-${index}`}
              >

                <div className="admin-analytics-breakdown-info">

                  <span>{name}</span>

                  <strong>
                    {formatNumber(count)}
                  </strong>

                </div>

                <div className="admin-analytics-progress-track">

                  <div
                    className="admin-analytics-progress-fill"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />

                </div>

              </div>
            );

          })}

        </div>

      )}

    </section>
  );

}


/* ======================================================
   STAT CARD
====================================================== */

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}) {

  return (
    <div className="admin-analytics-stat-card">

      <div className="admin-analytics-stat-top">

        <div className="admin-analytics-stat-icon">
          <Icon size={21} />
        </div>

        {trend !== undefined && trend !== null && (

          <span
            className={`admin-analytics-trend ${
              Number(trend) >= 0
                ? "positive"
                : "negative"
            }`}
          >

            {Number(trend) >= 0
              ? <TrendingUp size={14} />
              : <TrendingDown size={14} />
            }

            {Math.abs(Number(trend))}%

          </span>

        )}

      </div>


      <div className="admin-analytics-stat-value">
        {formatNumber(value)}
      </div>

      <div className="admin-analytics-stat-title">
        {title}
      </div>

      {description && (

        <div className="admin-analytics-stat-description">
          {description}
        </div>

      )}

    </div>
  );

}


/* ======================================================
   ADMIN ANALYTICS PAGE
====================================================== */

export default function AdminAnalytics() {

  const [period, setPeriod] = useState("month");

  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");


  /* ====================================================
     LOAD ANALYTICS
  ==================================================== */

  const loadAnalytics = useCallback(async () => {

    try {

      setLoading(true);
      setError("");

      const response = await getAdminAnalytics(period);

      if (!response || response.success === false) {
        throw new Error(
          response?.message ||
          "Unable to load analytics."
        );
      }

      setAnalytics(response);

    } catch (err) {

      console.error(
        "Admin analytics error:",
        err
      );

      setError(
        err.message ||
        "Something went wrong while loading analytics."
      );

    } finally {

      setLoading(false);

    }

  }, [period]);


useEffect(() => {
  let cancelled = false;

  Promise.resolve().then(() => {
    if (!cancelled) {
      loadAnalytics();
    }
  });

  return () => {
    cancelled = true;
  };
}, [loadAnalytics]);


  /* ====================================================
     SUMMARY VALUES
  ==================================================== */

  const summary = analytics?.summary || {};

  const registrations =
    analytics?.registrations || [];

  const roles =
    analytics?.roles || [];

  const countries =
    analytics?.countries || [];


  const growth =
    summary.growthPercentage;


  /* ====================================================
     RENDER
  ==================================================== */

  return (

    <div className="admin-analytics-page">


      {/* PAGE HEADER */}

      <div className="admin-analytics-header">

        <div>

          <div className="admin-analytics-eyebrow">
            ADMINISTRATION
          </div>

          <h1>
            <ChartNoAxesCombined size={27} />
            Analytics
          </h1>

          <p>
            Monitor registrations and understand your
            Cave Tunes user community.
          </p>

        </div>


        <button
          type="button"
          className="admin-analytics-refresh"
          onClick={loadAnalytics}
          disabled={loading}
        >

          <RefreshCw
            size={17}
            className={loading ? "admin-analytics-spinning" : ""}
          />

          Refresh

        </button>

      </div>


      {/* PERIOD SELECTOR */}

      <div className="admin-analytics-toolbar">

        <div>
          <span className="admin-analytics-toolbar-label">
            Registration period
          </span>

          <span className="admin-analytics-toolbar-description">
            Select the period for your registration statistics.
          </span>
        </div>


        <select
          value={period}
          onChange={(event) => {
            setPeriod(event.target.value);
            setLoading(true);
          }}
          className="admin-analytics-period-select"
        >

          {PERIOD_OPTIONS.map((option) => (

            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>

          ))}

        </select>

      </div>


      {/* ERROR */}

      {error && (

        <div className="admin-analytics-error">

          <AlertCircle size={19} />

          <span>{error}</span>

          <button
            type="button"
            onClick={loadAnalytics}
          >
            Try again
          </button>

        </div>

      )}


      {/* LOADING */}

      {loading && !analytics ? (

        <div className="admin-analytics-loading">

          <div className="admin-analytics-loader" />

          <p>Loading analytics...</p>

        </div>

      ) : analytics ? (

        <>

          {/* SUMMARY CARDS */}

          <div className="admin-analytics-stats-grid">

            <StatCard
              title="Total Users"
              value={summary.totalUsers}
              description="All registered users"
              icon={Users}
            />

            <StatCard
              title="New Registrations"
              value={summary.newUsers}
              description="During selected period"
              icon={UserPlus}
              trend={growth}
            />

            <StatCard
              title="Verified Users"
              value={summary.verifiedUsers}
              description="Verified accounts"
              icon={BadgeCheck}
            />

            <StatCard
              title="Monetized Users"
              value={summary.monetizedUsers}
              description="Accounts with monetization"
              icon={Wallet}
            />

          </div>


          {/* GROWTH INFORMATION */}

          <div className="admin-analytics-growth-note">

            {growth === null || growth === undefined ? (

              <BarChart3 size={18} />

            ) : Number(growth) >= 0 ? (

              <TrendingUp size={18} />

            ) : (

              <TrendingDown size={18} />

            )}

            <span>
              {getGrowthText(growth)}
            </span>

          </div>


          {/* REGISTRATION GRAPH */}

          <section className="admin-analytics-panel admin-analytics-main-chart">

            <div className="admin-analytics-panel-heading">

              <div className="admin-analytics-panel-icon">
                <BarChart3 size={20} />
              </div>

              <div>
                <h3>User Registrations</h3>

                <p>
                  New user registrations over time
                </p>
              </div>

            </div>


            {loading && (

              <div className="admin-analytics-updating">
                Updating analytics...
              </div>

            )}


            <RegistrationChart
              registrations={registrations}
              period={period}
            />

          </section>


          {/* ROLE AND COUNTRY BREAKDOWN */}

          <div className="admin-analytics-breakdown-grid">

            <BreakdownList
              title="Users by Role"
              icon={Users}
              items={roles}
              nameKey="role"
              emptyMessage="No role information available."
            />

            <BreakdownList
              title="Users by Country"
              icon={Globe}
              items={countries}
              nameKey="country"
              emptyMessage="No country information available."
            />

          </div>

        </>

      ) : (

        !error && (

          <div className="admin-analytics-empty">
            No analytics data is available.
          </div>

        )

      )}

    </div>

  );

}
