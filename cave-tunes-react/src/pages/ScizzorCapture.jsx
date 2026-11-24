// ======================================================
// CAVE TUNES
// SCIZZOR AUDIO CAPTURE ENGINE
// src/pages/ScizzorCapture.jsx
//
// Uses the shared ScizzorContext recording engine.
// ======================================================

import {
    Mic,
    MicOff,
    Radio,
    Square,
    Download,
    AudioLines,
    AlertCircle,
    CheckCircle,
    Loader2,
} from "lucide-react";

import useScizzor from "../context/useScizzor";

import "./ScizzorCapture.css";


// ======================================================
// COMPONENT
// ======================================================

export default function ScizzorCapture() {

    // ==================================================
    // SHARED RECORDING ENGINE
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
    } = useScizzor();


    // ==================================================
    // UI
    // ==================================================

    return (

        <div className="scizzor-page">

            <div className="scizzor-container">


                {/* HEADER */}

                <div className="scizzor-header">

                    <div className="scizzor-logo">

                        <AudioLines size={30} />

                    </div>

                    <div>

                        <h1>Scizzor</h1>

                        <p>
                            Audio Capture Studio
                        </p>

                    </div>

                </div>


                {/* MAIN CARD */}

                <div className="scizzor-card">


                    <div className="scizzor-card-header">

                        <div>

                            <h2>Capture Audio</h2>

                            <p>
                                Record audio from a browser tab
                                that you are authorized to capture.
                            </p>

                        </div>

                        <Radio size={25} />

                    </div>


                    {/* RECORDING STATUS */}

                    <div className="scizzor-recording-area">

                        <div className={
                            `scizzor-microphone ${
                                status === "recording"
                                    ? "active"
                                    : ""
                            }`
                        }>

                            {status === "recording"
                                ? <Mic size={45} />
                                : <MicOff size={45} />
                            }

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


                        <div className="scizzor-timer">

                            {formatTime(recordingTime)}

                        </div>


                        <p className="scizzor-status-description">

                            {status === "idle" &&
                                "Select a browser tab to begin."
                            }

                            {status === "requesting" &&
                                "Choose your browser tab and enable audio sharing."
                            }

                            {status === "recording" &&
                                "Scizzor is capturing the shared audio."
                            }

                            {status === "completed" &&
                                "Your recording is ready."
                            }

                        </p>

                    </div>


                    {/* ERROR */}

                    {error && (

                        <div className="scizzor-error">

                            <AlertCircle size={19} />

                            {error}

                        </div>

                    )}


                    {/* RECORD BUTTON */}

                    <div className="scizzor-actions">


                        {(status === "idle" ||
                          status === "completed") && (

                            <button
                                className="scizzor-start-button"
                                onClick={startCapture}
                            >

                                <Mic size={20} />

                                Capture Audio

                            </button>

                        )}


                        {status === "requesting" && (

                            <button
                                className="scizzor-start-button"
                                disabled
                            >

                                <Loader2 className="scizzor-spin" />

                                Waiting...

                            </button>

                        )}


                        {status === "recording" && (

                            <button
                                className="scizzor-stop-button"
                                onClick={stopCapture}
                            >

                                <Square size={19} />

                                Stop Recording

                            </button>

                        )}

                    </div>


                    {/* RECORDING RESULT */}

                    {status === "completed" && audioUrl && (

                        <div className="scizzor-result">

                            <div className="scizzor-result-header">

                                <CheckCircle size={22} />

                                <div>

                                    <h3>Audio captured successfully</h3>

                                    <p>
                                        {formatFileSize(audioSize)}
                                    </p>

                                </div>

                            </div>


                            <audio
                                controls
                                src={audioUrl}
                                className="scizzor-audio-preview"
                            />


                            <button
                                className="scizzor-download-button"
                                onClick={downloadRecording}
                            >

                                <Download size={19} />

                                Download Recording

                            </button>

                        </div>

                    )}

                </div>


                {/* INFORMATION */}

                <div className="scizzor-information">

                    <h3>How to capture audio</h3>

                    <ol>

                        <li>Open the browser tab containing your media.</li>

                        <li>Return to Scizzor and click Capture Audio.</li>

                        <li>Select the Chrome tab you want to capture.</li>

                        <li>Enable Share tab audio.</li>

                        <li>Start playback and record your authorized audio.</li>

                        <li>Stop recording and download your result.</li>

                    </ol>

                    <p>
                        Only capture media you own or have permission
                        to record. Protected-content restrictions
                        cannot be bypassed.
                    </p>

                </div>


            </div>

        </div>

    );

}