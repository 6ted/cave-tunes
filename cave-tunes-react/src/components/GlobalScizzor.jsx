// ======================================================
// CAVE TUNES
// GLOBAL SCIZZOR WIDGET
// src/components/GlobalScizzor.jsx
//
// Features:
// - Global floating Scizzor icon
// - Premium subscription verification
// - Shared global mini-window
// - YouTube player integration
// - Shared Scizzor recording engine
// - Browser tab audio capture
// - Recording timer
// - Audio preview
// - Audio download
// - Persistent recording during navigation
// ======================================================

import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    Scissors,
    Mic,
    MicOff,
    Square,
    Download,
    X,
    Loader2,
    AlertCircle,
    CheckCircle,
    Minimize2,
    Maximize2,
} from "lucide-react";

import {
    getSubscriptionStatus,
} from "../services/api";

import useScizzor from "../context/useScizzor";

import "./GlobalScizzor.css";


// ======================================================
// COMPONENT
// ======================================================

export default function GlobalScizzor() {

    const navigate = useNavigate();


    // ==================================================
    // SHARED SCIZZOR CONTEXT
    // ==================================================

    const {
        status,
        error,
        recordingTime,
        audioUrl,
        audioSize,

        startCapture,
        stopCapture,
        downloadRecording,

        formatTime,
        formatFileSize,

        isWidgetOpen,
        isWidgetMinimized,

        openWidget,
        closeWidget,
        toggleWidget,
        toggleWidgetMinimized,

    } = useScizzor();


    // ==================================================
    // PREMIUM STATE
    // ==================================================

    const [premiumLoading, setPremiumLoading] =
        useState(true);

    const [isPremium, setIsPremium] =
        useState(false);


    // ==================================================
    // REFERENCES
    // ==================================================

    const mountedRef = useRef(false);

    const premiumRequestRef = useRef(0);


    // ==================================================
    // PREMIUM VERIFICATION
    // ==================================================

    useEffect(() => {

        let cancelled = false;

        mountedRef.current = true;


        const verifyPremium = async () => {

            const requestId =
                ++premiumRequestRef.current;

            let active = false;


            try {

                const token =
                    localStorage.getItem("token");


                if (token) {

                    const response =
                        await getSubscriptionStatus();


                    active =
                        response?.isPremium === true &&
                        response?.subscription?.status === "active";

                }

            } catch (err) {

                console.error(
                    "GLOBAL SCIZZOR PREMIUM CHECK:",
                    err
                );

                active = false;

            }


            // Ignore outdated requests.

            if (

                cancelled ||

                !mountedRef.current ||

                requestId !== premiumRequestRef.current

            ) {

                return;

            }


            setIsPremium(active);

            setPremiumLoading(false);


            // If Premium has expired while the widget
            // is open, close it.

            if (!active) {

                closeWidget();

            }

        };


        // Initial Premium verification.

        const initialCheck = setTimeout(() => {

            verifyPremium();

        }, 0);


        // Recheck when the user returns to the browser.

        const handleFocus = () => {

            verifyPremium();

        };


        window.addEventListener(
            "focus",
            handleFocus
        );


        // Cleanup.

        return () => {

            cancelled = true;

            mountedRef.current = false;

            clearTimeout(initialCheck);

            window.removeEventListener(
                "focus",
                handleFocus
            );

        };

    }, [closeWidget]);


    // ==================================================
    // PREMIUM ACCESS CONTROL
    // ==================================================

    function handleOpenWidget() {

        if (premiumLoading) {

            return;

        }


        if (!isPremium) {

            closeWidget();

            navigate("/subscription");

            return;

        }


        openWidget();

    }


    // ==================================================
    // HIDE FLOATING WIDGET FOR NON-PREMIUM USERS
    // ==================================================

    if (premiumLoading || !isPremium) {

        return null;

    }


    // ==================================================
    // GLOBAL FLOATING WIDGET
    // ==================================================

    return (

        <div className="global-scizzor">


            {/* ==================================================
                FLOATING ICON
            ================================================== */}

            <button

                type="button"

                className={`global-scizzor-trigger ${
                    status === "recording"
                        ? "recording"
                        : ""
                }`}

                onClick={() => {

                    if (isWidgetOpen) {

                        toggleWidget();

                    } else {

                        handleOpenWidget();

                    }

                }}

                aria-label="Open Scizzor"

                title="Cave Tunes Scizzor"

            >

                {status === "recording" ? (

                    <Mic size={23} />

                ) : (

                    <Scissors size={23} />

                )}


                {status === "recording" && (

                    <span className="global-scizzor-live-dot" />

                )}

            </button>


            {/* ==================================================
                MINI WINDOW
            ================================================== */}

            {isWidgetOpen && (

                <div

                    className={`global-scizzor-window ${
                        isWidgetMinimized
                            ? "minimized"
                            : ""
                    }`}

                >

                    {/* HEADER */}

                    <div className="global-scizzor-header">


                        <div className="global-scizzor-brand">

                            <div className="global-scizzor-logo">

                                <Scissors size={20} />

                            </div>


                            <div>

                                <strong>
                                    Scizzor
                                </strong>

                                <span>
                                    Audio Capture
                                </span>

                            </div>

                        </div>


                        <div className="global-scizzor-window-actions">


                            {/* MINIMIZE / RESTORE */}

                            <button

                                type="button"

                                onClick={toggleWidgetMinimized}

                                title={
                                    isWidgetMinimized
                                        ? "Restore"
                                        : "Minimize"
                                }

                            >

                                {isWidgetMinimized ? (

                                    <Maximize2 size={17} />

                                ) : (

                                    <Minimize2 size={17} />

                                )}

                            </button>


                            {/* CLOSE */}

                            <button

                                type="button"

                                onClick={closeWidget}

                                title="Close window"

                            >

                                <X size={19} />

                            </button>


                        </div>

                    </div>


                    {!isWidgetMinimized && (

                        <div className="global-scizzor-content">


                            {/* ==================================
                                RECORDING STATUS
                            ================================== */}

                            <div

                                className={`global-scizzor-status ${
                                    status === "recording"
                                        ? "active"
                                        : ""
                                }`}

                            >

                                <div className="global-scizzor-status-icon">

                                    {status === "recording" ? (

                                        <Mic size={30} />

                                    ) : (

                                        <MicOff size={30} />

                                    )}

                                </div>


                                <h3>

                                    {status === "idle" &&
                                        "Ready to capture"
                                    }

                                    {status === "requesting" &&
                                        "Waiting for permission"
                                    }

                                    {status === "recording" &&
                                        "Recording audio"
                                    }

                                    {status === "completed" &&
                                        "Recording completed"
                                    }

                                </h3>


                                <div className="global-scizzor-timer">

                                    {formatTime(recordingTime)}

                                </div>


                                <p>

                                    {status === "recording"

                                        ? "Your audio capture is running."

                                        : status === "requesting"

                                            ? "Select a browser tab and enable Share tab audio."

                                            : status === "completed"

                                                ? "Your recording is ready."

                                                : "Capture audio from a browser tab."

                                    }

                                </p>

                            </div>


                            {/* ==================================
                                ERROR
                            ================================== */}

                            {error && (

                                <div className="global-scizzor-error">

                                    <AlertCircle size={17} />

                                    {error}

                                </div>

                            )}


                            {/* ==================================
                                RECORD BUTTON
                            ================================== */}

                            <div className="global-scizzor-controls">


                                {(status === "idle" ||
                                  status === "completed") && (

                                    <button

                                        type="button"

                                        className="global-scizzor-record"

                                        onClick={startCapture}

                                    >

                                        <Mic size={19} />

                                        Record

                                    </button>

                                )}


                                {status === "requesting" && (

                                    <button

                                        type="button"

                                        className="global-scizzor-record"

                                        disabled

                                    >

                                        <Loader2

                                            size={19}

                                            className="global-scizzor-spin"

                                        />

                                        Waiting...

                                    </button>

                                )}


                                {status === "recording" && (

                                    <button

                                        type="button"

                                        className="global-scizzor-stop"

                                        onClick={stopCapture}

                                    >

                                        <Square size={18} />

                                        Stop Recording

                                    </button>

                                )}

                            </div>


                            {/* ==================================
                                COMPLETED RECORDING
                            ================================== */}

                            {status === "completed" && audioUrl && (

                                <div className="global-scizzor-result">


                                    <div className="global-scizzor-result-heading">

                                        <CheckCircle size={19} />

                                        <div>

                                            <strong>
                                                Audio ready
                                            </strong>

                                            <small>
                                                {formatFileSize(audioSize)}
                                            </small>

                                        </div>

                                    </div>


                                    <audio

                                        controls

                                        src={audioUrl}

                                    />


                                    <button

                                        type="button"

                                        className="global-scizzor-download"

                                        onClick={downloadRecording}

                                    >

                                        <Download size={17} />

                                        Download Audio

                                    </button>

                                </div>

                            )}


                            {/* ==================================
                                FULL STUDIO
                            ================================== */}

                            <button

                                type="button"

                                className="global-scizzor-studio"

                                onClick={() => navigate("/scizzor")}

                            >

                                Open Scizzor Studio

                            </button>


                            {/* ==================================
                                NOTICE
                            ================================== */}

                            <p className="global-scizzor-notice">

                                Only capture media you own or are
                                authorized to record.

                            </p>


                        </div>

                    )}

                </div>

            )}

        </div>

    );

}