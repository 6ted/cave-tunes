
// ======================================================
// CAVE TUNES
// PREMIUM ROUTE PROTECTION
// src/components/PremiumRoute.jsx
// ======================================================

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    Navigate,
    Outlet,
    useNavigate,
} from "react-router-dom";

import {
    Crown,
    Loader2,
    RefreshCw,
    ArrowLeft,
} from "lucide-react";

import {
    getSubscriptionStatus,
} from "../services/api";

import "./PremiumRoute.css";


// ======================================================
// PREMIUM ROUTE
// ======================================================

export default function PremiumRoute() {

    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);

    const [isPremium, setIsPremium] = useState(false);

    const [error, setError] = useState("");


    // ==================================================
    // CHECK SUBSCRIPTION
    // ==================================================

    const checkSubscription = useCallback(async () => {

        try {

            setLoading(true);

            setError("");

            const response = await getSubscriptionStatus();

            // Only an active subscription grants access.
            const active =
                response?.isPremium === true &&
                response?.subscription?.status === "active";

            setIsPremium(active);

        } catch (err) {

            console.error(
                "PREMIUM ACCESS CHECK ERROR:",
                err
            );

            setError(
                err.message ||
                "Unable to verify your Premium subscription."
            );

            setIsPremium(false);

        } finally {

            setLoading(false);

        }

    }, []);


    // ==================================================
    // INITIAL SUBSCRIPTION CHECK
    // ==================================================

    useEffect(() => {

        let cancelled = false;

        const verifySubscription = async () => {

            try {

                const response = await getSubscriptionStatus();

                if (cancelled) return;

                const active =
                    response?.isPremium === true &&
                    response?.subscription?.status === "active";

                setIsPremium(active);

            } catch (err) {

                if (cancelled) return;

                console.error(
                    "PREMIUM ACCESS CHECK ERROR:",
                    err
                );

                setError(
                    err.message ||
                    "Unable to verify your Premium subscription."
                );

                setIsPremium(false);

            } finally {

                if (!cancelled) {
                    setLoading(false);
                }

            }

        };

        verifySubscription();

        return () => {
            cancelled = true;
        };

    }, []);


    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {

        return (

            <div className="premium-route-page">

                <div className="premium-route-card">

                    <Loader2
                        size={42}
                        className="premium-route-spinner"
                    />

                    <h2>
                        Checking Premium Access
                    </h2>

                    <p>
                        Verifying your Cave Tunes subscription.
                    </p>

                </div>

            </div>

        );

    }


    // ==================================================
    // API ERROR
    // ==================================================

    if (error) {

        return (

            <div className="premium-route-page">

                <div className="premium-route-card">

                    <Crown
                        size={42}
                        className="premium-route-crown"
                    />

                    <h2>
                        Unable to Verify Subscription
                    </h2>

                    <p>
                        {error}
                    </p>

                    <button
                        type="button"
                        className="premium-route-button"
                        onClick={checkSubscription}
                        disabled={loading}
                    >

                        <RefreshCw size={17} />

                        Try Again

                    </button>

                    <button
                        type="button"
                        className="premium-route-back"
                        onClick={() => navigate("/subscription")}
                    >

                        <ArrowLeft size={17} />

                        View Premium Plans

                    </button>

                </div>

            </div>

        );

    }


    // ==================================================
    // SUBSCRIPTION REQUIRED
    // ==================================================

    if (!isPremium) {

        return (

            <Navigate
                to="/subscription"
                replace
            />

        );

    }


    // ==================================================
    // ACTIVE PREMIUM
    // ==================================================

    return <Outlet />;

}
