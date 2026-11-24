
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Bell,
  Send,
  Users,
  User,
  Mail,
  Smartphone,
  CheckCircle,
  Eye,
  Clock,
  RefreshCw,
  Search,
  Megaphone,
  AlertCircle,
  Loader2,
  MessageSquare,
  ExternalLink,
} from "lucide-react";

import {
  sendAdminNotification,
  getAdminNotificationHistory,
  getAdminNotificationStats,
  getAdminUsers,
} from "../services/api";

import "./AdminNotifications.css";


// ======================================================
// HELPERS
// ======================================================

function getUsersFromResponse(response) {
  if (Array.isArray(response)) return response;

  return (
    response?.users ||
    response?.data?.users ||
    response?.data ||
    []
  );
}


function getHistoryFromResponse(response) {
  if (Array.isArray(response)) return response;

  return (
    response?.notifications ||
    response?.history ||
    response?.data?.notifications ||
    []
  );
}


function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


// ======================================================
// PAGE
// ======================================================

export default function AdminNotifications() {

  // --------------------------------------------------
  // FORM STATE
  // --------------------------------------------------

  const [audience, setAudience] = useState("all");
  const [delivery, setDelivery] = useState("in_app");

  const [userId, setUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [actionUrl, setActionUrl] = useState("");

  const [sending, setSending] = useState(false);


  // --------------------------------------------------
  // PAGE DATA
  // --------------------------------------------------

  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);

  const [stats, setStats] = useState({
    totalNotifications: 0,
    readNotifications: 0,
    unreadNotifications: 0,
    totalAnnouncements: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

const mountedRef = useRef(false);
  // ==================================================
  // LOAD PAGE DATA
  // ==================================================

  const loadPageData = useCallback(async (showLoader = true) => {

    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    const results = await Promise.allSettled([
      getAdminNotificationStats(),
      getAdminNotificationHistory(),
      getAdminUsers(),
    ]);

    const [
      statsResult,
      historyResult,
      usersResult,
    ] = results;


    // -----------------------------------------------
    // STATISTICS
    // -----------------------------------------------

    if (statsResult.status === "fulfilled") {

      setStats(
        statsResult.value?.stats || {
          totalNotifications: 0,
          readNotifications: 0,
          unreadNotifications: 0,
          totalAnnouncements: 0,
        }
      );

    } else {
      console.error(
        "ADMIN NOTIFICATION STATS ERROR:",
        statsResult.reason
      );
    }


    // -----------------------------------------------
    // HISTORY
    // -----------------------------------------------

    if (historyResult.status === "fulfilled") {

      setHistory(
        getHistoryFromResponse(historyResult.value)
      );

    } else {
      console.error(
        "ADMIN NOTIFICATION HISTORY ERROR:",
        historyResult.reason
      );
    }


    // -----------------------------------------------
    // USERS
    // -----------------------------------------------

    if (usersResult.status === "fulfilled") {

      setUsers(
        getUsersFromResponse(usersResult.value)
      );

    } else {
      console.error(
        "ADMIN USERS ERROR:",
        usersResult.reason
      );
    }


    // -----------------------------------------------
    // DISPLAY ERRORS
    // -----------------------------------------------

    const failedRequests = results.filter(
      result => result.status === "rejected"
    );

    if (failedRequests.length === results.length) {
      setError(
        failedRequests[0]?.reason?.message ||
        "Unable to load administrator notification data."
      );
    }

    setLoading(false);
    setRefreshing(false);

  }, []);


useEffect(() => {
  mountedRef.current = true;

  const timer = setTimeout(() => {
    if (mountedRef.current) {
      loadPageData();
    }
  }, 0);

  return () => {
    mountedRef.current = false;
    clearTimeout(timer);
  };
}, [loadPageData]);

  // ==================================================
  // FILTER USERS
  // ==================================================

  const filteredUsers = useMemo(() => {

    const search = userSearch.trim().toLowerCase();

    if (!search) {
      return users.slice(0, 50);
    }

    return users.filter(user => {

      const username =
        String(user.username || "").toLowerCase();

      const email =
        String(user.email || "").toLowerCase();

      const id =
        String(user.id || "");

      return (
        username.includes(search) ||
        email.includes(search) ||
        id.includes(search)
      );

    }).slice(0, 50);

  }, [users, userSearch]);


  const selectedUser = useMemo(() => {

    return users.find(
      user => String(user.id) === String(userId)
    );

  }, [users, userId]);


  // ==================================================
  // SEND NOTIFICATION
  // ==================================================

  async function handleSubmit(event) {

    event.preventDefault();

    setError("");
    setSuccess("");


    if (!title.trim()) {
      setError("Please enter a notification title.");
      return;
    }

    if (!message.trim()) {
      setError("Please enter your notification message.");
      return;
    }

    if (audience === "user" && !userId) {
      setError("Please select a user.");
      return;
    }

    if (
      actionUrl.trim() &&
      (
        !actionUrl.trim().startsWith("/") ||
        actionUrl.trim().startsWith("//")
      )
    ) {
      setError(
        "The action link must be a relative frontend path, for example /radio."
      );
      return;
    }


    setSending(true);

    try {

      const result = await sendAdminNotification({

        audience,

        userId:
          audience === "user"
            ? Number(userId)
            : null,

        title: title.trim(),

        message: message.trim(),

        actionUrl:
          actionUrl.trim() || null,

        delivery,

      });


      const recipientCount =
        result.recipients ??
        result.created ??
        0;


      setSuccess(
        result.message ||
        `Notification sent successfully to ${recipientCount} recipient(s).`
      );


      // Reset the form after successful sending.

      setTitle("");
      setMessage("");
      setActionUrl("");

      setAudience("all");
      setDelivery("in_app");

      setUserId("");
      setUserSearch("");


      // Refresh history and statistics.

      await loadPageData(false);

    } catch (err) {

      setError(
        err.message ||
        "Unable to send notification."
      );

    } finally {

      setSending(false);

    }

  }


  // ==================================================
  // REFRESH
  // ==================================================

  async function handleRefresh() {
    await loadPageData(false);
  }


  // ==================================================
  // RENDER
  // ==================================================

  return (

    <div className="admin-notifications-page">

      {/* ==============================================
          HEADER
      ============================================== */}

      <div className="admin-notifications-header">

        <div className="admin-notifications-heading">

          <div className="admin-notifications-heading-icon">
            <Bell size={25} />
          </div>

          <div>

            <span className="admin-notifications-eyebrow">
              ADMINISTRATION
            </span>

            <h1>Notifications</h1>

            <p>
              Send announcements and updates to Cave Tunes users.
            </p>

          </div>

        </div>


        <button
          type="button"
          className="admin-notifications-refresh"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "admin-spin" : ""}
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>

      </div>


      {/* ==============================================
          STATISTICS
      ============================================== */}

      <div className="admin-notification-stats">

        <div className="admin-notification-stat-card">

          <div className="admin-stat-icon purple">
            <Bell size={21} />
          </div>

          <div>
            <span>Total notifications</span>
            <strong>
              {Number(stats.totalNotifications || 0).toLocaleString()}
            </strong>
          </div>

        </div>


        <div className="admin-notification-stat-card">

          <div className="admin-stat-icon green">
            <Eye size={21} />
          </div>

          <div>
            <span>Read notifications</span>
            <strong>
              {Number(stats.readNotifications || 0).toLocaleString()}
            </strong>
          </div>

        </div>


        <div className="admin-notification-stat-card">

          <div className="admin-stat-icon orange">
            <Clock size={21} />
          </div>

          <div>
            <span>Unread notifications</span>
            <strong>
              {Number(stats.unreadNotifications || 0).toLocaleString()}
            </strong>
          </div>

        </div>


        <div className="admin-notification-stat-card">

          <div className="admin-stat-icon blue">
            <Megaphone size={21} />
          </div>

          <div>
            <span>Announcements</span>
            <strong>
              {Number(stats.totalAnnouncements || 0).toLocaleString()}
            </strong>
          </div>

        </div>

      </div>


      {/* ==============================================
          ALERTS
      ============================================== */}

      {error && (

        <div className="admin-notification-alert error">
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>

      )}


      {success && (

        <div className="admin-notification-alert success">
          <CheckCircle size={19} />
          <span>{success}</span>
        </div>

      )}


      {/* ==============================================
          MAIN CONTENT
      ============================================== */}

      <div className="admin-notifications-layout">


        {/* ============================================
            SEND NOTIFICATION FORM
        ============================================ */}

        <section className="admin-notification-panel">

          <div className="admin-panel-heading">

            <div>
              <h2>Compose notification</h2>

              <p>
                Create a message for your Cave Tunes audience.
              </p>
            </div>

            <div className="admin-panel-heading-icon">
              <Send size={20} />
            </div>

          </div>


          <form
            onSubmit={handleSubmit}
            className="admin-notification-form"
          >


            {/* AUDIENCE */}

            <div className="admin-form-group">

              <label>Who should receive this notification?</label>

              <div className="admin-audience-options">

                <button
                  type="button"
                  className={
                    audience === "all"
                      ? "admin-audience-option active"
                      : "admin-audience-option"
                  }
                  onClick={() => {
                    setAudience("all");
                    setUserId("");
                    setUserSearch("");
                  }}
                >

                  <Users size={21} />

                  <span>
                    <strong>All users</strong>
                    <small>Send to everyone</small>
                  </span>

                </button>


                <button
                  type="button"
                  className={
                    audience === "user"
                      ? "admin-audience-option active"
                      : "admin-audience-option"
                  }
                  onClick={() => setAudience("user")}
                >

                  <User size={21} />

                  <span>
                    <strong>Specific user</strong>
                    <small>Choose one recipient</small>
                  </span>

                </button>

              </div>

            </div>


            {/* USER SELECTION */}

            {audience === "user" && (

              <div className="admin-form-group">

                <label htmlFor="admin-user-search">
                  Select recipient
                </label>

                <div className="admin-user-search">

                  <Search size={18} />

                  <input
                    id="admin-user-search"
                    type="text"
                    placeholder="Search username, email or user ID..."
                    value={userSearch}
                    onChange={event => {
                      setUserSearch(event.target.value);
                      setUserId("");
                    }}
                  />

                </div>


                {selectedUser && (

                  <div className="admin-selected-user">

                    <div className="admin-selected-user-avatar">
                      {(selectedUser.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <strong>{selectedUser.username}</strong>
                      <small>{selectedUser.email}</small>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUserId("");
                        setUserSearch("");
                      }}
                    >
                      Change
                    </button>

                  </div>

                )}


                {!selectedUser && (

                  <div className="admin-user-results">

                    {filteredUsers.length > 0 ? (

                      filteredUsers.map(user => (

                        <button
                          type="button"
                          key={user.id}
                          className="admin-user-result"
                          onClick={() => {
                            setUserId(String(user.id));
                            setUserSearch("");
                          }}
                        >

                          <div className="admin-user-result-avatar">
                            {(user.username || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>{user.username || "Unknown user"}</strong>
                            <small>{user.email || `User ID: ${user.id}`}</small>
                          </div>

                          <span>#{user.id}</span>

                        </button>

                      ))

                    ) : (

                      <div className="admin-no-users">
                        {users.length === 0
                          ? "No users available. Check the admin users API."
                          : "No matching users found."}
                      </div>

                    )}

                  </div>

                )}

                <small className="admin-field-hint">
                  Search by username, email address or user ID.
                </small>

              </div>

            )}


            {/* DELIVERY */}

            <div className="admin-form-group">

              <label>Delivery method</label>

              <div className="admin-delivery-options">

                <button
                  type="button"
                  className={
                    delivery === "in_app"
                      ? "admin-delivery-option active"
                      : "admin-delivery-option"
                  }
                  onClick={() => setDelivery("in_app")}
                >

                  <Smartphone size={21} />

                  <span>
                    <strong>In-app only</strong>
                    <small>Notification inside Cave Tunes</small>
                  </span>

                </button>


                <button
                  type="button"
                  className={
                    delivery === "email"
                      ? "admin-delivery-option active"
                      : "admin-delivery-option"
                  }
                  onClick={() => setDelivery("email")}
                >

                  <Mail size={21} />

                  <span>
                    <strong>In-app + email</strong>
                    <small>Send to the user's registered email</small>
                  </span>

                </button>

              </div>

            </div>


            {/* TITLE */}

            <div className="admin-form-group">

              <div className="admin-label-row">

                <label htmlFor="admin-notification-title">
                  Notification title
                </label>

                <small>{title.length}/150</small>

              </div>

              <input
                id="admin-notification-title"
                type="text"
                maxLength={150}
                placeholder="Example: Important Cave Tunes Update"
                value={title}
                onChange={event => setTitle(event.target.value)}
                required
              />

            </div>


            {/* MESSAGE */}

            <div className="admin-form-group">

              <div className="admin-label-row">

                <label htmlFor="admin-notification-message">
                  Message
                </label>

                <small>{message.length}/5000</small>

              </div>

              <textarea
                id="admin-notification-message"
                rows={6}
                maxLength={5000}
                placeholder="Write your announcement here..."
                value={message}
                onChange={event => setMessage(event.target.value)}
                required
              />

            </div>


            {/* ACTION URL */}

            <div className="admin-form-group">

              <label htmlFor="admin-notification-link">
                Action link <span>(optional)</span>
              </label>

              <div className="admin-action-link-input">

                <ExternalLink size={17} />

                <input
                  id="admin-notification-link"
                  type="text"
                  maxLength={500}
                  placeholder="/radio or /premium"
                  value={actionUrl}
                  onChange={event => setActionUrl(event.target.value)}
                />

              </div>

              <small className="admin-field-hint">
                Enter a frontend path beginning with /. For example, /radio.
              </small>

            </div>


            {/* PREVIEW */}

            <div className="admin-notification-preview">

              <div className="admin-preview-heading">
                <Eye size={17} />
                Notification preview
              </div>

              <div className="admin-preview-content">

                <div className="admin-preview-icon">
                  <Bell size={20} />
                </div>

                <div>

                  <strong>
                    {title.trim() || "Your notification title"}
                  </strong>

                  <p>
                    {message.trim() || "Your notification message will appear here."}
                  </p>

                  {actionUrl.trim() && (
                    <span className="admin-preview-link">
                      Open link <ExternalLink size={13} />
                    </span>
                  )}

                  <small>Just now</small>

                </div>

              </div>

            </div>


            {/* SUBMIT */}

            <button
              type="submit"
              className="admin-send-notification-button"
              disabled={
                sending ||
                !title.trim() ||
                !message.trim() ||
                (audience === "user" && !userId)
              }
            >

              {sending ? (

                <>
                  <Loader2 size={19} className="admin-spin" />
                  Sending notification...
                </>

              ) : (

                <>
                  <Send size={18} />

                  {audience === "all"
                    ? "Send to all users"
                    : "Send to selected user"}
                </>

              )}

            </button>


            <p className="admin-send-note">
              Please review your message before sending. Notifications
              cannot currently be recalled after delivery.
            </p>

          </form>

        </section>


        {/* ============================================
            INFORMATION PANEL
        ============================================ */}

        <aside className="admin-notification-side-panel">

          <div className="admin-notification-info-card">

            <div className="admin-info-icon">
              <MessageSquare size={22} />
            </div>

            <h3>Announcement centre</h3>

            <p>
              Keep listeners, artists, DJs and producers informed
              about important Cave Tunes updates.
            </p>

            <div className="admin-info-divider" />

            <div className="admin-info-item">
              <CheckCircle size={17} />
              <span>Global platform announcements</span>
            </div>

            <div className="admin-info-item">
              <CheckCircle size={17} />
              <span>Individual user messages</span>
            </div>

            <div className="admin-info-item">
              <CheckCircle size={17} />
              <span>In-app and email delivery options</span>
            </div>

            <div className="admin-info-item">
              <CheckCircle size={17} />
              <span>Read and unread statistics</span>
            </div>

          </div>


          <div className="admin-notification-tip-card">

            <Megaphone size={22} />

            <h3>Admin tip</h3>

            <p>
              Keep announcements clear and useful. Use the action
              link to direct users to the relevant Cave Tunes page.
            </p>

          </div>

        </aside>

      </div>


      {/* ==============================================
          ANNOUNCEMENT HISTORY
      ============================================== */}

      <section className="admin-notification-history">

        <div className="admin-history-heading">

          <div>
            <h2>Announcement history</h2>

            <p>
              Review announcements previously sent from this admin panel.
            </p>
          </div>

          <span className="admin-history-count">
            {history.length} records
          </span>

        </div>


        {loading ? (

          <div className="admin-history-loading">
            <Loader2 size={24} className="admin-spin" />
            <span>Loading notification history...</span>
          </div>

        ) : history.length === 0 ? (

          <div className="admin-history-empty">

            <div>
              <Bell size={27} />
            </div>

            <h3>No announcements yet</h3>

            <p>
              Notifications you send will appear here.
            </p>

          </div>

        ) : (

          <div className="admin-history-table-wrapper">

            <table className="admin-history-table">

              <thead>
                <tr>
                  <th>Announcement</th>
                  <th>Audience</th>
                  <th>Delivery</th>
                  <th>Recipients</th>
                  <th>Read</th>
                  <th>Unread</th>
                  <th>Sent by</th>
                  <th>Date</th>
                </tr>
              </thead>


              <tbody>

                {history.map((item, index) => (

                  <tr
                    key={
                      item.broadcast_id ||
                      `${item.title}-${item.created_at}-${index}`
                    }
                  >

                    <td className="admin-history-message">

                      <strong>{item.title}</strong>

                      <span>{item.message}</span>

                      {item.action_url && (
                        <small>
                          <ExternalLink size={12} />
                          {item.action_url}
                        </small>
                      )}

                    </td>


                    <td>
                      <span
                        className={
                          item.audience === "all"
                            ? "admin-history-badge global"
                            : "admin-history-badge individual"
                        }
                      >
                        {item.audience === "all"
                          ? "All users"
                          : "Individual"}
                      </span>
                    </td>


                    <td>
                      {item.delivery === "email"
                        ? "In-app + email"
                        : "In-app"}
                    </td>


                    <td className="admin-history-number">
                      {Number(item.recipients || 0).toLocaleString()}
                    </td>


                    <td className="admin-history-read">
                      {Number(item.read_count || 0).toLocaleString()}
                    </td>


                    <td className="admin-history-unread">
                      {Number(item.unread_count || 0).toLocaleString()}
                    </td>


                    <td>
                      {item.sent_by_username || "Admin"}
                    </td>


                    <td className="admin-history-date">
                      {formatDate(item.created_at)}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>

  );

}
