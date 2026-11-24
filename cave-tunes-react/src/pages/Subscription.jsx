import { API_BASE_URL as SHARED_API_BASE_URL } from "../services/api";
import {
ArrowLeft,
Crown,
ShieldCheck,
Download,
Headphones,
Sparkles,
Scissors,
Clock,
} from "lucide-react";

import {
useEffect,
useMemo,
useState,
useCallback,
} from "react";

import { useNavigate } from "react-router-dom";

import { getCurrentUser } from "../services/api";
import "./Subscription.css";

const API_URL = SHARED_API_BASE_URL;

const COUNTRY_CURRENCIES = {
MALAWI: "MWK",
"SOUTH AFRICA": "ZAR",
NIGERIA: "NGN",
GHANA: "GHS",
KENYA: "KES",
TANZANIA: "TZS",
ZAMBIA: "ZMW",
ZIMBABWE: "ZWL",
BOTSWANA: "BWP",
MOZAMBIQUE: "MZN",
UGANDA: "UGX",
RWANDA: "RWF",
ETHIOPIA: "ETB",
EGYPT: "EGP",
"UNITED STATES": "USD",
CANADA: "CAD",
"UNITED KINGDOM": "GBP",
AUSTRALIA: "AUD",
"NEW ZEALAND": "NZD",
INDIA: "INR",
CHINA: "CNY",
JAPAN: "JPY",
"SOUTH KOREA": "KRW",
BRAZIL: "BRL",
MEXICO: "MXN",
GERMANY: "EUR",
FRANCE: "EUR",
ITALY: "EUR",
SPAIN: "EUR",
PORTUGAL: "EUR",
NETHERLANDS: "EUR",
BELGIUM: "EUR",
IRELAND: "EUR",
};

const PLAN_FEATURES = [
"Premium music downloads",
"Sizaro access",
"Ad-free listening",
"Premium discovery",
"Premium account benefits",
];

function getLocalCurrency(country) {
if (!country) return "USD";

const normalizedCountry = String(country)
.trim()
.toUpperCase();

return COUNTRY_CURRENCIES[normalizedCountry] || "USD";
}

function toNumber(value) {
const number = Number(value);

return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value, currency) {
return new Intl.NumberFormat(undefined, {
style: "currency",
currency,
minimumFractionDigits: 2,
maximumFractionDigits: 2,
}).format(toNumber(value));
}

function formatMwk(value) {
return `MWK ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value))}`;
}

function getPlanPeriod(plan) {
const days = Number(plan.durationDays);

if (days === 7) return "per week";
if (days === 30) return "per month";
if (days === 365) return "per year";

return `for ${days} days`;
}

function getPlanDescription(plan) {
if (plan.description) {
return plan.description;
}

const days = Number(plan.durationDays);

if (days === 7) {
return "Perfect if you want to try Premium for a short time.";
}

if (days === 30) {
return "Full Premium access with a simple monthly payment.";
}

if (days === 365) {
return "Stay Premium throughout the year with one payment.";
}

return `Premium access for ${days} days.`;
}

function formatExpiryDate(date) {
if (!date) return "";

const parsedDate = new Date(date);

if (Number.isNaN(parsedDate.getTime())) {
return "";
}

return parsedDate.toLocaleString(undefined, {
day: "numeric",
month: "long",
year: "numeric",
hour: "2-digit",
minute: "2-digit",
});
}

/*
Normalize the subscription response from the backend.
*/
function getSubscriptionData(data) {
const subscription =
data?.subscription ||
data?.currentSubscription ||
data ||
{};

const status = String(
subscription.status || data?.status || ""
).toLowerCase();

const expiresAt =
subscription.expiresAt ||
subscription.expires_at ||
data?.expiresAt ||
data?.expires_at ||
null;

const expiryTime = expiresAt
? new Date(expiresAt).getTime()
: null;

let plan = subscription.plan;

if (plan && typeof plan === "object") {
plan = plan.slug || plan.name || null;
}

return {
status,
expiresAt,
expiryTime,
plan:
plan ||
subscription.planSlug ||
subscription.plan_slug ||
subscription.planName ||
subscription.plan_name ||
subscription.name ||
null,
};
}

