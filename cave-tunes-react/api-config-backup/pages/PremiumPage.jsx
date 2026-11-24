
import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://cave-tunes-api.onrender.com");

const Premium = () => {
  const [subscription, setSubscription] = useState(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSubscription = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          localStorage.getItem("authToken") ||
          localStorage.getItem("accessToken");

        if (!token) {
          if (isMounted) {
            setSubscription(null);
            setCheckingSubscription(false);
          }
          return;
        }

        const response = await fetch(
          `${API_URL}/api/subscription/status`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Unable to check subscription");
        }

        const data = await response.json();

        const currentSubscription = data.subscription || data;

        const status = String(
          currentSubscription.status || data.status || ""
        ).toLowerCase();

        const expiry =
          currentSubscription.expiresAt ||
          currentSubscription.expires_at ||
          data.expiresAt ||
          data.expires_at;

        const expiryDate = expiry ? new Date(expiry) : null;

        const isActive =
          status === "active" &&
          expiryDate &&
          !Number.isNaN(expiryDate.getTime()) &&
          expiryDate.getTime() > Date.now();

        const plan =
          currentSubscription.planName ||
          currentSubscription.plan_name ||
          currentSubscription.planSlug ||
          currentSubscription.plan_slug ||
          currentSubscription.plan ||
          currentSubscription.name ||
          data.planName ||
          data.plan ||
          "Premium";

        if (isMounted) {
          setSubscription(
            isActive
              ? {
                  plan: String(plan),
                  expiresAt: expiryDate,
                }
              : null
          );
        }
      } catch (error) {
        console.error("Premium subscription check failed:", error);

        if (isMounted) {
          setSubscription(null);
        }
      } finally {
        if (isMounted) {
          setCheckingSubscription(false);
        }
      }
    };

    checkSubscription();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatPlan = (plan) => {
    const normalized = String(plan).toLowerCase();

    if (normalized.includes("week")) return "Weekly Premium";
    if (normalized.includes("month")) return "Monthly Premium";
    if (normalized.includes("year")) return "Yearly Premium";

    return `${plan} Premium`;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const hasActiveSubscription = Boolean(subscription);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* ACTIVE PREMIUM MEMBERSHIP BANNER */}
        {!checkingSubscription && hasActiveSubscription && (
          <div
            style={{
              background:
                "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
              borderRadius: "22px",
              padding: "28px",
              marginBottom: "28px",
              boxShadow: "0 18px 40px rgba(168, 85, 247, 0.25)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.10)",
                top: "-85px",
                right: "-45px",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 13px",
                  borderRadius: "30px",
                  background: "rgba(255,255,255,0.18)",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  marginBottom: "18px",
                }}
              >
                <span>✦</span>
                PREMIUM MEMBER
              </div>

              <h2
                style={{
                  fontSize: "clamp(24px, 5vw, 34px)",
                  margin: "0 0 10px",
                  fontWeight: 800,
                }}
              >
                Welcome to Cave Tunes Premium!
              </h2>

              <p
                style={{
                  color: "rgba(255,255,255,0.9)",
                  lineHeight: 1.6,
                  margin: "0 0 24px",
                  fontSize: "15px",
                  maxWidth: "600px",
                }}
              >
                Your Premium membership is active. Enjoy your
                Cave Tunes experience with your subscription benefits.
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    flex: "1 1 180px",
                    background: "rgba(255,255,255,0.16)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "14px",
                    padding: "15px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      opacity: 0.8,
                      fontWeight: 700,
                      letterSpacing: "1px",
                      marginBottom: "7px",
                    }}
                  >
                    YOUR PLAN
                  </div>

                  <div style={{ fontSize: "17px", fontWeight: 800 }}>
                    {formatPlan(subscription.plan)}
                  </div>
                </div>

                <div
                  style={{
                    flex: "1 1 180px",
                    background: "rgba(255,255,255,0.16)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "14px",
                    padding: "15px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      opacity: 0.8,
                      fontWeight: 700,
                      letterSpacing: "1px",
                      marginBottom: "7px",
                    }}
                  >
                    MEMBERSHIP STATUS
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      fontSize: "17px",
                      fontWeight: 800,
                    }}
                  >
                    <span>●</span>
                    Active
                  </div>
                </div>

                <div
                  style={{
                    flex: "1 1 180px",
                    background: "rgba(255,255,255,0.16)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "14px",
                    padding: "15px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      opacity: 0.8,
                      fontWeight: 700,
                      letterSpacing: "1px",
                      marginBottom: "7px",
                    }}
                  >
                    EXPIRES ON
                  </div>

                  <div style={{ fontSize: "17px", fontWeight: 800 }}>
                    {formatDate(subscription.expiresAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PREMIUM PAGE CONTENT */}
        <div
          style={{
            minHeight: "420px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: "560px",
              width: "100%",
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              borderRadius: "18px",
              boxShadow: "0 20px 45px rgba(15, 23, 42, 0.35)",
              padding: "32px 28px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: "0 0 12px",
                color: "#c4b5fd",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {hasActiveSubscription
                ? "Your membership"
                : "Unlock more"}
            </p>

            <h1 style={{ margin: "0 0 16px", fontSize: "2.25rem" }}>
              Premium
            </h1>

            <p
              style={{
                margin: "0 0 24px",
                color: "#cbd5e1",
                lineHeight: 1.6,
              }}
            >
              {hasActiveSubscription
                ? "Thank you for being part of Cave Tunes Premium. Your membership is currently active."
                : "Experience more with Cave Tunes Premium. Upgrade your account and enjoy more from your music platform."}
            </p>

            {!hasActiveSubscription && (
              <button
                type="button"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "999px",
                  padding: "12px 24px",
                  fontSize: "1rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 10px 20px rgba(168, 85, 247, 0.35)",
                }}
              >
                Upgrade Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Premium;
