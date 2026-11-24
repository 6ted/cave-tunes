
/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  useContext,
} from "react";

import {
  getCurrentUser,
  loginUser,
  registerUser,
  getGoogleAuthUrl,
  verifyEmailOtp,
  resendEmailOtp,
} from "../services/api";

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ======================================================
  // SAVE USER
  // ======================================================

  const saveUser = useCallback((currentUser) => {
    setUser(currentUser || null);

    if (currentUser) {
      localStorage.setItem(
        "caveTunesUser",
        JSON.stringify(currentUser)
      );
    } else {
      localStorage.removeItem("caveTunesUser");
    }
  }, []);

  // ======================================================
  // CLEAR AUTHENTICATION
  // ======================================================

  const clearAuth = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("accessToken");

    saveUser(null);
  }, [saveUser]);

  // ======================================================
  // REFRESH CURRENT USER
  // ======================================================

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      saveUser(null);
      return null;
    }

    try {
      const response = await getCurrentUser();

      const currentUser =
        response?.user || null;

      if (!currentUser) {
        throw new Error(
          "Authentication token is invalid."
        );
      }

      saveUser(currentUser);

      return currentUser;

    } catch (error) {
      console.error(
        "Failed to refresh user:",
        error
      );

      clearAuth();

      throw error;
    }
  }, [clearAuth, saveUser]);

  // ======================================================
  // INITIAL AUTHENTICATION CHECK
  // ======================================================

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const params = new URLSearchParams(
          window.location.search
        );

        // Google and normal OTP challenges are not
        // authenticated sessions yet.
        if (params.has("challenge")) {
          clearAuth();
          return;
        }

        // Never accept a JWT directly from a callback URL.
        if (params.has("token")) {
          clearAuth();

          const cleanUrl =
            window.location.origin +
            window.location.pathname;

          window.history.replaceState(
            {},
            document.title,
            cleanUrl
          );

          console.warn(
            "Direct URL token authentication is disabled."
          );

          return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
          if (mounted) {
            saveUser(null);
          }

          return;
        }

        const response = await getCurrentUser();

        if (!mounted) {
          return;
        }

        const currentUser =
          response?.user || null;

        if (!currentUser) {
          throw new Error(
            "Unable to restore authenticated user."
          );
        }

        saveUser(currentUser);

      } catch (error) {
        console.error(
          "Authentication initialization failed:",
          error
        );

        if (mounted) {
          clearAuth();
        }

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [clearAuth, saveUser]);

  // ======================================================
  // LOGIN
  // ======================================================

  const login = useCallback(
    async (email, password) => {
      clearAuth();

      const response = await loginUser(
        email,
        password
      );

      if (
        !response?.requiresOtp ||
        !response?.challengeToken
      ) {
        throw new Error(
          "The server did not return a valid OTP challenge."
        );
      }

      return {
        ...response,
        requiresOtp: true,
      };
    },
    [clearAuth]
  );

  // ======================================================
  // GOOGLE LOGIN
  // ======================================================

  const loginWithGoogle = useCallback(() => {
    clearAuth();

    window.location.href =
      getGoogleAuthUrl();
  }, [clearAuth]);

  // ======================================================
  // REGISTER
  // ======================================================

  const register = useCallback(
    async ({
      username,
      email,
      password,
      role = "listener",
    }) => {
      clearAuth();

      const response = await registerUser({
        username,
        email,
        password,
        role,
      });

      if (
        !response?.requiresOtp ||
        !response?.challengeToken
      ) {
        throw new Error(
          "The server did not return a valid registration OTP challenge."
        );
      }

      return {
        ...response,
        requiresOtp: true,
      };
    },
    [clearAuth]
  );

  // ======================================================
  // VERIFY OTP
  // ======================================================

  const verifyOtp = useCallback(
    async (challengeToken, code) => {
      if (!challengeToken || !code) {
        throw new Error(
          "An OTP challenge and verification code are required."
        );
      }

      const response = await verifyEmailOtp(
        challengeToken,
        code
      );

      if (!response?.token) {
        throw new Error(
          "OTP verification succeeded but no authentication token was returned."
        );
      }

      // Save the JWT only after successful OTP verification.
      localStorage.setItem(
        "token",
        response.token
      );

      try {
        // Get the latest user and profile completion status.
        const currentUser = await refreshUser();

        if (!currentUser) {
          throw new Error(
            "Unable to load your verified account."
          );
        }

        const profileCompleted =
          currentUser.profile_completed === true ||
          currentUser.profile_completed === 1 ||
          currentUser.profile_completed === "true";

        return {
          ...response,
          user: currentUser,
          requiresProfileCompletion:
            !profileCompleted,
        };

      } catch (error) {
        clearAuth();
        throw error;
      }
    },
    [refreshUser, clearAuth]
  );

  // ======================================================
  // RESEND OTP
  // ======================================================

  const resendOtp = useCallback(
    async (challengeToken) => {
      if (!challengeToken) {
        throw new Error(
          "An OTP challenge is required."
        );
      }

      return resendEmailOtp(challengeToken);
    },
    []
  );

  // ======================================================
  // LOGOUT
  // ======================================================

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  // ======================================================
  // AUTH STATE
  // ======================================================

  const isAuthenticated = Boolean(user);

  const isAdmin =
    user?.is_admin === true ||
    user?.is_admin === 1 ||
    user?.is_admin === "true" ||
    user?.role === "admin";

  // ======================================================
  // CONTEXT VALUE
  // ======================================================

  const value = {
    user,
    loading,
    isAuthenticated,
    isAdmin,

    login,
    loginWithGoogle,
    register,

    verifyOtp,
    resendOtp,

    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