export default function Subscription() {
const navigate = useNavigate();

const [currentUser, setCurrentUser] = useState(null);
const [plans, setPlans] = useState([]);

const [plansLoading, setPlansLoading] = useState(true);
const [plansError, setPlansError] = useState("");

const [currencyLoading, setCurrencyLoading] = useState(true);
const [usdRates, setUsdRates] = useState(null);

const [selectingPlan, setSelectingPlan] = useState(null);

const [currentSubscription, setCurrentSubscription] =
useState(null);

const [subscriptionLoading, setSubscriptionLoading] =
useState(true);

// The clock is initialized after the component mounts.
const [currentTime, setCurrentTime] = useState(0);

/*
INITIALIZE CURRENT TIME


Update the clock after mounting and then every 30 seconds.
This allows the page to detect when Premium expires.


*/
useEffect(() => {
const initialTimeout = setTimeout(() => {
setCurrentTime(Date.now());
}, 0);


const interval = setInterval(() => {
  setCurrentTime(Date.now());
}, 30000);

return () => {
  clearTimeout(initialTimeout);
  clearInterval(interval);
};


}, []);

/*
LOAD CURRENT USER
*/
useEffect(() => {
let mounted = true;


const loadCurrentUser = async () => {
  try {
    const response = await getCurrentUser();

    if (mounted) {
      setCurrentUser(response?.user || null);
    }
  } catch (error) {
    console.error("Failed to load current user:", error);

    if (mounted) {
      setCurrentUser(null);
    }
  }
};

loadCurrentUser();

return () => {
  mounted = false;
};


}, []);

/*
LOAD PREMIUM PLANS
*/
useEffect(() => {
let mounted = true;


const loadPlans = async () => {
  setPlansLoading(true);
  setPlansError("");

  try {
    const response = await fetch(
      `${API_URL}/api/subscription/plans`
    );

    if (!response.ok) {
      throw new Error("Failed to load Premium plans.");
    }

    const data = await response.json();

    if (!data?.success || !Array.isArray(data?.plans)) {
      throw new Error("Invalid Premium plans response.");
    }

    if (mounted) {
      setPlans(data.plans);
    }
  } catch (error) {
    console.error("Failed to load Premium plans:", error);

    if (mounted) {
      setPlans([]);
      setPlansError(
        "Unable to load Premium plans. Please try again."
      );
    }
  } finally {
    if (mounted) {
      setPlansLoading(false);
    }
  }
};

loadPlans();

return () => {
  mounted = false;
};


}, []);

/*
LOAD CURRENT SUBSCRIPTION STATUS
*/
const loadSubscriptionStatus = useCallback(async () => {
const token = localStorage.getItem("token");


if (!token) {
  setCurrentSubscription(null);
  setSubscriptionLoading(false);
  return;
}

setSubscriptionLoading(true);

try {
  const response = await fetch(
    `${API_URL}/api/subscription/status`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to retrieve subscription status."
    );
  }

  const data = await response.json();

  console.log("Current Premium subscription:", data);

  const subscription = getSubscriptionData(data);

  setCurrentSubscription(subscription);
} catch (error) {
  console.error(
    "Failed to load subscription status:",
    error
  );

  setCurrentSubscription(null);
} finally {
  setSubscriptionLoading(false);
}


}, []);

useEffect(() => {
  const timeoutId = setTimeout(() => {
    loadSubscriptionStatus();
  }, 0);

  return () => {
    clearTimeout(timeoutId);
  };
}, [loadSubscriptionStatus]);
/*
REFRESH SUBSCRIPTION WHEN USER RETURNS
*/
useEffect(() => {
const handleFocus = () => {
loadSubscriptionStatus();
};


const handleVisibilityChange = () => {
  if (document.visibilityState === "visible") {
    loadSubscriptionStatus();
  }
};

window.addEventListener("focus", handleFocus);

document.addEventListener(
  "visibilitychange",
  handleVisibilityChange
);

return () => {
  window.removeEventListener("focus", handleFocus);

  document.removeEventListener(
    "visibilitychange",
    handleVisibilityChange
  );
};


}, [loadSubscriptionStatus]);

/*
DETERMINE ACTIVE SUBSCRIPTION
*/
const hasActiveSubscription = Boolean(
currentTime > 0 &&
currentSubscription?.status === "active" &&
Number.isFinite(currentSubscription?.expiryTime) &&
currentSubscription.expiryTime > currentTime
);

/*
CURRENT PLAN NAME
*/
const currentPlanName = useMemo(() => {
if (!hasActiveSubscription) {
return null;
}


const planValue = String(
  currentSubscription?.plan || ""
).toLowerCase();

const matchingPlan = plans.find((plan) => {
  return (
    String(plan.slug).toLowerCase() === planValue ||
    String(plan.name).toLowerCase() === planValue
  );
});

return (
  matchingPlan?.name ||
  currentSubscription?.plan ||
  "Premium"
);


}, [
hasActiveSubscription,
currentSubscription,
plans,
]);

