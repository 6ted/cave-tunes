
// ======================================================
// CAVE TUNES RADIO
// src/pages/Radio.jsx
// ======================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Radio as RadioIcon,
  Bell,
  BellRing,
  CalendarDays,
  Clock,
  User,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

import {
  getRadioPrograms,
  setRadioProgramReminder,
  cancelRadioProgramReminder,
  getMyRadioReminders,
} from "../services/api";

import "./Radio.css";

function Radio() {
  const navigate = useNavigate();

  const [programs, setPrograms] = useState([]);
  const [reminderIds, setReminderIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingReminder, setLoadingReminder] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  const isLoggedIn = Boolean(
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken")
  );

  // --------------------------------------------------
  // LOAD RADIO PROGRAMS AND REMINDERS
  // --------------------------------------------------

  useEffect(() => {
    let ignore = false;

    const fetchRadioData = async () => {
      try {
        const programsResponse = await getRadioPrograms();

        if (ignore) return;

        const programList =
          programsResponse.programs ||
          programsResponse.data ||
          [];

        setPrograms(
          Array.isArray(programList) ? programList : []
        );

        // Load personal reminders only when logged in.
        if (isLoggedIn) {
          try {
            const remindersResponse =
              await getMyRadioReminders();

            if (ignore) return;

            const reminders =
              remindersResponse.reminders ||
              remindersResponse.data ||
              [];

            const activeIds = reminders
              .filter(
                (reminder) => reminder.is_active !== false
              )
              .map((reminder) =>
                Number(
                  reminder.program_id ??
                  reminder.programId ??
                  reminder.id
                )
              );

            setReminderIds(activeIds);
          } catch (reminderError) {
            console.error(
              "Unable to load radio reminders:",
              reminderError
            );
          }
        } else {
          setReminderIds([]);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Radio loading error:", err);

          setError(
            err.message || "Unable to load radio programs."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchRadioData();

    return () => {
      ignore = true;
    };
  }, [isLoggedIn, refreshKey]);

  // --------------------------------------------------
  // REFRESH
  // --------------------------------------------------

  const handleRefresh = () => {
    setLoading(true);
    setError("");
    setRefreshKey((previous) => previous + 1);
  };

  // --------------------------------------------------
  // SET OR CANCEL REMINDER
  // --------------------------------------------------

  const handleReminder = async (programId) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    setMessage("");
    setError("");

    setLoadingReminder((previous) => ({
      ...previous,
      [programId]: true,
    }));

    const numericId = Number(programId);

    const alreadySet = reminderIds.includes(numericId);

    try {
      if (alreadySet) {
        await cancelRadioProgramReminder(programId);

        setReminderIds((previous) =>
          previous.filter((id) => id !== numericId)
        );

        setMessage(
          "Your program reminder has been cancelled."
        );
      } else {
        await setRadioProgramReminder(programId);

        setReminderIds((previous) =>
          previous.includes(numericId)
            ? previous
            : [...previous, numericId]
        );

        setMessage(
          "Reminder set! We'll notify you five minutes before the program starts."
        );
      }
    } catch (err) {
      setError(
        err.message || "Unable to update your reminder."
      );
    } finally {
      setLoadingReminder((previous) => ({
        ...previous,
        [programId]: false,
      }));
    }
  };

  // --------------------------------------------------
  // DATE FORMATTING
  // --------------------------------------------------

  const formatDate = (dateValue) => {
    if (!dateValue) return "Date to be announced";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Date to be announced";
    }

    return new Intl.DateTimeFormat("en-MW", {
      timeZone: "Africa/Blantyre",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const formatTime = (dateValue) => {
    if (!dateValue) return "Time to be announced";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Time to be announced";
    }

    return new Intl.DateTimeFormat("en-MW", {
      timeZone: "Africa/Blantyre",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="radio-page">

      {/* HERO */}

      <section className="radio-hero">

        <div className="radio-hero-content">

          <div className="radio-eyebrow">
            <span className="radio-live-dot" />
            CAVE TUNES BROADCAST
          </div>

          <h1>
            CAVE TUNES
            <span> RADIO</span>
          </h1>

          <p>
            Your home for African music, live shows,
            countdowns and unforgettable radio moments.
          </p>

          <div className="radio-hero-tag">
            <RadioIcon size={17} />
            <span>Music. Culture. Connection.</span>
          </div>

        </div>

        <div className="radio-hero-art">

          <div className="radio-art-glow" />

          <div className="radio-art-circle">
            <RadioIcon size={76} strokeWidth={1.2} />
          </div>

          <div className="radio-wave">
            {Array.from({ length: 19 }).map((_, index) => (
              <span
                key={index}
                style={{
                  animationDelay: `${index * 0.08}s`,
                }}
              />
            ))}
          </div>

        </div>

      </section>

      {/* NOTICES */}

      {message && (
        <div className="radio-notice radio-notice-success">
          <CheckCircle2 size={18} />

          <span>{message}</span>

          <button
            type="button"
            onClick={() => setMessage("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {error && (
        <div className="radio-notice radio-notice-error">
          <AlertCircle size={18} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* PROGRAMS */}

      <section className="radio-programs-section">

        <div className="radio-section-heading">

          <div>
            <span className="radio-section-label">
              ON THE SCHEDULE
            </span>

            <h2>Upcoming Programs</h2>

            <p>
              Don't miss your favourite shows.
              Set a reminder and we'll notify you five
              minutes before they begin.
            </p>
          </div>

          <button
            type="button"
            className="radio-refresh-button"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "radio-spinning" : ""}
            />

            Refresh
          </button>

        </div>

        {/* LOADING */}

        {loading && (
          <div className="radio-loading">
            <Loader2
              className="radio-spinning"
              size={30}
            />

            <p>Loading radio programs...</p>
          </div>
        )}

        {/* EMPTY */}

        {!loading && programs.length === 0 && !error && (
          <div className="radio-empty">

            <RadioIcon size={42} />

            <h3>No upcoming programs yet</h3>

            <p>
              New Cave Tunes Radio programs will appear here.
              Check back soon.
            </p>

          </div>
        )}

        {/* PROGRAM LIST */}

        {!loading && programs.length > 0 && (
          <div className="radio-program-grid">

            {programs.map((program) => {
              const programId = Number(program.id);

              const reminderSet =
                reminderIds.includes(programId);

              const isBusy =
                Boolean(loadingReminder[program.id]);

              const title =
                program.title || "Untitled Program";

              const presenter =
                program.presenter ||
                program.presenter_name ||
                "Cave Tunes Radio";

              return (
                <article
                  className="radio-program-card"
                  key={program.id}
                >

                  <div className="radio-program-top">

                    <div className="radio-program-icon">
                      <RadioIcon size={25} />
                    </div>

                <span className={`radio-program-status ${program.status}`}>
                {program.status === "live"
                    ? "LIVE NOW"
                    : program.status === "recently_finished"
                    ? "RECENTLY FINISHED"
                    : "UPCOMING"}
                </span>

                  </div>

                  <h3>{title}</h3>

                  <p className="radio-program-description">
                    {program.description ||
                      "Tune in to Cave Tunes Radio for this special program."}
                  </p>

                  <div className="radio-program-details">

                    <div>
                      <CalendarDays size={16} />

                      <span>
                        {formatDate(program.start_at)}
                      </span>
                    </div>

                    <div>
                      <Clock size={16} />

                      <span>
                        {formatTime(program.start_at)}
                        {program.end_at &&
                          ` – ${formatTime(program.end_at)}`}
                      </span>
                    </div>

                    <div>
                      <User size={16} />

                      <span>{presenter}</span>
                    </div>

                  </div>

                  <div className="radio-program-footer">

                    {program.status === "upcoming" && (
  <button
    type="button"
    className={
      reminderSet
        ? "radio-reminder-button is-set"
        : "radio-reminder-button"
    }
    onClick={() => handleReminder(program.id)}
    disabled={isBusy}
  >
    {isBusy ? (
      <Loader2 size={17} className="radio-spinning" />
    ) : reminderSet ? (
      <BellRing size={17} />
    ) : (
      <Bell size={17} />
    )}

    {isBusy
      ? "Please wait..."
      : reminderSet
        ? "Reminder Set"
        : "Set Reminder"}
  </button>
)}

                    {reminderSet && (
                      <span className="radio-reminder-active">
                        <CheckCircle2 size={14} />
                        Active
                      </span>
                    )}

                  </div>

                </article>
              );
            })}

          </div>
        )}

      </section>

      {/* REMINDER INFORMATION */}

      <section className="radio-reminder-info">

        <div className="radio-reminder-info-icon">
          <BellRing size={25} />
        </div>

        <div>
          <h3>Never miss a show</h3>

          <p>
            Set a reminder for any upcoming program.
            Cave Tunes will send you an in-app notification
            five minutes before it starts.
          </p>
        </div>

      </section>

    </div>
  );
}

export default Radio;
