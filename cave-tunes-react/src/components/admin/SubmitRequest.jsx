import { useState, useEffect, useRef } from "react";

import {
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
  Upload,
  Send,
  CheckCircle,
  Loader2,
} from "lucide-react";

import {
  submitVerificationRequest,
  createVerificationPayment,
  getVerificationPaymentStatus,
} from "../../services/api";

import { useAuth } from "../../context/useAuth";

import "./SubmitRequest.css";


function SubmitRequest() {

  const { user } = useAuth();

  const [step, setStep] = useState(1);

  const [paymentProof, setPaymentProof] = useState(null);

  const [error, setError] = useState("");

  const [txRef, setTxRef] = useState("");

  const [paymentLoading, setPaymentLoading] = useState(false);

  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [checkingPayment, setCheckingPayment] = useState(false);

  const [submitting, setSubmitting] = useState(false);


  const progress = (step / 3) * 100;


  // =====================================================
  // CHECK PAYMENT AFTER RETURNING FROM PAYCHANGU
  // =====================================================

  async function verifyReturnedPayment(reference) {

    if (!reference) {
      return;
    }

    try {

      setCheckingPayment(true);
      setError("");

      const response = await getVerificationPaymentStatus(reference);

      console.log("PAYMENT STATUS RESPONSE:", response);

      const status =
        response?.status ||
        response?.payment?.status;

      if (status === "completed") {

        setPaymentConfirmed(true);

        setTxRef(reference);

        setStep(3);

        setError("");

        // Remove payment query parameters after confirmation.
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

      } else {

        setPaymentConfirmed(false);

        setError(
          "Your payment has not yet been confirmed. Please wait a moment and check again."
        );

      }

    } catch (err) {

      console.error("PAYMENT VERIFICATION ERROR:", err);

      setError(
        err.message ||
        "Unable to confirm your payment. Please try again."
      );

    } finally {

      setCheckingPayment(false);

    }

  }


  // =====================================================
  // HANDLE RETURN FROM PAYCHANGU
  // =====================================================

// =====================================================
// HANDLE RETURN FROM PAYCHANGU
// =====================================================

const paymentCheckStarted = useRef(false);

useEffect(() => {

    const params = new URLSearchParams(window.location.search);

    const reference =
        params.get("tx_ref") ||
        params.get("txRef") ||
        params.get("txref") ||
        params.get("reference") ||
        params.get("transaction_reference") ||
        sessionStorage.getItem("caveTunesVerificationTxRef");

    const paymentResult = params.get("payment");

    if (!reference) {
        console.log("No PayChangu transaction reference found.");
        return;
    }

    if (paymentCheckStarted.current) {
        return;
    }

    paymentCheckStarted.current = true;

    // Restore transaction reference.
    setTxRef(reference);

    // Return the user to the payment stage while
    // the backend confirms the transaction.
    setStep(2);

    // Confirm payment with the Cave Tunes backend.
    const checkPayment = async () => {

        for (let attempt = 1; attempt <= 5; attempt++) {

            try {

                setCheckingPayment(true);
                setError("");

                const response =
                    await getVerificationPaymentStatus(reference);

                console.log(
                    "PAYCHANGU PAYMENT STATUS:",
                    response
                );

                const payment =
                    response?.payment || response?.data?.payment;

                const status =
                    payment?.status ||
                    response?.status ||
                    response?.data?.status;

                if (status === "completed") {

                    setPaymentConfirmed(true);
                    setTxRef(reference);
                    setStep(3);
                    setError("");

                    sessionStorage.setItem(
                        "caveTunesVerificationTxRef",
                        reference
                    );

                    // Remove payment parameters from the URL.
                    window.history.replaceState(
                        {},
                        document.title,
                        window.location.pathname
                    );

                    return;

                }

                if (attempt < 5) {

                    await new Promise(resolve =>
                        setTimeout(resolve, 3000)
                    );

                }

            } catch (err) {

                console.error(
                    "PAYMENT CONFIRMATION ERROR:",
                    err
                );

                if (attempt === 5) {

                    setError(
                        "We could not confirm your payment yet. Please check again."
                    );

                }

            } finally {

                setCheckingPayment(false);

            }

        }

        setPaymentConfirmed(false);
        setStep(2);

        if (paymentResult === "success") {

            setError(
                "Payment received. We are still waiting for final confirmation from PayChangu. Please check again."
            );

        }

    };

    checkPayment();

}, []);


  // =====================================================
  // CREATE PAYCHANGU CHECKOUT
  // =====================================================

  async function handlePayment() {

    try {

      setPaymentLoading(true);

      setError("");

      const response = await createVerificationPayment();

      console.log("PAYCHANGU CHECKOUT RESPONSE:", response);

const checkoutUrl =
  response?.checkout?.checkoutUrl ||
  response?.checkout?.checkout_url ||
  response?.checkoutUrl ||
  response?.checkout_url ||
  response?.data?.checkout_url;

      if (!checkoutUrl) {

        throw new Error(
          "PayChangu checkout URL was not returned by the server."
        );

      }

      // Redirect user to PayChangu.
      // Save the transaction reference before leaving Cave Tunes.
const reference =
    response?.payment?.txRef ||
    response?.payment?.provider_reference ||
    response?.payment?.tx_ref ||
    response?.txRef;

if (reference) {
    sessionStorage.setItem(
        "caveTunesVerificationTxRef",
        reference
    );
}

// Redirect user to PayChangu.
window.location.href = checkoutUrl;

    } catch (err) {

      console.error("PAYCHANGU CHECKOUT ERROR:", err);

      setError(
        err.message ||
        "Unable to start payment. Please try again."
      );

      setPaymentLoading(false);

    }

  }


  // =====================================================
  // CHECK PAYMENT AGAIN
  // =====================================================

  async function handleCheckPayment() {

    if (!txRef) {

      setError("Payment reference not found.");

      return;

    }

    await verifyReturnedPayment(txRef);

  }


  // =====================================================
  // HANDLE PAYMENT SCREENSHOT
  // =====================================================

  function handleFile(e) {

    const file = e.target.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {

      setError(
        "Only payment screenshots are allowed."
      );

      return;

    }

    if (file.size > 5 * 1024 * 1024) {

      setError(
        "Image size must be below 5MB."
      );

      return;

    }

    setPaymentProof(file);

    setError("");

  }


  // =====================================================
  // SUBMIT VERIFICATION REQUEST
  // =====================================================

  async function submitRequest() {

    setError("");

    if (!paymentConfirmed || !txRef) {

      setError(
        "Your PayChangu payment must be confirmed before submitting."
      );

      return;

    }

    if (!paymentProof) {

      setError(
        "Please attach your payment screenshot before submitting."
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

      // The backend uses this reference to verify
      // the completed PayChangu transaction.
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


      const response = await submitVerificationRequest(formData);

      console.log(
        "VERIFICATION SERVER RESPONSE:",
        response
      );


      alert(
        "Verification request submitted successfully. Your application is now awaiting admin review."
      );

    } catch (err) {

      console.error(
        "SUBMIT VERIFICATION ERROR:",
        err
      );

      setError(
        err.message ||
        "Failed to submit verification request."
      );

    } finally {

      setSubmitting(false);

    }

  }



  return (

    <main className="submit-request-page">


      <div className="verification-progress">

        <div className="progress-header">

          <h2>
            Verification Progress
          </h2>

          <span>
            Step {step} of 3
          </span>

        </div>


        <div className="progress-track">

          <div
            className="progress-fill"
            style={{
              width: `${progress}%`
            }}
          />

        </div>


        <div className="progress-steps">

          <div className={
            step >= 1
              ? "progress-step active"
              : "progress-step"
          }>

            <CheckCircle2 size={18} />

            <span>
              Introduction
            </span>

          </div>


          <div className={
            step >= 2
              ? "progress-step active"
              : "progress-step"
          }>

            <CheckCircle2 size={18} />

            <span>
              Payment
            </span>

          </div>


          <div className={
            step >= 3
              ? "progress-step active"
              : "progress-step"
          }>

            <CheckCircle2 size={18} />

            <span>
              Submit
            </span>

          </div>

        </div>

      </div>



      {/* ================================================= */}
      {/* STEP 1 - INTRODUCTION */}
      {/* ================================================= */}

      {
        step === 1 && (

          <section className="verification-card">


            <div className="verification-icon">

              <ShieldCheck size={70} />

            </div>


            <h1>
              One-Step Account Verification
            </h1>


            <h3>
              What are the conditions for the verification ?
            </h3>


            <p>
              The Cave Tunes One-Step Account Verification is designed to ensure that every verified creator
              on the platform is authentic, protected, and ready to access professional music distribution tools.
              Verification helps us maintain a trusted community while giving artists access to exclusive features
              that are unavailable to standard accounts.
            </p>


            <br />
            <br />


            <p>
              To become a verified creator, you must complete your creator profile
              with accurate information, including your artist name, profile picture, and other required details.
              Your account will then go through a verification process to confirm its authenticity
              and prevent impersonation, copyright abuse, and fraudulent activity.
            </p>


            <br />
            <br />


            <p>

              A <strong>one-time administrative setup fee of MWK 7,000 / $4.04 US Dollars USD</strong> is required to activate your verified creator account.

              This fee is not a monthly subscription and does not renew. It covers identity verification,
              anti-piracy account protection, creator dashboard activation, account security configuration,
              and the setup of professional distribution services.

            </p>


            <br />
            <br />


            <p>
              Once your payment has been confirmed and your application has been approved,
              your account will receive lifetime verified status on Cave Tunes. Your creator
              dashboard will be unlocked, allowing you to upload and manage your music
              professionally. Most verification requests are processed quickly after payment confirmation.
            </p>


            <br />
            <br />


            <h3>
              Why is there a verification fee?
            </h3>


            <p>
              The verification fee helps us maintain a secure and high-quality platform for creators. It covers:
            </p>


            <br />


            <ol>

              <li>Identity and creator authenticity verification.</li>

              <br />

              <li>Anti-piracy and copyright protection measures.</li>

              <br />

              <li>Manual review by the Cave Tunes administration team.</li>

              <br />

              <li>Activation of your professional creator dashboard.</li>

              <br />

              <li>Secure account protection against impersonation.</li>

              <br />

              <li>Platform maintenance and creator support services.</li>

              <br />

              <li>Setup of international music distribution tools.</li>

              <br />

              <li>Long-term access to professional creator features.</li>

            </ol>


            <br />


            <p>
              This is a <strong>single payment</strong> that provides <strong>lifetime access</strong> to your verified creator account.
            </p>


            <div className="security-banner">

              🔒 Secure Payment • ⚡ Instant Processing • ♾ Lifetime Access

            </div>



            <div className="benefits">


              <h2>
                Partner Benefits
              </h2>


              <p>
                After your account has been verified, you'll receive access to premium creator features, including:
              </p>


              <ul>

                <li>
                  ✅ Official verified badge displayed on your profile.
                </li>

                <li>
                  ✅ Unlimited music uploads and releases on Cave Tunes with no upload limits.
                </li>

                <li>
                  ✅ One FREE international distribution of your first release to major streaming platforms,
                  including Spotify, Apple Music, iTunes, Boomplay, and other supported digital music stores.
                </li>

                <li>
                  ✅ One FREE promotional campaign for your first official release to help increase visibility and reach more listeners.
                </li>

                <li>
                  ✅ Access to advanced analytics and audience insights, including streams,
                  downloads, listener locations, and engagement statistics.
                </li>

                <li>
                  ✅ Professional creator dashboard for managing your catalog, releases, and performance in one place.
                </li>

                <li>
                  ✅ Priority creator support for verification and distribution-related assistance.
                </li>

                <li>
                  ✅ Improved visibility across the Cave Tunes platform, increasing your chances of reaching new fans.
                </li>

                <li>
                  ✅ Enhanced copyright protection to help safeguard your original music from unauthorized use.
                </li>

                <li>
                  ✅ Eligibility for future creator programs, promotional opportunities, exclusive platform features, and new monetization tools as they become available.
                </li>

              </ul>


              <br />


              <h3>
                One-Time Verification Fee
              </h3>


              <strong>
                <p>
                  MWK 7,000 / $4.04 US Dollars USD
                </p>
              </strong>


              <br />


              <p>
                🔒 Secure Payment • ⚡ Fast Verification Processing • 🛡 Identity Protection • 🌍 International Distribution Setup • ♾ Lifetime Verified Creator Access
              </p>


              <br />


              <h4>
                IMPORTANT INFORMATION !
              </h4>


              <ul>

                <li>
                  Verification is available to genuine artists, producers, DJs, bands, record labels, and music creators.
                </li>

                <li>
                  The verification fee is a one-time administrative payment and is generally non-refundable once your verification has been processed.
                </li>

                <li>
                  Providing false information or uploading content that violates copyright or the Cave Tunes Terms of Service may result in the suspension or removal of your verified status.
                </li>

                <li>
                  Verification confirms the authenticity of your creator account but does not guarantee placement on playlists, editorial features, or streaming performance.
                </li>

                <li>
                  Your verified status remains active for the lifetime of your Cave Tunes account, provided you continue to comply with the platform's community guidelines and terms of use.
                </li>

              </ul>


            </div>



            <button

              className="step-button"

              onClick={() => {
                setError("");
                setStep(2);
              }}

            >

              Proceed

              <ChevronDown />

            </button>


          </section>

        )

      }



      {/* ================================================= */}
      {/* STEP 2 - PAYCHANGU PAYMENT */}
      {/* ================================================= */}

      {
        step === 2 && (

          <section className="verification-card">


            <h1>
              Complete Your Verification Payment
            </h1>


            <p>
              You're one step away from becoming a <strong>✅ Verified Cave Tunes Creator.</strong>
            </p>


            <br />


            <p>
              Once your payment has been confirmed, our team will review your application and
              activate your verified creator account. After approval, you'll receive lifetime access to
              all verified creator features, including unlimited uploads, your official verified badge,
              advanced analytics, and one FREE international distribution for your first release.
            </p>


            <br />


            <strong>

              <h3>
                Amount to Pay: MWK 7,000 / $4.04 USD
              </h3>

            </strong>


            <br />


            <strong>
              <p className="important-paragraph-text">
                Important!
              </p>
            </strong>


            <p>
              Your payment will be processed securely through PayChangu.
              After completing payment, you will be returned to Cave Tunes.
              Your payment must be confirmed before you can submit your verification application.
            </p>



            <div className="payment-details">

              <h3>
                PayChangu Secure Checkout
              </h3>


              <p>
                Amount:
                <strong> MWK 7,000</strong>
              </p>


              <p>
                Payment provider:
                <strong> PayChangu</strong>
              </p>


              <p>
                Payment type:
                <strong> One-time verification fee</strong>
              </p>


              <br />


              <p>
                Click the button below to continue to PayChangu and complete your payment.
              </p>


            </div>



            {
              error && (

                <div className="upload-error">

                  {error}

                </div>

              )
            }



            <button

              className="step-button"

              onClick={handlePayment}

              disabled={paymentLoading || checkingPayment}

            >

              {
                paymentLoading ? (

                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Connecting to PayChangu...
                  </>

                ) : (

                  <>
                    Pay MWK 7,000 with PayChangu
                    <ChevronDown />
                  </>

                )
              }

            </button>



            <button

              className="step-button"

              onClick={() => {
                setError("");
                setStep(1);
              }}

              disabled={paymentLoading}

            >

              Back

            </button>



          </section>

        )

      }



      {/* ================================================= */}
      {/* STEP 3 - PAYMENT CONFIRMED AND SCREENSHOT UPLOAD */}
      {/* ================================================= */}

      {
        step === 3 && (

          <section className="verification-card">


            <h1>
              Payment Verification Upload
            </h1>


            {
              paymentConfirmed ? (

                <div className="file-success">

                  <CheckCircle />

                  PayChangu payment successfully confirmed!

                </div>

              ) : (

                <div className="upload-error">

                  Your payment has not yet been confirmed.

                </div>

              )

            }



            <p>
              Attach payment screenshot with visible transaction details.
            </p>



            {
              paymentConfirmed && (

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

              )

            }



            <label className="payment-upload-box">


              {
                paymentProof ? (

                  <img

                    src={URL.createObjectURL(paymentProof)}

                    className="payment-preview"

                    alt="Payment screenshot preview"

                  />

                ) : (

                  <>

                    <Upload size={45} />

                    <h3>
                      Upload Screenshot
                    </h3>

                  </>

                )

              }



              <input

                type="file"

                accept="image/*"

                onChange={handleFile}

              />


            </label>



            {
              paymentProof && (

                <div className="file-success">

                  <CheckCircle />

                  Payment screenshot attached

                </div>

              )
            }



            {
              error && (

                <div className="upload-error">

                  {error}

                </div>

              )
            }



            {
              !paymentConfirmed && txRef && (

                <button

                  className="step-button"

                  onClick={handleCheckPayment}

                  disabled={checkingPayment}

                >

                  {
                    checkingPayment ? (

                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Checking Payment...
                      </>

                    ) : (

                      <>
                        Check Payment Again
                        <CheckCircle2 />
                      </>

                    )
                  }

                </button>

              )

            }



            <div className="verification-summary">


              <h3>
                Summary
              </h3>


              <p>

                Payment:

                <strong>
                  {" "}
                  PayChangu
                </strong>

              </p>


              <p>

                Fee:

                <strong>
                  MWK 7,000
                </strong>

              </p>


              <p>

                Payment Status:

                <strong>
                  {" "}
                  {paymentConfirmed ? "Confirmed" : "Not confirmed"}
                </strong>

              </p>


            </div>



            <button

              className="submit-button"

              onClick={submitRequest}

              disabled={
                !paymentConfirmed ||
                !paymentProof ||
                submitting
              }

            >

              {
                submitting ? (

                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting...
                  </>

                ) : (

                  <>
                    <Send />
                    Submit Verification Request
                  </>

                )
              }

            </button>



          </section>

        )

      }



    </main>

  );

}


export default SubmitRequest;