import {
  Wallet as WalletIcon,
  DollarSign,
  Music2,
  Download,
  ArrowUpRight,
  Clock,
  CreditCard,
  RefreshCw,
  Smartphone,
  Building2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getCurrentUser,
  getWallet,
  getWalletTransactions,
  getWalletPayoutMethods,
  addWalletPayoutMethod,
  requestWalletWithdrawal,
  getMyRoyaltySettlementSummary,
  settleMyRoyalties,
} from "../services/api";

import "./Wallet.css";

const WALLET_CURRENCY = "USD";

/*
 * ======================================================
 * MONTHLY FINANCIAL RELEASE SCHEDULE
 * ======================================================
 *
 * Withdrawals and royalty settlements are available
 * from the 28th until the end of every month.
 *
 * Official timezone: Africa/Blantyre
 */

const FINANCIAL_TIME_ZONE = "Africa/Blantyre";

function getMonthlyFinancialSchedule() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: FINANCIAL_TIME_ZONE,
        day: "numeric",
        month: "numeric",
        year: "numeric",
    }).formatToParts(new Date());

    const values = {};

    parts.forEach((part) => {
        if (part.type !== "literal") {
            values[part.type] = Number(part.value);
        }
    });

    const day = values.day;
    const month = values.month;
    const year = values.year;

    const isOpen = day >= 28;

    const unlockDate = new Date(
        Date.UTC(year, month - 1, 28)
    );

    const unlockLabel = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(unlockDate);

    return {
        isOpen,
        currentDay: day,
        unlockLabel,
        timezone: FINANCIAL_TIME_ZONE,
    };
}

/*
 * ======================================================
 * COUNTRY -> LOCAL CURRENCY
 * ======================================================
 *
 * Wallet accounting remains in USD.
 * Local currency is display-only.
 */

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

/*
 * ======================================================
 * HELPERS
 * ======================================================
 */

