import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    ShieldCheck,
    BarChart3,
    DollarSign,
    Settings2,
    Heart,
    BadgeCheck,
    ArrowRight,
} from "lucide-react";

import { getVerificationRequest } from "../../services/api";

import "./VerificationRequest.css";


function VerificationRequest() {

    const navigate = useNavigate();


    // ==================================================
    // VERIFICATION STATE
    // ==================================================

    const [
        verificationStatus,
        setVerificationStatus
    ] = useState("loading");


    const [
        loading,
        setLoading
    ] = useState(true);


    // ==================================================
    // CHECK EXISTING VERIFICATION REQUEST
    // ==================================================

    useEffect(() => {

        let mounted = true;


        const checkVerificationStatus = async () => {

            try {

                setLoading(true);


                const response =
                    await getVerificationRequest();


                if (!mounted) {
                    return;
                }


                /*
                 * Expected response:
                 *
                 * {
                 *     success: true,
                 *     request: {
                 *         status: "pending"
                 *     }
                 * }
                 *
                 * If no request exists:
                 *
                 * {
                 *     success: true,
                 *     request: null
                 * }
                 */


                const request =
                    response?.request;


                if (!request) {

                    setVerificationStatus(
                        "none"
                    );

                    return;

                }


                const status =
                    String(
                        request.status || ""
                    )
                        .trim()
                        .toLowerCase();


                if (
                    status === "approved"
                ) {

                    setVerificationStatus(
                        "approved"
                    );

                }

                else if (
                    status === "rejected"
                ) {

                    setVerificationStatus(
                        "rejected"
                    );

                }

                else if (
                    [
                        "pending",
                        "pending_review",
                        "under_review",
                        "submitted"
                    ].includes(status)
                ) {

                    setVerificationStatus(
                        "pending"
                    );

                }

                else {

                    setVerificationStatus(
                        "none"
                    );

                }

            }

            catch (error) {

                console.error(
                    "CHECK VERIFICATION STATUS ERROR:",
                    error
                );


                /*
                 * Don't permanently disable the button
                 * just because the status request failed.
                 *
                 * The user can try again.
                 */

                if (mounted) {

                    setVerificationStatus(
                        "none"
                    );

                }

            }

            finally {

                if (mounted) {

                    setLoading(false);

                }

            }

        };


        checkVerificationStatus();


        return () => {

            mounted = false;

        };

    }, []);


    // ==================================================
    // BUTTON STATE
    // ==================================================

    const isDisabled =
        loading ||
        verificationStatus === "pending" ||
        verificationStatus === "approved";


    // ==================================================
    // BUTTON TEXT
    // ==================================================

    let buttonText =
        "Proceed Verification Process";


    if (loading) {

        buttonText =
            "Checking Verification Status...";

    }

    else if (
        verificationStatus === "pending"
    ) {

        buttonText =
            "You Already Applied — Wait to Be Approved";

    }

    else if (
        verificationStatus === "approved"
    ) {

        buttonText =
            "You Are a Verified User";

    }

    else if (
        verificationStatus === "rejected"
    ) {

        buttonText =
            "Proceed Verification Process";

    }


    // ==================================================
    // BUTTON CLICK
    // ==================================================

    const handleProceed = () => {

        if (isDisabled) {
            return;
        }


        navigate(
            "/submit-request"
        );

    };


    return (

        <main className="verification-page">


            {/* ==================================================
                HERO
            ================================================== */}

            <section className="verification-hero">


                <div className="verification-icon">

                    <ShieldCheck
                        size={70}
                    />

                </div>


                <h1>
                    Welcome to Cave Premium
                </h1>


                <p className="verification-intro">

                    Unlock the full potential of your music with

                    <strong>
                        {" "}Cave Premium Partner Program.
                    </strong>

                </p>


                <p className="verification-description">

                    Take complete control of your catalog with advanced
                    real-time analytics. Seamlessly track streams,
                    downloads, plays, and audience engagement while
                    monetizing your content and maximizing your royalty
                    earnings worldwide.

                </p>


            </section>


            {/* ==================================================
                BENEFITS
            ================================================== */}

            <section className="verification-benefits">


                <h2>
                    Partner Benefits
                </h2>


                <div className="benefits-grid">


                    <div className="benefit-card">

                        <BarChart3 size={36}/>

                        <h3>
                            Real-Time Performance Analytics
                        </h3>

                        <p>
                            Monitor streams, plays, downloads and audience
                            demographics in real time.
                        </p>

                    </div>


                    <div className="benefit-card">

                        <DollarSign size={36}/>

                        <h3>
                            Transparent Royalty Earnings
                        </h3>

                        <p>
                            Track and collect revenue generated from your
                            music catalog with complete transparency.
                        </p>

                    </div>


                    <div className="benefit-card">

                        <Settings2 size={36}/>

                        <h3>
                            Full Content Control
                        </h3>

                        <p>
                            Manage release schedules, metadata, artwork,
                            distribution and your entire music catalog.
                        </p>

                    </div>


                    <div className="benefit-card">

                        <Heart size={36}/>

                        <h3>
                            Audience Insights
                        </h3>

                        <p>
                            Measure likes, downloads, shares, engagement and
                            listener growth across your releases.
                        </p>

                    </div>


                    <div className="benefit-card featured">

                        <BadgeCheck size={42}/>

                        <h3>
                            Verified Premium Badge
                        </h3>

                        <p>
                            Get an official verified badge to stand out and
                            earn trust from your fans. Your verified badge
                            confirms that your profile is the authentic
                            creator account.
                        </p>

                    </div>


                </div>


            </section>


            {/* ==================================================
                FOOTER
            ================================================== */}

            <section className="verification-footer">


                <p>

                    Elevate your career and retain your independence
                    with an industry-grade music distribution partner.

                </p>


                <button

                    className={`verification-button ${
                        isDisabled
                            ? "verification-button-disabled"
                            : ""
                    }`}

                    onClick={handleProceed}

                    disabled={isDisabled}

                >

                    {buttonText}

                    {!loading &&
                        verificationStatus !== "pending" &&
                        verificationStatus !== "approved" && (

                        <ArrowRight
                            size={20}
                        />

                    )}

                </button>


            </section>


        </main>

    );

}


export default VerificationRequest;