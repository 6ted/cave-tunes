
 // ======================================================
 // CAVE TUNES
 // SIDEBAR
 // components/Sidebar.jsx
 // ======================================================

import {
  Home,
  Music2,
  MessageSquare,
  Users,
  Library,
  Album,
  ChartBar,
  Radio,
  Tv,
  Building2,
  ChevronLeft,
  LogOut,
  LogIn,
  Bell,
} from "lucide-react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/useAuth";

import {
  useNotifications,
} from "../context/useNotifications";

import "./Sidebar.css";


// ======================================================
// SIDEBAR
// ======================================================

function Sidebar({
  open,
  setOpen,
}) {

  const navigate = useNavigate();


  // ====================================================
  // AUTH
  // ====================================================

  const {
    isAuthenticated,
    logout,
  } = useAuth();


  // ====================================================
  // NOTIFICATIONS
  // ====================================================

  const {
    unreadCount,
  } = useNotifications();


  // ====================================================
  // MENU
  // ====================================================

  const menu = [

    {
      name: "Home",
      icon: Home,
      path: "/",
    },

    {
      name: "Tunes",
      icon: Music2,
      path: "/tunes",
    },

    {
      name: "Community",
      icon: MessageSquare,
      path: "/feed",
    },

    {
      name: "Smart TV",
      icon: Tv,
      path: "/youtube",
    },

    {
      name: "Albums",
      icon: Album,
      path: "/albums",
    },

    {
      name: "Charts",
      icon: ChartBar,
      path: "/charts",
    },

    {
      name: "Artists",
      icon: Users,
      path: "/artists",
    },

    {
      name: "Producers",
      icon: Users,
      path: "/producers",
    },

    {
      name: "DJs",
      icon: Users,
      path: "/djs",
    },

    {
      name: "Radio",
      icon: Radio,
      path: "/radio",
    },

    {
      name: "Record Labels",
      icon: Building2,
      path: "/record-labels",
    },

    {
      name: "Library",
      icon: Library,
      path: "/library",
    },

    {
      name: "My Profile",
      icon: Users,
      path: "/profile",
    },

    {
      name: "Notifications",
      icon: Bell,
      path: "/notifications",
      notification: true,
    },

  ];


  // ====================================================
  // CLOSE SIDEBAR ON MOBILE PORTRAIT + LANDSCAPE
  // ====================================================

  function closeMobile() {

    const isMobilePortrait =
      window.innerWidth <= 768;

    const isMobileLandscape =
      window.matchMedia(
        "(max-width: 900px) and (orientation: landscape)"
      ).matches;

    if (
      isMobilePortrait ||
      isMobileLandscape
    ) {
      setOpen(false);
    }

  }


  // ====================================================
  // TOGGLE SIDEBAR
  // ====================================================

  function toggleSidebar() {

    setOpen((previous) => !previous);

  }


  // ====================================================
  // LOGOUT
  // ====================================================

  function handleLogout() {

    closeMobile();

    if (logout) {
      logout();
    }

    navigate("/");

  }


  // ====================================================
  // LOGIN
  // ====================================================

  function handleLoginClick() {

    closeMobile();

    navigate("/login");

  }


  // ====================================================
  // RENDER
  // ====================================================

  return (

    <>

      {/* ==================================================
          SIDEBAR OVERLAY
      ================================================== */}

      {open && (

        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
          aria-label="Close sidebar"
        />

      )}


      {/* ==================================================
          SIDEBAR TOGGLE
      ================================================== */}

      <button
        type="button"
        className={
          open
            ? "sidebar-toggle sidebar-open"
            : "sidebar-toggle"
        }
        onClick={toggleSidebar}
        aria-label={
          open
            ? "Close sidebar"
            : "Open sidebar"
        }
        aria-expanded={open}
      >

        <ChevronLeft size={22} />

      </button>


      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <aside
        className={
          open
            ? "sidebar open"
            : "sidebar"
        }
      >

        {/* LOGO */}

        <div className="sidebar-logo">

          <a
            href="/"
            className="sidebar-logo-link"
          >
            <h1>
              Cave Tunes
            </h1>
          </a>

        </div>


        {/* MENU */}

        <nav className="sidebar-menu">

          {menu.map((item) => {

            const Icon = item.icon;

            return (

              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMobile}
                className={({ isActive }) =>
                  isActive
                    ? "sidebar-link active"
                    : "sidebar-link"
                }
              >

                <Icon size={22} />

                <span>
                  {item.name}
                </span>


                {/* NOTIFICATION BADGE */}

                {
                  item.notification &&
                  isAuthenticated &&
                  unreadCount > 0 && (

                    <span
                      className="sidebar-notification-badge"
                      aria-label={`${unreadCount} unread notifications`}
                    >

                      {
                        unreadCount > 99
                          ? "99+"
                          : unreadCount
                      }

                    </span>

                  )
                }

              </NavLink>

            );

          })}


          {/* LOGIN / LOGOUT */}

          <div className="sidebar-auth-wrapper">

            {
              isAuthenticated

                ? (

                  <button
                    type="button"
                    className="sidebar-auth-btn logout-btn"
                    onClick={handleLogout}
                  >

                    <LogOut size={22} />

                    <span>
                      Log Out
                    </span>

                  </button>

                )

                : (

                  <button
                    type="button"
                    className="sidebar-auth-btn login-btn"
                    onClick={handleLoginClick}
                  >

                    <LogIn size={22} />

                    <span>
                      Log In / Sign Up
                    </span>

                  </button>

                )

            }

          </div>

        </nav>

      </aside>

    </>

  );

}

export default Sidebar;