/*
LOCAL CURRENCY
*/
const localCurrency = useMemo(
() => getLocalCurrency(currentUser?.country),
[currentUser?.country]
);

/*
LOAD EXCHANGE RATES
*/
useEffect(() => {
let mounted = true;


const loadExchangeRates = async () => {
  if (localCurrency === "MWK") {
    if (mounted) {
      setUsdRates(null);
      setCurrencyLoading(false);
    }

    return;
  }

  setCurrencyLoading(true);

  try {
    const response = await fetch(
      "https://open.er-api.com/v6/latest/USD"
    );

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates.");
    }

    const data = await response.json();

    if (mounted) {
      setUsdRates(data?.rates || null);
    }
  } catch (error) {
    console.error(
      "Failed to load subscription exchange rates:",
      error
    );

    if (mounted) {
      setUsdRates(null);
    }
  } finally {
    if (mounted) {
      setCurrencyLoading(false);
    }
  }
};

loadExchangeRates();

return () => {
  mounted = false;
};


}, [localCurrency]);

/*
CONVERT MWK TO LOCAL CURRENCY
*/
const convertMwkToLocal = (priceMwk) => {
const amount = toNumber(priceMwk);


if (localCurrency === "MWK") {
  return amount;
}

const mwkPerUsd = toNumber(usdRates?.MWK);
const localPerUsd = toNumber(
  usdRates?.[localCurrency]
);

if (!mwkPerUsd || !localPerUsd) {
  return null;
}

return (amount / mwkPerUsd) * localPerUsd;


};

const formatLocalPrice = (priceMwk) => {
if (localCurrency === "MWK") {
return null;
}


if (currencyLoading) {
  return "Converting…";
}

const convertedAmount = convertMwkToLocal(priceMwk);

if (convertedAmount === null) {
  return "—";
}

return formatCurrency(
  convertedAmount,
  localCurrency
);


};

/*
SELECT PREMIUM PLAN
*/
const handleSelectPlan = async (plan) => {
if (!plan?.slug || selectingPlan) {
return;
}


if (subscriptionLoading || hasActiveSubscription) {
  return;
}

const token = localStorage.getItem("token");

if (!token) {
  alert("Please log in before subscribing to Premium.");
  navigate("/login");
  return;
}

setSelectingPlan(plan.slug);

try {
  const response = await fetch(
    `${API_URL}/api/subscription/subscribe`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        planSlug: plan.slug,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.message ||
        "Unable to create Premium subscription."
    );
  }

  console.log("Premium subscription created:", data);

  const checkoutUrl = data?.checkout?.checkoutUrl;

  if (!checkoutUrl) {
    throw new Error(
      "PayChangu checkout URL was not returned."
    );
  }

  window.location.assign(checkoutUrl);
} catch (error) {
  console.error("Premium subscription error:", error);

  alert(
    error.message ||
      "Unable to start Premium subscription. Please try again."
  );
} finally {
  setSelectingPlan(null);
}


};

