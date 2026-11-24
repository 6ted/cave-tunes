import {
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "./useAuth";

const NotificationContext =
  createContext(null);

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : window.location.origin;


// ======================================================
// NOTIFICATION PROVIDER
// ======================================================

function NotificationProvider({
  children,
}) {

  const {
    user,
    isAuthenticated,
  } = useAuth();


  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);


  // ====================================================
  // LOAD UNREAD COUNT
  // ====================================================

  const loadUnreadCount =
    useCallback(
      async () => {

        if (
          !isAuthenticated ||
          !user
        ) {
          return;
        }


        const token =
          localStorage.getItem(
            "token"
          );


        if (!token) {
          return;
        }


        try {

          const response =
            await fetch(
              `${API_BASE_URL}/api/notifications/unread-count`,
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );


          if (!response.ok) {
            return;
          }


          const data =
            await response.json();


          if (
            data?.success
          ) {

            setUnreadCount(
              Number(
                data.unreadCount
              ) || 0
            );

          }

        }

        catch (error) {

          console.error(
            "LOAD UNREAD NOTIFICATION COUNT ERROR:",
            error
          );

        }

      },
      [
        isAuthenticated,
        user,
      ]
    );


  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {

    if (
      !isAuthenticated ||
      !user
    ) {

      return undefined;

    }


    const timer =
      setTimeout(() => {

        loadUnreadCount();

      }, 0);


    return () => {

      clearTimeout(
        timer
      );

    };

  }, [
    isAuthenticated,
    user,
    loadUnreadCount,
  ]);


  // ====================================================
  // AUTO REFRESH
  // ====================================================

  useEffect(() => {

    if (
      !isAuthenticated ||
      !user
    ) {

      return undefined;

    }


    const interval =
      setInterval(() => {

        loadUnreadCount();

      }, 15000);


    return () => {

      clearInterval(
        interval
      );

    };

  }, [
    isAuthenticated,
    user,
    loadUnreadCount,
  ]);


  // ====================================================
  // CLEAR UNREAD COUNT
  // ====================================================

  const clearUnreadCount =
    useCallback(() => {

      setUnreadCount(0);

    }, []);


  // ====================================================
  // REFRESH
  // ====================================================

  const refreshNotifications =
    useCallback(() => {

      return loadUnreadCount();

    }, [
      loadUnreadCount,
    ]);


  return (

    <NotificationContext.Provider
      value={{
        unreadCount,

        setUnreadCount,

        clearUnreadCount,

        refreshNotifications,
      }}
    >

      {children}

    </NotificationContext.Provider>

  );

}


export {
  NotificationContext,
  NotificationProvider,
};