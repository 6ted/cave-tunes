import { useEffect, useMemo, useState } from "react";

import {
    CheckCircle,
    CheckCircle2,
    Upload,
    Send,
    Loader2,
    ShieldCheck,
} from "lucide-react";

import {
    submitVerificationRequest,
    getVerificationPaymentStatus,
} from "../services/api";

import { useAuth } from "../context/useAuth";

import "./VerificationComplete.css";


function VerificationComplete() {

    const { user } = useAuth();

    // =====================================================
    // INITIAL TRANSACTION REFERENCE
    // =====================================================

    const [txRef] = useState(() => {

        const params = new URLSearchParams(
            window.location.search
        );

        return (
            params.get("tx_ref") ||
            params.get("txRef") ||
            params.get("txref") ||
            params.get("reference") ||
            ""
        );

    });


    // =====================================================
    // INITIAL ERROR
    // =====================================================

    const [error, setError] = useState(() => {

        const params = new URLSearchParams(
            window.location.search
        );

        const reference =
            params.get("tx_ref") ||
            params.get("txRef") ||
            params.get("txref") ||
            params.get("reference");

        return reference
            ? ""
            : "Your transaction reference is missing. Please contact Cave Tunes support.";

    });


    // =====================================================
    // STATES
    // =====================================================

    const [paymentConfirmed, setPaymentConfirmed] = useState(false);

    const [checkingPayment, setCheckingPayment] = useState(
        () => Boolean(
            new URLSearchParams(window.location.search).get("tx_ref") ||
            new URLSearchParams(window.location.search).get("txRef") ||
            new URLSearchParams(window.location.search).get("txref") ||
            new URLSearchParams(window.location.search).get("reference")
        )
    );

    const [paymentProof, setPaymentProof] = useState(null);

   

    const [submitting, setSubmitting] = useState(false);

    const [success, setSuccess] = useState(false);


    // =====================================================
    // VERIFY PAYMENT WITH BACKEND
    // =====================================================

    async function verifyPayment(reference) {

        if (!reference) {
            return;
        }

        try {

            setCheckingPayment(true);

            setError("");

            const response =
                await getVerificationPaymentStatus(reference);

            console.log(
                "VERIFICATION PAYMENT RESPONSE:",
                response
            );

            const payment =
                response?.payment ||
                response?.data?.payment;

            const status = String(
                payment?.status ||
                response?.status ||
                response?.data?.status ||
                ""
            ).toLowerCase();

            if (status === "completed") {

                setPaymentConfirmed(true);

                setError("");

            } else {

                setPaymentConfirmed(false);

                setError(
                    "Your payment has not yet been confirmed. Please check again."
                );

            }

        } catch (err) {

            console.error(
                "PAYMENT VERIFICATION ERROR:",
                err
            );

            setPaymentConfirmed(false);

            setError(
                err.message ||
                "Unable to verify your payment."
            );

        } finally {

            setCheckingPayment(false);

        }

    }


    // =====================================================
    // CHECK PAYMENT WHEN PAGE LOADS
    // =====================================================

    useEffect(() => {

    if (!txRef) {
        return;
    }

    let cancelled = false;

    async function checkPayment() {

        try {

            const response =
                await getVerificationPaymentStatus(txRef);

            if (cancelled) return;

            console.log(
                "VERIFICATION PAYMENT RESPONSE:",
                response
            );

            const payment =
                response?.payment ||
                response?.data?.payment;

            const status = String(
                payment?.status ||
                response?.status ||
                response?.data?.status ||
                ""
            ).toLowerCase();

            if (status === "completed") {

                setPaymentConfirmed(true);
                setError("");

            } else {

                setPaymentConfirmed(false);

                setError(
                    "Your payment has not yet been confirmed. Please check again."
                );

            }

        } catch (err) {

            if (!cancelled) {

                console.error(
                    "PAYMENT VERIFICATION ERROR:",
                    err
                );

                setPaymentConfirmed(false);

                setError(
                    err.message ||
                    "Unable to verify your payment."
                );

            }

        } finally {

            if (!cancelled) {
                setCheckingPayment(false);
            }

        }

    }

    checkPayment();

    return () => {
        cancelled = true;
    };

}, [txRef]);


    // =====================================================
    // CLEAN UP SCREENSHOT PREVIEW
    // =====================================================
const previewUrl = useMemo(() => {

    if (!paymentProof) {
        return "";
    }

    return URL.createObjectURL(paymentProof);

}, [paymentProof]);


useEffect(() => {

    return () => {

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

    };

}, [previewUrl]);

    // =====================================================
    // CHECK PAYMENT AGAIN
    // =====================================================

    async function handleCheckPayment() {

        if (!txRef) {

            setError(
                "Transaction reference is missing."
            );

            return;

        }

        await verifyPayment(txRef);

    }


    // =====================================================
    // HANDLE PAYMENT SCREENSHOT
    // =====================================================

    function handleFile(e) {

        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {

            setError(
                "Only payment screenshots are allowed."
            );

            e.target.value = "";

            return;

        }

        if (file.size > 5 * 1024 * 1024) {

            setError(
                "Image size must be below 5MB."
            );

            e.target.value = "";

            return;

        }

        setPaymentProof(file);

        setError("");

    }


    // =====================================================
    // SUBMIT VERIFICATION REQUEST
    // =====================================================

    async function submitRequest(e) {

        e.preventDefault();

        setError("");

        if (!paymentConfirmed || !txRef) {

            setError(
                "Your PayChangu payment must be confirmed before submitting."
            );

            return;

        }

        if (!paymentProof) {

            setError(
                "Please attach your payment screenshot."
            );

            return;

        }

        try {

            setSubmitting(true);

            const formData = new FormData();

            formData.append(
                "role",
                user?.role || ""
            );

            formData.append(
                "email",
                user?.email || ""
            );

            formData.append(
                "country",
                user?.country || ""
            );

            formData.append(
                "tx_ref",
                txRef
            );

            formData.append(
                "payment_proof",
                paymentProof
            );


            console.log(
                "SUBMITTING VERIFICATION REQUEST:",
                {
                    role: user?.role,
                    email: user?.email,
                    country: user?.country,
                    txRef,
                    paymentProof
                }
            );


            const response =
                await submitVerificationRequest(formData);

            console.log(
                "VERIFICATION SUBMISSION RESPONSE:",
                response
            );

            setSuccess(true);

            sessionStorage.removeItem(
                "caveTunesVerificationTxRef"
            );

        } catch (err) {

            console.error(
                "VERIFICATION SUBMISSION ERROR:",
                err
            );

            setError(
                err.message ||
                "Failed to submit your verification request."
            );

        } finally {

            setSubmitting(false);

        }

    }


    // =====================================================
    // SUCCESS SCREEN
    // =====================================================

    if (success) {

        return (

            <main className="submit-request-page">

                <section className="verification-card">

                    <div className="verification-icon">

                        <CheckCircle size={70} />

                    </div>

                    <h1>
                        Application Submitted!
                    </h1>

                    <div className="file-success">

                        <CheckCircle />

                        Your verification request was submitted successfully.

                    </div>

                    <p>
                        Your application is now awaiting review by the Cave Tunes administration team.
                    </p>

                    <button
                        className="step-button"
                        onClick={() => {
                            window.location.href = "/";
                        }}
                    >
                        Return to Cave Tunes
                    </button>

                </section>

            </main>

        );

    }


    // =====================================================
    // MAIN PAGE
    // =====================================================

    return (

        <main className="submit-request-page">

            <section className="verification-card">

                <div className="verification-icon">

                    <ShieldCheck size={65} />

                </div>


                <h1>
                    Creator Verification
                </h1>


                <h3>
                    Payment Verification Upload
                </h3>


                <p>
                    Your payment has brought you one step closer to becoming a verified Cave Tunes creator.
                    Confirm your payment and submit your verification application below.
                </p>


                <br />


                {/* PAYMENT CHECKING */}

                {checkingPayment && (

                    <div className="file-success">

                        <Loader2
                            size={20}
                            className="animate-spin"
                        />

                        Checking your PayChangu payment...

                    </div>

                )}


                {/* PAYMENT CONFIRMED */}

                {!checkingPayment && paymentConfirmed && (

                    <div className="file-success">

                        <CheckCircle />

                        PayChangu payment successfully confirmed!

                    </div>

                )}


                {/* PAYMENT NOT CONFIRMED */}

                {!checkingPayment && !paymentConfirmed && (

                    <div className="upload-error">

                        {error || "Your payment has not yet been confirmed."}

                    </div>

                )}


                {/* PAYMENT DETAILS */}

                {paymentConfirmed && (

                    <div className="payment-details">

                        <h3>
                            Payment Details
                        </h3>

                        <p>
                            Payment provider:
                            <strong> PayChangu</strong>
                        </p>

                        <p>
                            Transaction reference:
                            <strong> {txRef}</strong>
                        </p>

                        <p>
                            Amount:
                            <strong> MWK 7,000</strong>
                        </p>

                        <p>
                            Status:
                            <strong> Completed</strong>
                        </p>

                    </div>

                )}


                {/* CREATOR DETAILS */}

                {paymentConfirmed && (

                    <div className="payment-details">

                        <h3>
                            Creator Information
                        </h3>

                        <p>
                            Role:
                            <strong> {user?.role || "Not provided"}</strong>
                        </p>

                        <p>
                            Email:
                            <strong> {user?.email || "Not provided"}</strong>
                        </p>

                        <p>
                            Country:
                            <strong> {user?.country || "Not provided"}</strong>
                        </p>

                    </div>

                )}


                {/* SCREENSHOT UPLOAD */}

                {paymentConfirmed && (

                    <form onSubmit={submitRequest}>

                        <p>
                            Attach your payment screenshot with visible transaction details.
                        </p>


                        <label className="payment-upload-box">

                            {paymentProof && previewUrl ? (

                                <img
                                    src={previewUrl}
                                    className="payment-preview"
                                    alt="Payment screenshot preview"
                                />

                            ) : (

                                <>

                                    <Upload size={45} />

                                    <h3>
                                        Upload Screenshot
                                    </h3>

                                    <p>
                                        Maximum image size: 5MB
                                    </p>

                                </>

                            )}


                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFile}
                            />

                        </label>


                        {paymentProof && (

                            <div className="file-success">

                                <CheckCircle />

                                Payment screenshot attached

                            </div>

                        )}


                        {error && (

                            <div className="upload-error">

                                {error}

                            </div>

                        )}


                        <div className="verification-summary">

                            <h3>
                                Application Summary
                            </h3>

                            <p>
                                Payment:
                                <strong> PayChangu</strong>
                            </p>

                            <p>
                                Fee:
                                <strong> MWK 7,000</strong>
                            </p>

                            <p>
                                Payment Status:
                                <strong> Confirmed</strong>
                            </p>

                        </div>


                        <button
                            type="submit"
                            className="submit-button"
                            disabled={!paymentProof || submitting}
                        >

                            {submitting ? (

                                <>
                                    <Loader2
                                        size={18}
                                        className="animate-spin"
                                    />

                                    Submitting...

                                </>

                            ) : (

                                <>
                                    <Send />

                                    Submit Verification Request

                                </>

                            )}

                        </button>

                    </form>

                )}


                {/* CHECK PAYMENT AGAIN */}

                {!paymentConfirmed && !checkingPayment && txRef && (

                    <button
                        className="step-button"
                        onClick={handleCheckPayment}
                        disabled={checkingPayment}
                    >

                        <CheckCircle2 />

                        Check Payment Again

                    </button>

                )}

            </section>

        </main>

    );

}


export default VerificationComplete;