return ( <div className="subscription-page"> <div className="subscription-container">


    <button
      type="button"
      className="subscription-back-button"
      onClick={() => navigate(-1)}
    >
      <ArrowLeft size={18} />
      Back
    </button>

    {/* HEADER */}

    <div className="subscription-header">
      <div className="subscription-icon">
        <Crown size={30} />
      </div>

      <h1>Premium</h1>

      <p>
        Unlock more from Cave Tunes with Premium access.
      </p>

      {currentUser && (
        <div className="subscription-currency-info">
          Prices are charged in <strong>MWK</strong>.

          {localCurrency !== "MWK" && (
            <>
              {" "}
              Your local equivalent is shown below
              for convenience.
            </>
          )}
        </div>
      )}
    </div>

    {/* SUBSCRIPTION LOADING */}

    {subscriptionLoading && (
      <div className="subscription-status-loading">
        Checking your Premium subscription...
      </div>
    )}

    {/* ACTIVE SUBSCRIPTION */}

    {!subscriptionLoading && hasActiveSubscription && (
      <div className="subscription-active-notice">
        <div className="subscription-active-icon">
          <Crown size={24} />
        </div>

        <div className="subscription-active-content">
          <h3>
            Your Premium subscription is active!
          </h3>

          <p>
            Current plan:{" "}
            <strong>{currentPlanName}</strong>
          </p>

          <p>
            <Clock size={15} />

            {" "}Your Premium access expires on:{" "}

            <strong>
              {formatExpiryDate(
                currentSubscription.expiresAt
              )}
            </strong>
          </p>

          <span>
            You can choose another plan after your
            current subscription expires.
          </span>
        </div>
      </div>
    )}

    {/* EXPIRED SUBSCRIPTION */}

    {!subscriptionLoading &&
      currentTime > 0 &&
      currentSubscription?.status === "active" &&
      Number.isFinite(currentSubscription?.expiryTime) &&
      currentSubscription.expiryTime <= currentTime && (
        <div className="subscription-expired-notice">
          Your previous Premium subscription has expired.
          You can now choose a new plan.
        </div>
      )}

    {/* PLANS LOADING */}

    {plansLoading && (
      <div className="subscription-loading">
        Loading Premium plans...
      </div>
    )}

    {/* PLANS ERROR */}

    {!plansLoading && plansError && (
      <div className="subscription-error">
        <p>{plansError}</p>

        <button
          type="button"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    )}

    {/* NO PLANS */}

    {!plansLoading &&
      !plansError &&
      plans.length === 0 && (
        <div className="subscription-error">
          <p>No Premium plans are currently available.</p>
        </div>
      )}

    {/* PREMIUM PLANS */}

    {!plansLoading &&
      !plansError &&
      plans.length > 0 && (
        <div className="subscription-plans">

          {plans.map((plan) => {
            const localPrice = formatLocalPrice(
              plan.priceMwk
            );

            const isPopular =
              plan.slug === "monthly";

            const isDisabled =
              subscriptionLoading ||
              hasActiveSubscription ||
              selectingPlan !== null;

            return (
              <div
                key={plan.id}
                className={`subscription-plan ${
                  isPopular ? "popular" : ""
                } ${
                  hasActiveSubscription
                    ? "subscription-plan-locked"
                    : ""
                }`}
              >
                {isPopular && (
                  <div className="subscription-popular-badge">
                    <Sparkles size={14} />
                    Most Popular
                  </div>
                )}

                <div className="subscription-plan-header">
                  <h2>{plan.name}</h2>

                  <div className="subscription-price">
                    <strong>
                      {formatMwk(plan.priceMwk)}
                    </strong>

                    <span>
                      {getPlanPeriod(plan)}
                    </span>
                  </div>

                  {localCurrency !== "MWK" && (
                    <div className="subscription-local-price">
                      ≈ {localPrice} {localCurrency}
                    </div>
                  )}

                  <p>
                    {getPlanDescription(plan)}
                  </p>
                </div>

                <div className="subscription-features">
                  {PLAN_FEATURES.map((feature) => (
                    <div
                      key={feature}
                      className="subscription-feature"
                    >
                      <ShieldCheck size={17} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="subscription-select-button"
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isDisabled}
                >
                  {subscriptionLoading
                    ? "Checking subscription..."
                    : hasActiveSubscription
                    ? "Premium Already Active"
                    : selectingPlan === plan.slug
                    ? "Starting..."
                    : `Choose ${plan.name}`}
                </button>
              </div>
            );
          })}

        </div>
      )}

    {/* BENEFITS */}

    <div className="subscription-benefits">

      <div className="subscription-benefit">
        <Download size={22} />

        <div>
          <h3>Premium Downloads</h3>

          <p>
            Download supported Cave Tunes music for
            offline listening inside the app.
          </p>
        </div>
      </div>

      <div className="subscription-benefit">
        <Headphones size={22} />

        <div>
          <h3>Ad-Free Listening</h3>

          <p>
            Enjoy your music without interruptions
            from advertisements.
          </p>
        </div>
      </div>

      <div className="subscription-benefit">
        <Scissors size={22} />

        <div>
          <h3>Sizaro</h3>

          <p>
            Access Premium features in the Cave Tunes
            Sizaro experience.
          </p>
        </div>
      </div>

  <div className="subscription-benefit">
       

        <div>
          <h3>More To Come</h3>

          <p>
            Stay tuned, you will be notified when New features lands inside Cave Tunes.
          </p>
        </div>
      </div>


    </div>

    {/* SECURITY */}

    <div className="subscription-security">
      <ShieldCheck size={18} />

      <span>
        Your Premium status is verified by the Cave
        Tunes server after payment confirmation.
      </span>
    </div>

  </div>
</div>


);
}