function getLocalCurrency(country) {
  const normalizedCountry = String(country || "")
    .trim()
    .toUpperCase();

  return COUNTRY_CURRENCIES[normalizedCountry] || "USD";
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatUSD(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: WALLET_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatCurrency(value, currency) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getTransactionIcon(type) {
  switch (String(type || "").toLowerCase()) {
    case "royalty":
      return <Music2 size={18} />;

    case "download_sale":
      return <Download size={18} />;

    case "withdrawal":
      return <ArrowUpRight size={18} />;

    case "bonus":
      return <DollarSign size={18} />;

    default:
      return <WalletIcon size={18} />;
  }
}

function getTransactionLabel(type) {
  switch (String(type || "").toLowerCase()) {
    case "royalty":
      return "Royalty";

    case "download_sale":
      return "Download Sale";

    case "withdrawal":
      return "Withdrawal";

    case "bonus":
      return "Bonus";

    case "adjustment":
      return "Adjustment";

    case "refund":
      return "Refund";

    default:
      return type || "Transaction";
  }
}

function getTransactionStatusClass(status) {
  switch (String(status || "").toLowerCase()) {
    case "completed":
      return "completed";

    case "pending":
      return "pending";

    case "failed":
    case "reversed":
      return "failed";

    default:
      return "";
  }
}

function getPaymentMethodLabel(method) {
  const type = String(
    method?.method_type ||
      method?.type ||
      ""
  ).toLowerCase();

  switch (type) {
    case "airtel_money":
      return "Airtel Money";

    case "tnm_mpamba":
      return "TNM Mpamba";

    case "bank_transfer":
      return "Bank Transfer";

    default:
      return (
        method?.method_type ||
        "Payment Method"
      );
  }
}

/*
 * ======================================================
 * WALLET PAGE
 * ======================================================
 */

export default function Wallet() {
  /*
   * ====================================================
   * USER
   * ====================================================
   */

  const [currentUser, setCurrentUser] =
    useState(null);

  /*
   * ====================================================
   * WALLET DATA
   * ====================================================
   */

  const [wallet, setWallet] =
    useState(null);

  const [transactions, setTransactions] =
    useState([]);

  const [payoutMethods, setPayoutMethods] =
    useState([]);

  const [settlementSummary, setSettlementSummary] =
    useState(null);

  /*
   * ====================================================
   * PAGE STATE
   * ====================================================
   */

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

/*
 * ====================================================
 * MONTHLY FINANCIAL SCHEDULE
 * ====================================================
 */

const [financialSchedule, setFinancialSchedule] =
    useState(() => getMonthlyFinancialSchedule());

  /*
   * ====================================================
   * LOCAL CURRENCY
   * ====================================================
   */

  const localCurrency = useMemo(
    () =>
      getLocalCurrency(
        currentUser?.country
      ),
    [currentUser?.country]
  );

  /*
   * ====================================================
   * EXCHANGE RATE
   * ====================================================
   */

  const [exchangeRate, setExchangeRate] =
    useState(null);

  const [exchangeLoading, setExchangeLoading] =
    useState(false);

  /*
   * ====================================================
   * WITHDRAWAL
   * ====================================================
   */

  const [withdrawalOpen, setWithdrawalOpen] =
    useState(false);

  const [withdrawalAmount, setWithdrawalAmount] =
    useState("");

  const [selectedPayoutMethod, setSelectedPayoutMethod] =
    useState("");

  const [withdrawing, setWithdrawing] =
    useState(false);

  const [withdrawalMessage, setWithdrawalMessage] =
    useState("");

  const [withdrawalError, setWithdrawalError] =
    useState("");

  /*
   * ====================================================
   * WITHDRAWAL REFS
   * ====================================================
   *
   * Used to automatically scroll to the withdrawal
   * section and focus the amount input.
   */

  const withdrawalSectionRef =
    useRef(null);

  const withdrawalAmountInputRef =
    useRef(null);

  /*
   * ====================================================
   * PAYMENT METHOD
   * ====================================================
   */

  const [paymentMethodOpen, setPaymentMethodOpen] =
    useState(false);

  const [paymentMethodType, setPaymentMethodType] =
    useState("airtel_money");

  const [accountHolderName, setAccountHolderName] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [bankName, setBankName] =
    useState("");

  const [accountNumber, setAccountNumber] =
    useState("");

  const [accountType, setAccountType] =
    useState("");

  const [branchName, setBranchName] =
    useState("");

  const [addingPaymentMethod, setAddingPaymentMethod] =
    useState(false);

  const [paymentMethodError, setPaymentMethodError] =
    useState("");

  /*
   * ====================================================
   * ROYALTY SETTLEMENT
   * ====================================================
   */

  const [settling, setSettling] =
    useState(false);

  const [settlementMessage, setSettlementMessage] =
    useState("");

  const [settlementError, setSettlementError] =
    useState("");

  /*
   * ====================================================
   * WALLET VALUES
   * ====================================================
   */

  const availableBalance = useMemo(
    () =>
      toNumber(
        wallet?.available_balance
      ),
    [wallet]
  );

  const pendingBalance = useMemo(
    () =>
      toNumber(
        wallet?.pending_balance
      ),
    [wallet]
  );

  const lifetimeEarnings = useMemo(
    () =>
      toNumber(
        wallet?.lifetime_earnings
      ),
    [wallet]
  );


const hasPendingWithdrawal = useMemo(() => {
  return transactions.some((transaction) => {
    return (
      String(transaction?.type || "").toLowerCase() ===
        "withdrawal" &&
      String(transaction?.status || "").toLowerCase() ===
        "pending"
    );
  });
}, [transactions]);


  /*
   * ====================================================
   * ROYALTY VALUES
   * ====================================================
   */

  const totalEstimatedEarnings = useMemo(
    () =>
      toNumber(
        settlementSummary?.total_estimated_earnings ??
          settlementSummary?.totalEstimatedEarnings
      ),
    [settlementSummary]
  );

  const alreadySettled = useMemo(
    () =>
      toNumber(
        settlementSummary?.already_settled ??
          settlementSummary?.alreadySettled
      ),
    [settlementSummary]
  );

  const unsettledEarnings = useMemo(
    () =>
      toNumber(
        settlementSummary?.unsettled_earnings ??
          settlementSummary?.unsettledEarnings
      ),
    [settlementSummary]
  );

  /*
   * ====================================================
   * LOAD WALLET
   * ====================================================
   */

  const loadWallet = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const [
          userResponse,
          walletResponse,
          transactionResponse,
          payoutResponse,
          settlementResponse,
        ] = await Promise.all([
          getCurrentUser(),

          getWallet(),

          getWalletTransactions({
            limit: 100,
            offset: 0,
          }),

          getWalletPayoutMethods(),

          getMyRoyaltySettlementSummary(),
        ]);

        setCurrentUser(
          userResponse?.user || null
        );

        setWallet(
          walletResponse?.wallet ||
            walletResponse ||
            null
        );

        setTransactions(
          transactionResponse?.transactions ||
            (Array.isArray(
              transactionResponse
            )
              ? transactionResponse
              : [])
        );

        setPayoutMethods(
          payoutResponse?.methods ||
            payoutResponse?.payoutMethods ||
            (Array.isArray(
              payoutResponse
            )
              ? payoutResponse
              : [])
        );

        setSettlementSummary(
          settlementResponse?.summary ||
            settlementResponse ||
            null
        );
      } catch (err) {
        console.error(
          "LOAD WALLET ERROR:",
          err
        );

        setError(
          err?.message ||
            "Unable to load your wallet."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /*
 * ====================================================
 * AUTOMATIC FINANCIAL SCHEDULE REFRESH
 * ====================================================
 *
 * Checks the Malawi calendar every minute.
 * This allows the buttons to unlock automatically
 * on the 28th without refreshing the page.
 */

useEffect(() => {
    const timer = window.setInterval(() => {
        setFinancialSchedule(
            getMonthlyFinancialSchedule()
        );
    }, 60000);

    return () => {
        window.clearInterval(timer);
    };
}, []);
  /*
   * ====================================================
   * INITIAL LOAD
   * ====================================================
   */

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadWallet(false);
      }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadWallet]);

  /*
   * ====================================================
   * EXCHANGE RATE
   * ====================================================
   */

  useEffect(() => {
    if (localCurrency === "USD") {
      return undefined;
    }

    let cancelled = false;

    const loadExchangeRate = async () => {
      try {
        setExchangeLoading(true);

        const response = await fetch(
          "https://open.er-api.com/v6/latest/USD"
        );

        if (!response.ok) {
          throw new Error(
            "Unable to retrieve exchange rate."
          );
        }

        const data =
          await response.json();

        const rate = toNumber(
          data?.rates?.[localCurrency]
        );

        if (!cancelled) {
          setExchangeRate(
            rate > 0
              ? rate
              : null
          );

          setExchangeLoading(false);
        }
      } catch (err) {
        console.error(
          "EXCHANGE RATE ERROR:",
          err
        );

        if (!cancelled) {
          setExchangeRate(null);
          setExchangeLoading(false);
        }
      }
    };

    void loadExchangeRate();

    return () => {
      cancelled = true;
    };
  }, [localCurrency]);

  /*
   * ====================================================
   * USD -> LOCAL
   * ====================================================
   */

  const convertUSD = useCallback(
    (amount) => {
      const value =
        toNumber(amount);

      if (
        localCurrency ===
        "USD"
      ) {
        return value;
      }

      if (!exchangeRate) {
        return null;
      }

      return (
        value * exchangeRate
      );
    },
    [
      exchangeRate,
      localCurrency,
    ]
  );

  const formatLocal = useCallback(
    (amount) => {
      if (
        localCurrency ===
        "USD"
      ) {
        return formatCurrency(
          amount,
          "USD"
        );
      }

      if (exchangeLoading) {
        return "Converting…";
      }

      const converted =
        convertUSD(amount);

      if (converted === null) {
        return "—";
      }

      return formatCurrency(
        converted,
        localCurrency
      );
    },
    [
      convertUSD,
      exchangeLoading,
      localCurrency,
    ]
  );

  /*
   * ====================================================
   * OPEN WITHDRAWAL SECTION
   * ====================================================
   *
   * Opens the withdrawal form, scrolls to it and
   * automatically focuses the amount field.
   */

const openWithdrawalSection = () => {

    // Monthly financial schedule protection
    if (!financialSchedule.isOpen) {
        setWithdrawalError(
            `Withdrawals become available on ${financialSchedule.unlockLabel}.`
        );

        setWithdrawalMessage("");

        return;
    }

    // Existing pending withdrawal protection
    if (hasPendingWithdrawal) {
        setWithdrawalError(
            "You already have a withdrawal request being processed. Please wait until it is approved or rejected."
        );

        return;
    }

    setWithdrawalError("");
    setWithdrawalMessage("");
    setWithdrawalOpen(true);

    window.setTimeout(() => {
        withdrawalSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });

        window.setTimeout(() => {
            withdrawalAmountInputRef.current?.focus();
        }, 500);
    }, 50);
};
  /*
   * ====================================================
   * WITHDRAWAL
   * ====================================================
   */

  const handleWithdrawal = async (
    event
  ) => {
    event.preventDefault();
// Prevent withdrawal submission outside
// the monthly financial release window.
if (!financialSchedule.isOpen) {
    setWithdrawalError(
        `Withdrawals become available on ${financialSchedule.unlockLabel}.`
    );

    return;
}
    setWithdrawalError("");
    setWithdrawalMessage("");

    const amount =
      Number(
        withdrawalAmount
      );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setWithdrawalError(
        "Enter a valid withdrawal amount."
      );

      return;
    }

    if (
      amount >
      availableBalance
    ) {
      setWithdrawalError(
        "Withdrawal amount exceeds your available balance."
      );

      return;
    }

    if (
      !selectedPayoutMethod
    ) {
      setWithdrawalError(
        "Please select a payout method."
      );

      return;
    }

    try {
      setWithdrawing(true);

      const response =
        await requestWalletWithdrawal(
          amount,
          Number(
            selectedPayoutMethod
          )
        );

      if (
        response?.success ===
        false
      ) {
        throw new Error(
          response?.message ||
            "Unable to submit withdrawal."
        );
      }

    
setWithdrawalMessage(
  response?.message ||
    "Withdrawal request submitted successfully."
);

// Clear the form
setWithdrawalAmount("");
setSelectedPayoutMethod("");

// Close the withdrawal form immediately
setWithdrawalOpen(false);

// Refresh wallet so the new pending withdrawal
// appears in the transaction history and
// hasPendingWithdrawal becomes true.
await loadWallet(true);

    } catch (err) {
      console.error(
        "WITHDRAWAL ERROR:",
        err
      );

      setWithdrawalError(
        err?.message ||
          "Unable to submit withdrawal request."
      );
    } finally {
      setWithdrawing(false);
    }
  };

  /*
   * ====================================================
   * ADD PAYMENT METHOD
   * ====================================================
   */

  const handleAddPaymentMethod = async (
    event
  ) => {
    event.preventDefault();

    setPaymentMethodError("");

    if (
      !accountHolderName.trim()
    ) {
      setPaymentMethodError(
        "Account holder name is required."
      );

      return;
    }

    const isMobile =
      paymentMethodType ===
        "airtel_money" ||
      paymentMethodType ===
        "tnm_mpamba";

    if (
      isMobile &&
      !phoneNumber.trim()
    ) {
      setPaymentMethodError(
        "Phone number is required."
      );

      return;
    }

    if (
      paymentMethodType ===
        "bank_transfer" &&
      !bankName.trim()
    ) {
      setPaymentMethodError(
        "Bank name is required."
      );

      return;
    }

    if (
      paymentMethodType ===
        "bank_transfer" &&
      !accountNumber.trim()
    ) {
      setPaymentMethodError(
        "Account number is required."
      );

      return;
    }

    try {
      setAddingPaymentMethod(true);

      const payload = {
        methodType:
          paymentMethodType,

        accountHolderName:
          accountHolderName.trim(),

        phoneNumber:
          isMobile
            ? phoneNumber.trim()
            : null,

        bankName:
          paymentMethodType ===
          "bank_transfer"
            ? bankName.trim()
            : null,

        accountNumber:
          paymentMethodType ===
          "bank_transfer"
            ? accountNumber.trim()
            : null,

        accountType:
          paymentMethodType ===
          "bank_transfer"
            ? accountType.trim() ||
              null
            : null,

        branchName:
          paymentMethodType ===
          "bank_transfer"
            ? branchName.trim() ||
              null
            : null,

        bankCode: null,

        isDefault:
          payoutMethods.length ===
          0,
      };

      console.log(
        "ADDING PAYOUT METHOD:",
        payload
      );

      const response =
        await addWalletPayoutMethod(
          payload
        );

      if (
        response?.success ===
        false
      ) {
        throw new Error(
          response?.message ||
            "Unable to add payment method."
        );
      }

      setAccountHolderName("");
      setPhoneNumber("");
      setBankName("");
      setAccountNumber("");
      setAccountType("");
      setBranchName("");

      setPaymentMethodError("");
      setPaymentMethodOpen(false);

      await loadWallet(true);
    } catch (err) {
      console.error(
        "ADD PAYMENT METHOD ERROR:",
        err
      );

      setPaymentMethodError(
        err?.message ||
          "Unable to add payment method."
      );
    } finally {
      setAddingPaymentMethod(false);
    }
  };

  /*
   * ====================================================
   * SETTLE ROYALTIES
   * ====================================================
   */

  const handleSettleRoyalties =
    async () => {
      if (settling) {
        return;
      }
if (!financialSchedule.isOpen) {
    setSettlementError(
        `Royalty settlements become available on ${financialSchedule.unlockLabel}.`
    );

    return;
}
      setSettlementError("");
      setSettlementMessage("");

      try {
        setSettling(true);

        const response =
          await settleMyRoyalties();

        if (
          response?.success ===
          false
        ) {
          throw new Error(
            response?.message ||
              "Unable to settle royalties."
          );
        }

        setSettlementMessage(
          response?.message ||
            "Royalties settled successfully."
        );

        await loadWallet(true);
      } catch (err) {
        console.error(
          "SETTLE ROYALTIES ERROR:",
          err
        );

        setSettlementError(
          err?.message ||
            "Unable to settle royalties."
        );
      } finally {
        setSettling(false);
      }
    };

  /*
   * ====================================================
   * LOADING
   * ====================================================
   */

  if (loading) {
    return (
      <div className="wallet-page">
        <div className="wallet-loading">

          <RefreshCw
            size={24}
            className="wallet-spin"
          />

          <span>
            Loading wallet...
          </span>

        </div>
      </div>
    );
  }

  /*
   * ====================================================
   * ERROR
   * ====================================================
   */

  if (error) {
    return (
      <div className="wallet-page">

        <div className="wallet-error">

          <AlertCircle
            size={28}
          />

          <div>

            <h3>
              Unable to load wallet
            </h3>

            <p>
              {error}
            </p>

          </div>

          <button
            type="button"
            className="wallet-btn wallet-btn-primary"
            onClick={() =>
              void loadWallet(false)
            }
          >
            <RefreshCw
              size={17}
            />

            Retry
          </button>

        </div>

      </div>
    );
  }

  /*
   * ====================================================
   * PAGE
   * ====================================================
   */

  return (
    <div className="wallet-page">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="wallet-page-header">

        <div>

          <span className="wallet-eyebrow">
            FINANCIAL CENTER
          </span>

          <h1>
            Wallet
          </h1>

          <p>
            Manage your earnings,
            royalties, payouts and
            transactions.
          </p>

        </div>

        <button
          type="button"
          className="wallet-refresh-btn"
          onClick={() =>
            void loadWallet(true)
          }
          disabled={refreshing}
        >

          <RefreshCw
            size={17}
            className={
              refreshing
                ? "wallet-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}

        </button>

      </div>

      {/* ================================================= */}
      {/* BALANCE */}
      {/* ================================================= */}
{/* ================================================= */}
{/* MONTHLY FINANCIAL RELEASE SCHEDULE */}
{/* ================================================= */}

<div className={`wallet-schedule-notice ${
    financialSchedule.isOpen
        ? "wallet-schedule-open"
        : "wallet-schedule-closed"
}`}>

    <div className="wallet-schedule-indicator">
        {financialSchedule.isOpen ? (
            <CheckCircle2 size={22} />
        ) : (
            <Clock size={22} />
        )}
    </div>

    <div className="wallet-schedule-content">

        <strong>
            {financialSchedule.isOpen
                ? "Monthly Financial Window Is Open"
                : "Monthly Financial Window Is Closed"}
        </strong>

        <p>
            {financialSchedule.isOpen
                ? "You can now settle your royalties and request withdrawals. Financial operations remain available until the end of this month."
                : `Withdrawals and royalty settlements will become available on ${financialSchedule.unlockLabel}.`}
        </p>

        <small>
            Monthly release date: 28th
            {" • "}
            Malawi Time (CAT)
        </small>

    </div>

</div>
      <section className="wallet-balance-card">

        <div className="wallet-balance-icon">

          <WalletIcon
            size={26}
          />

        </div>

        <div className="wallet-balance-content">

          <span className="wallet-card-label">
            Available Balance
          </span>

          <strong className="wallet-main-balance">
            {formatUSD(
              availableBalance
            )}
          </strong>

          <span className="wallet-local-balance">

            {exchangeLoading
              ? "Converting to local currency..."
              : `≈ ${formatLocal(
                  availableBalance
                )}`}

          </span>

          <small>
            Wallet currency: USD
          </small>

        </div>

       <button
        type="button"
        className="wallet-btn wallet-btn-primary"
        onClick={
          openWithdrawalSection
        }
       disabled={
    !financialSchedule.isOpen ||
    availableBalance <= 0 ||
    hasPendingWithdrawal
}
    title={
    !financialSchedule.isOpen
        ? `Available from ${financialSchedule.unlockLabel}`
        : hasPendingWithdrawal
            ? "You already have a withdrawal request being processed."
            : ""
}
      >

         <ArrowUpRight size={17} />

{!financialSchedule.isOpen
    ? "Available on 28th"
    : hasPendingWithdrawal
        ? "Withdrawal Pending"
        : "Withdraw"}
</button>

      </section>

      {/* ================================================= */}
      {/* SUMMARY */}
      {/* ================================================= */}

      <div className="wallet-stats-grid">

        <div className="wallet-stat-card">

          <div className="wallet-stat-icon">
            <DollarSign
              size={20}
            />
          </div>

          <span>
            Total Estimated Earnings
          </span>

          <strong>
            {formatUSD(
              totalEstimatedEarnings
            )}
          </strong>

          <small>
            All royalty activity
          </small>

        </div>

        <div className="wallet-stat-card">

          <div className="wallet-stat-icon">

            <CheckCircle2
              size={20}
            />

          </div>

          <span>
            Already Settled
          </span>

          <strong>
            {formatUSD(
              alreadySettled
            )}
          </strong>

          <small>
            Credited to wallet
          </small>

        </div>

        <div className="wallet-stat-card">

          <div className="wallet-stat-icon">

            <Clock
              size={20}
            />

          </div>

          <span>
            Unsettled Earnings
          </span>

          <strong>
            {formatUSD(
              unsettledEarnings
            )}
          </strong>

          <small>
            Waiting for settlement
          </small>

        </div>

        <div className="wallet-stat-card">

          <div className="wallet-stat-icon">

            <ArrowUpRight
              size={20}
            />

          </div>

          <span>
            Pending Withdrawals
          </span>

          <strong>
            {formatUSD(
              pendingBalance
            )}
          </strong>

          <small>
            Currently being processed
          </small>

        </div>

      </div>

      {/* ================================================= */}
      {/* ROYALTY SETTLEMENT */}
      {/* ================================================= */}

      <section className="wallet-section">

        <div className="wallet-section-header">

          <div>

            <span className="wallet-section-kicker">
              ROYALTIES
            </span>

            <h2>
              Royalty Settlement
            </h2>

            <p>
              Settle newly generated
              royalty earnings without
              mixing them with previous
              settlement periods.
            </p>

          </div>

          <button
            type="button"
            className="wallet-btn wallet-btn-primary"
            onClick={
              handleSettleRoyalties
            }
          disabled={
    !financialSchedule.isOpen ||
    settling ||
    unsettledEarnings <= 0
}
          >

            <RefreshCw
              size={17}
              className={
                settling
                  ? "wallet-spin"
                  : ""
              }
            />

        {settling
    ? "Settling..."
    : !financialSchedule.isOpen
        ? "Available on 28th"
        : "Settle Royalties"}

          </button>

        </div>

        {settlementMessage && (
          <div className="wallet-success-message">

            <CheckCircle2
              size={18}
            />

            {settlementMessage}

          </div>
        )}

        {settlementError && (
          <div className="wallet-error-message">

            <AlertCircle
              size={18}
            />

            {settlementError}

          </div>
        )}

        <div className="wallet-royalty-grid">

          <div>

            <span>
              Estimated
            </span>

            <strong>
              {formatUSD(
                totalEstimatedEarnings
              )}
            </strong>

          </div>

          <div>

            <span>
              Settled
            </span>

            <strong>
              {formatUSD(
                alreadySettled
              )}
            </strong>

          </div>

          <div>

            <span>
              Unsettled
            </span>

            <strong>
              {formatUSD(
                unsettledEarnings
              )}
            </strong>

          </div>

        </div>

      </section>

      {/* ================================================= */}
      {/* WITHDRAWAL FORM */}
      {/* ================================================= */}

      {withdrawalOpen && (
        <section
          ref={withdrawalSectionRef}
          className="wallet-section"
        >

          <div className="wallet-section-header">

            <div>

              <span className="wallet-section-kicker">
                PAYOUT
              </span>

              <h2>
                Request Withdrawal
              </h2>

              <p>
                Available balance:{" "}
                <strong>
                  {formatUSD(
                    availableBalance
                  )}
                </strong>
              </p>

            </div>

            <button
              type="button"
              className="wallet-close-btn"
              onClick={() =>
                setWithdrawalOpen(
                  false
                )
              }
            >
              Close
            </button>

          </div>

          {withdrawalError && (
            <div className="wallet-error-message">

              <AlertCircle
                size={18}
              />

              {withdrawalError}

            </div>
          )}

          {withdrawalMessage && (
            <div className="wallet-success-message">

              <CheckCircle2
                size={18}
              />

              {withdrawalMessage}

            </div>
          )}

          <form
            className="wallet-form"
            onSubmit={
              handleWithdrawal
            }
          >

            <div className="wallet-form-group">

              <label htmlFor="withdrawalAmount">
                Amount (USD)
              </label>

              <input
                ref={
                  withdrawalAmountInputRef
                }
                id="withdrawalAmount"
                type="number"
                min="0.01"
                step="0.01"
                value={
                  withdrawalAmount
                }
                onChange={(event) =>
                  setWithdrawalAmount(
                    event.target.value
                  )
                }
                placeholder="0.00"
              />

            </div>

            <div className="wallet-form-group">

              <label htmlFor="payoutMethod">
                Payout Method
              </label>

              <select
                id="payoutMethod"
                value={
                  selectedPayoutMethod
                }
                onChange={(event) =>
                  setSelectedPayoutMethod(
                    event.target.value
                  )
                }
              >

                <option value="">
                  Select payout method
                </option>

                {payoutMethods.map(
                  (method) => (
                    <option
                      key={method.id}
                      value={method.id}
                    >

                      {getPaymentMethodLabel(
                        method
                      )}

                      {" — "}

                      {method.account_holder_name ||
                        method.accountHolderName ||
                        ""}

                    </option>
                  )
                )}

              </select>

              {payoutMethods.length ===
                0 && (
                <small>
                  Add a payment method
                  below before requesting
                  a withdrawal.
                </small>
              )}

            </div>

            <div className="wallet-form-actions">

              <button
                type="button"
                className="wallet-btn wallet-btn-secondary"
                onClick={() =>
                  setWithdrawalOpen(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="wallet-btn wallet-btn-primary"
                disabled={
                  withdrawing
                }
              >

                {withdrawing ? (
                  <>
                    <RefreshCw
                      size={17}
                      className="wallet-spin"
                    />

                    Submitting...
                  </>
                ) : (
                  <>
                    <ArrowUpRight
                      size={17}
                    />

                    Request Withdrawal
                  </>
                )}

              </button>

            </div>

          </form>

        </section>
      )}

      {/* ================================================= */}
      {/* PAYMENT METHODS */}
      {/* ================================================= */}

      <section className="wallet-section">

        <div className="wallet-section-header">

          <div>

            <span className="wallet-section-kicker">
              PAYOUT SETTINGS
            </span>

            <h2>
              Payment Methods
            </h2>

            <p>
              Manage where your
              withdrawals should be sent.
            </p>

          </div>

          <button
            type="button"
            className="wallet-btn wallet-btn-primary"
            onClick={() => {
              setPaymentMethodError("");

              setPaymentMethodOpen(
                (current) =>
                  !current
              );
            }}
          >

            <CreditCard
              size={17}
            />

            {paymentMethodOpen
              ? "Close"
              : "Add Payment Method"}

          </button>

        </div>

        {paymentMethodOpen && (
          <form
            className="wallet-form"
            onSubmit={
              handleAddPaymentMethod
            }
          >

            {paymentMethodError && (
              <div className="wallet-error-message">

                <AlertCircle
                  size={18}
                />

                {paymentMethodError}

              </div>
            )}

            <div className="wallet-form-group">

              <label htmlFor="paymentType">
                Payment Type
              </label>

              <select
                id="paymentType"
                value={
                  paymentMethodType
                }
                onChange={(event) =>
                  setPaymentMethodType(
                    event.target.value
                  )
                }
              >

                <option value="airtel_money">
                  Airtel Money
                </option>

                <option value="tnm_mpamba">
                  TNM Mpamba
                </option>

                <option value="bank_transfer">
                  Bank Transfer
                </option>

              </select>

            </div>

            <div className="wallet-form-group">

              <label htmlFor="accountHolder">
                Account Holder Name
              </label>

              <input
                id="accountHolder"
                type="text"
                value={
                  accountHolderName
                }
                onChange={(event) =>
                  setAccountHolderName(
                    event.target.value
                  )
                }
                placeholder="Full name"
              />

            </div>

            {(paymentMethodType ===
              "airtel_money" ||
              paymentMethodType ===
                "tnm_mpamba") && (
              <div className="wallet-form-group">

                <label htmlFor="phoneNumber">
                  Phone Number
                </label>

                <input
                  id="phoneNumber"
                  type="tel"
                  value={
                    phoneNumber
                  }
                  onChange={(event) =>
                    setPhoneNumber(
                      event.target.value
                    )
                  }
                  placeholder="0881234567"
                />

              </div>
            )}

            {paymentMethodType ===
              "bank_transfer" && (
              <>

                <div className="wallet-form-group">

                  <label htmlFor="bankName">
                    Bank Name
                  </label>

                  <input
                    id="bankName"
                    type="text"
                    value={
                      bankName
                    }
                    onChange={(event) =>
                      setBankName(
                        event.target.value
                      )
                    }
                    placeholder="Bank name"
                  />

                </div>

                <div className="wallet-form-group">

                  <label htmlFor="accountNumber">
                    Account Number
                  </label>

                  <input
                    id="accountNumber"
                    type="text"
                    value={
                      accountNumber
                    }
                    onChange={(event) =>
                      setAccountNumber(
                        event.target.value
                      )
                    }
                    placeholder="Account number"
                  />

                </div>

                <div className="wallet-form-group">

                  <label htmlFor="accountType">
                    Account Type
                  </label>

                  <input
                    id="accountType"
                    type="text"
                    value={
                      accountType
                    }
                    onChange={(event) =>
                      setAccountType(
                        event.target.value
                      )
                    }
                    placeholder="Savings / Current"
                  />

                </div>

                <div className="wallet-form-group">

                  <label htmlFor="branchName">
                    Branch
                  </label>

                  <input
                    id="branchName"
                    type="text"
                    value={
                      branchName
                    }
                    onChange={(event) =>
                      setBranchName(
                        event.target.value
                      )
                    }
                    placeholder="Branch name"
                  />

                </div>

              </>
            )}

            <div className="wallet-form-actions">

              <button
                type="button"
                className="wallet-btn wallet-btn-secondary"
                onClick={() =>
                  setPaymentMethodOpen(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="wallet-btn wallet-btn-primary"
                disabled={
                  addingPaymentMethod
                }
              >

                {addingPaymentMethod ? (
                  <>
                    <RefreshCw
                      size={17}
                      className="wallet-spin"
                    />

                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={17}
                    />

                    Save Payment Method
                  </>
                )}

              </button>

            </div>

          </form>
        )}

        <div className="wallet-payment-methods">

          {payoutMethods.length ===
          0 ? (
            <div className="wallet-empty-state">

              <CreditCard
                size={28}
              />

              <h3>
                No payment methods
              </h3>

              <p>
                Add a payout method to
                receive your withdrawals.
              </p>

            </div>
          ) : (
            payoutMethods.map(
              (method) => (
                <div
                  className="wallet-payment-card"
                  key={method.id}
                >

                  <div className="wallet-payment-icon">

                    {String(
                      method.method_type ||
                        method.type ||
                        ""
                    ).includes(
                      "bank"
                    ) ? (
                      <Building2
                        size={21}
                      />
                    ) : (
                      <Smartphone
                        size={21}
                      />
                    )}

                  </div>

                  <div className="wallet-payment-info">

                    <strong>
                      {getPaymentMethodLabel(
                        method
                      )}
                    </strong>

                    <span>
                      {method.account_holder_name ||
                        method.accountHolderName ||
                        "Account holder"}
                    </span>

                    {method.phone_number && (
                      <small>
                        {
                          method.phone_number
                        }
                      </small>
                    )}

                    {method.bank_name && (
                      <small>

                        {
                          method.bank_name
                        }

                        {method.account_number
                          ? ` •••• ${String(
                              method.account_number
                            ).slice(-4)}`
                          : ""}

                      </small>
                    )}

                  </div>

                  {method.is_default && (
                    <span className="wallet-default-badge">
                      Default
                    </span>
                  )}

                </div>
              )
            )
          )}

        </div>

      </section>

      {/* ================================================= */}
      {/* WALLET INFORMATION */}
      {/* ================================================= */}

      <section className="wallet-section">

        <div className="wallet-section-header">

          <div>

            <span className="wallet-section-kicker">
              WALLET OVERVIEW
            </span>

            <h2>
              Account Summary
            </h2>

          </div>

        </div>

        <div className="wallet-account-grid">

          <div>

            <span>
              Available Balance
            </span>

            <strong>
              {formatUSD(
                availableBalance
              )}
            </strong>

          </div>

          <div>

            <span>
              Pending Balance
            </span>

            <strong>
              {formatUSD(
                pendingBalance
              )}
            </strong>

          </div>

          <div>

            <span>
              Lifetime Earnings
            </span>

            <strong>
              {formatUSD(
                lifetimeEarnings
              )}
            </strong>

          </div>

          <div>

            <span>
              Local Currency
            </span>

            <strong>
              {localCurrency}
            </strong>

          </div>

        </div>

      </section>

      {/* ================================================= */}
      {/* TRANSACTIONS */}
      {/* ================================================= */}

      <section className="wallet-section">

        <div className="wallet-section-header">

          <div>

            <span className="wallet-section-kicker">
              ACTIVITY
            </span>

            <h2>
              Transaction History
            </h2>

            <p>
              Your latest wallet activity.
            </p>

          </div>

          <Clock
            size={22}
          />

        </div>

        {transactions.length ===
        0 ? (
          <div className="wallet-empty-state">

            <WalletIcon
              size={30}
            />

            <h3>
              No transactions yet
            </h3>

            <p>
              Your wallet transactions
              will appear here.
            </p>

          </div>
        ) : (
          <div className="wallet-transactions">

            {transactions.map(
              (
                transaction,
                index
              ) => {

                const amount =
                  toNumber(
                    transaction.amount
                  );

                const isNegative =
                  amount < 0;

                return (
                  <div
                    className="wallet-transaction"
                    key={
                      transaction.id ??
                      `transaction-${index}`
                    }
                  >

                    <div className="wallet-transaction-icon">

                      {getTransactionIcon(
                        transaction.type
                      )}

                    </div>

                    <div className="wallet-transaction-info">

                      <strong>
                        {getTransactionLabel(
                          transaction.type
                        )}
                      </strong>

                      <span>
                        {transaction.description ||
                          transaction.reference ||
                          "Wallet transaction"}
                      </span>

                      <small>
                        {formatDate(
                          transaction.created_at ||
                            transaction.createdAt
                        )}
                      </small>

                    </div>

                    <div className="wallet-transaction-right">

                      <strong
                        className={
                          isNegative
                            ? "wallet-negative"
                            : "wallet-positive"
                        }
                      >

                        {isNegative
                          ? "-"
                          : "+"}

                        {formatUSD(
                          Math.abs(
                            amount
                          )
                        )}

                      </strong>

           <span
    className={`wallet-status ${getTransactionStatusClass(
        transaction.status
    )}`}
>
    {transaction.status || "unknown"}
</span>

{String(transaction.type || "").toLowerCase() ===
    "withdrawal" &&
    String(transaction.status || "").toLowerCase() ===
        "failed" &&
    transaction.rejection_reason && (
        <div className="wallet-rejection-reason">
            <span className="wallet-rejection-label">
                Rejected
            </span>

            <span className="wallet-rejection-text">
                {transaction.rejection_reason}
            </span>
        </div>
    )}

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* ================================================= */}
      {/* CURRENCY INFORMATION */}
      {/* ================================================= */}

      <section className="wallet-currency-info">

        <div className="wallet-currency-icon">

          <DollarSign
            size={20}
          />

        </div>

        <div>

          <strong>
            Wallet currency: USD
          </strong>

          <p>
            Your actual wallet and
            royalty accounting remain
            in USD. Local currency
            values shown on this page
            are display conversions only.
          </p>

          <small>

            Account country:{" "}
            {currentUser?.country ||
              "Not set"}

            {" • "}

            Local display currency:{" "}
            {localCurrency}

            {exchangeRate
              ? ` • 1 USD ≈ ${exchangeRate.toFixed(
                  4
                )} ${localCurrency}`
              : ""}

          </small>

        </div>

      </section>

    </div>
  );
}