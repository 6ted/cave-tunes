// ======================================================
// CAVE TUNES
// SHARED SCIZZOR RECORDING ENGINE
// src/context/ScizzorContext.jsx
//
// Features:
// - Shared recording engine
// - Global Scizzor window state
// - Open Scizzor from YouTube player
// - Open Scizzor from floating icon
// - Minimize/close shared window
// - Browser tab audio capture
// - High-quality audio recording
// - 320 kbps recording bitrate request
// - Opus audio codec
// - 48 kHz sample rate preference
// - Stereo audio preference
// - Recording timer
// - Audio preview
// - Audio download
// - Persistent recording during navigation
// ======================================================

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import ScizzorContext from "./scizzorContextObject";


// ======================================================
// AUDIO QUALITY SETTINGS
// ======================================================

const AUDIO_QUALITY = {

    // Request high-quality Opus encoding.

    bitrate: 320000,

    // Preferred audio sample rate.

    sampleRate: 48000,

    // Preferred stereo audio.

    channelCount: 2,

};


// ======================================================
// PROVIDER
// ======================================================

export function ScizzorProvider({ children }) {

    // ==================================================
    // RECORDING STATE
    // ==================================================

    const [status, setStatus] = useState("idle");

    const [error, setError] = useState("");

    const [recordingTime, setRecordingTime] = useState(0);

    const [audioUrl, setAudioUrl] = useState("");

    const [audioBlob, setAudioBlob] = useState(null);

    const [audioSize, setAudioSize] = useState(0);


    // ==================================================
    // GLOBAL SCIZZOR WINDOW STATE
    // ==================================================

    const [isWidgetOpen, setIsWidgetOpen] = useState(false);

    const [isWidgetMinimized, setIsWidgetMinimized] = useState(false);


    // ==================================================
    // REFERENCES
    // ==================================================

    const recorderRef = useRef(null);

    const displayStreamRef = useRef(null);

    const audioStreamRef = useRef(null);

    const chunksRef = useRef([]);

    const timerRef = useRef(null);

    const audioUrlRef = useRef("");

    const mountedRef = useRef(false);

    const isStartingRef = useRef(false);


    // ==================================================
    // GLOBAL WINDOW CONTROLS
    // ==================================================

    const openWidget = useCallback(() => {

        setIsWidgetOpen(true);

        setIsWidgetMinimized(false);

    }, []);


    const closeWidget = useCallback(() => {

        setIsWidgetOpen(false);

    }, []);


    const toggleWidget = useCallback(() => {

        setIsWidgetOpen(previous => !previous);

        setIsWidgetMinimized(false);

    }, []);


    const minimizeWidget = useCallback(() => {

        setIsWidgetMinimized(true);

    }, []);


    const restoreWidget = useCallback(() => {

        setIsWidgetMinimized(false);

    }, []);


    const toggleWidgetMinimized = useCallback(() => {

        setIsWidgetMinimized(previous => !previous);

    }, []);


    // ==================================================
    // MIME TYPE DETECTION
    // ==================================================

    function getSupportedMimeType() {

        if (!window.MediaRecorder) {

            return "";

        }


        const formats = [

            "audio/webm;codecs=opus",

            "audio/ogg;codecs=opus",

            "audio/webm",

            "audio/mp4",

        ];


        return formats.find(type =>

            MediaRecorder.isTypeSupported(type)

        ) || "";

    }


    // ==================================================
    // FORMAT TIME
    // ==================================================

    function formatTime(seconds) {

        const minutes = Math.floor(seconds / 60);

        const remaining = seconds % 60;


        return (

            `${String(minutes).padStart(2, "0")}:` +

            `${String(remaining).padStart(2, "0")}`

        );

    }


    // ==================================================
    // FORMAT FILE SIZE
    // ==================================================

    function formatFileSize(bytes) {

        if (!bytes) {

            return "0 MB";

        }


        return (

            (bytes / 1024 / 1024).toFixed(2) +

            " MB"

        );

    }


    // ==================================================
    // TIMER
    // ==================================================

    function startTimer() {

        clearInterval(timerRef.current);


        timerRef.current = setInterval(() => {

            if (mountedRef.current) {

                setRecordingTime(previous => previous + 1);

            }

        }, 1000);

    }


    // ==================================================
    // AUDIO TRACK QUALITY
    // ==================================================

    async function configureAudioTrack(audioTrack) {

        if (!audioTrack) {

            return;

        }


        // ----------------------------------------------
        // REQUEST HIGH-QUALITY AUDIO CONSTRAINTS
        // ----------------------------------------------

        const constraints = {

            sampleRate: {

                ideal: AUDIO_QUALITY.sampleRate,

            },

            channelCount: {

                ideal: AUDIO_QUALITY.channelCount,

            },

            echoCancellation: false,

            noiseSuppression: false,

            autoGainControl: false,

        };


        try {

            await audioTrack.applyConstraints(constraints);

        } catch (err) {

            // Some browsers do not allow changing
            // display-capture audio constraints.
            //
            // Recording can still continue using
            // the original captured audio track.

            console.warn(

                "SCIZZOR: Browser could not apply all audio quality settings:",

                err

            );

        }


        // ----------------------------------------------
        // INSPECT ACTUAL AUDIO SETTINGS
        // ----------------------------------------------

        const settings = audioTrack.getSettings();


        console.log(

            "SCIZZOR AUDIO SETTINGS:",

            {

                sampleRate: settings.sampleRate || "Browser default",

                channelCount: settings.channelCount || "Browser default",

                echoCancellation: settings.echoCancellation,

                noiseSuppression: settings.noiseSuppression,

                autoGainControl: settings.autoGainControl,

            }

        );

    }


    // ==================================================
    // CLEANUP STREAMS
    // ==================================================

    function cleanupStreams() {

        clearInterval(timerRef.current);

        timerRef.current = null;


        if (audioStreamRef.current) {

            audioStreamRef.current

                .getTracks()

                .forEach(track => track.stop());


            audioStreamRef.current = null;

        }


        if (displayStreamRef.current) {

            displayStreamRef.current

                .getTracks()

                .forEach(track => track.stop());


            displayStreamRef.current = null;

        }


        recorderRef.current = null;

        isStartingRef.current = false;

    }


    // ==================================================
    // START CAPTURE
    // ==================================================

    async function startCapture() {

        // ----------------------------------------------
        // PREVENT DUPLICATE REQUESTS
        // ----------------------------------------------

        if (

            isStartingRef.current ||

            recorderRef.current?.state === "recording"

        ) {

            return;

        }


        isStartingRef.current = true;


        try {

            setError("");

            setAudioBlob(null);

            setAudioSize(0);

            setRecordingTime(0);


            // ------------------------------------------
            // REMOVE PREVIOUS RECORDING URL
            // ------------------------------------------

            if (audioUrlRef.current) {

                URL.revokeObjectURL(audioUrlRef.current);

                audioUrlRef.current = "";

            }


            setAudioUrl("");

            chunksRef.current = [];


            // ------------------------------------------
            // BROWSER SUPPORT
            // ------------------------------------------

            if (!navigator.mediaDevices?.getDisplayMedia) {

                throw new Error(

                    "Your browser does not support browser-tab audio capture."

                );

            }


            if (!window.MediaRecorder) {

                throw new Error(

                    "Your browser does not support audio recording."

                );

            }


            // ------------------------------------------
            // REQUEST TAB SHARING
            // ------------------------------------------

            setStatus("requesting");


            const displayStream =

                await navigator.mediaDevices.getDisplayMedia({

                    video: true,

                    audio: true,

                });


            displayStreamRef.current = displayStream;


            // ------------------------------------------
            // GET AUDIO TRACKS
            // ------------------------------------------

            const audioTracks = displayStream.getAudioTracks();


            if (!audioTracks.length) {

                throw new Error(

                    "No audio was shared. Select your browser tab and enable Share tab audio."

                );

            }


            // ------------------------------------------
            // CONFIGURE AUDIO QUALITY
            // ------------------------------------------

            const audioTrack = audioTracks[0];


            await configureAudioTrack(audioTrack);


            // ------------------------------------------
            // CREATE AUDIO STREAM
            // ------------------------------------------

            const audioStream = new MediaStream(audioTracks);

            audioStreamRef.current = audioStream;


            // ------------------------------------------
            // SELECT RECORDING FORMAT
            // ------------------------------------------

            const mimeType = getSupportedMimeType();


            // ------------------------------------------
            // CREATE HIGH-QUALITY RECORDER
            // ------------------------------------------

            const recorderOptions = {

                audioBitsPerSecond: AUDIO_QUALITY.bitrate,

            };


            if (mimeType) {

                recorderOptions.mimeType = mimeType;

            }


            const recorder = new MediaRecorder(

                audioStream,

                recorderOptions

            );


            recorderRef.current = recorder;


            console.log(

                "SCIZZOR RECORDING CONFIGURATION:",

                {

                    mimeType: recorder.mimeType,

                    requestedBitrate: AUDIO_QUALITY.bitrate,

                    actualBitrate: recorder.audioBitsPerSecond,

                }

            );


            // ------------------------------------------
            // COLLECT AUDIO DATA
            // ------------------------------------------

            recorder.ondataavailable = event => {

                if (event.data && event.data.size > 0) {

                    chunksRef.current.push(event.data);

                }

            };


            // ------------------------------------------
            // RECORDING STOPPED
            // ------------------------------------------

            recorder.onstop = () => {

                const blob = new Blob(

                    chunksRef.current,

                    {

                        type: recorder.mimeType || "audio/webm",

                    }

                );


                if (blob.size > 0) {

                    const url = URL.createObjectURL(blob);

                    audioUrlRef.current = url;


                    if (mountedRef.current) {

                        setAudioBlob(blob);

                        setAudioUrl(url);

                        setAudioSize(blob.size);

                        setStatus("completed");

                    }

                } else {

                    if (mountedRef.current) {

                        setError("No audio was captured.");

                        setStatus("idle");

                    }

                }


                cleanupStreams();

            };


            // ------------------------------------------
            // RECORDING ERROR
            // ------------------------------------------

            recorder.onerror = event => {

                console.error(

                    "SCIZZOR MEDIA RECORDER ERROR:",

                    event.error

                );


                if (mountedRef.current) {

                    setError(

                        event.error?.message ||

                        "An audio recording error occurred."

                    );

                    setStatus("idle");

                }


                cleanupStreams();

            };


            // ------------------------------------------
            // SHARED TAB ENDED
            // ------------------------------------------

            displayStream

                .getVideoTracks()

                .forEach(track => {

                    track.addEventListener("ended", () => {

                        if (recorder.state === "recording") {

                            recorder.stop();

                        }

                    });

                });


            // Also stop if the browser ends the audio track.

            audioTrack.addEventListener("ended", () => {

                if (recorder.state === "recording") {

                    recorder.stop();

                }

            });


            // ------------------------------------------
            // START RECORDING
            // ------------------------------------------

            recorder.start(1000);

            startTimer();

            setStatus("recording");


        } catch (err) {

            console.error(

                "SCIZZOR RECORDING ENGINE:",

                err

            );


            if (mountedRef.current) {

                setError(

                    err.message ||

                    "Unable to start audio capture."

                );

                setStatus("idle");

            }


            cleanupStreams();

        }

    }


    // ==================================================
    // STOP CAPTURE
    // ==================================================

    function stopCapture() {

        const recorder = recorderRef.current;


        if (

            recorder &&

            recorder.state === "recording"

        ) {

            recorder.stop();

        }


        clearInterval(timerRef.current);

        timerRef.current = null;

    }


    // ==================================================
    // DOWNLOAD RECORDING
    // ==================================================

    function downloadRecording() {

        if (!audioBlob || !audioUrl) {

            return;

        }


        const extension = audioBlob.type.includes("mp4")

            ? "m4a"

            : audioBlob.type.includes("ogg")

                ? "ogg"

                : "webm";


        const link = document.createElement("a");

        link.href = audioUrl;

        link.download =

            `cave-tunes-scizzor-${Date.now()}.${extension}`;


        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

    }


    // ==================================================
    // CLEAR RECORDING
    // ==================================================

    function clearRecording() {

        if (

            status === "recording" ||

            status === "requesting"

        ) {

            return;

        }


        if (audioUrlRef.current) {

            URL.revokeObjectURL(audioUrlRef.current);

            audioUrlRef.current = "";

        }


        setAudioUrl("");

        setAudioBlob(null);

        setAudioSize(0);

        setRecordingTime(0);

        setError("");

        setStatus("idle");

        chunksRef.current = [];

    }


    // ==================================================
    // PROVIDER CLEANUP
    // ==================================================

    useEffect(() => {

        mountedRef.current = true;


        return () => {

            mountedRef.current = false;

            clearInterval(timerRef.current);


            const recorder = recorderRef.current;


            if (

                recorder &&

                recorder.state !== "inactive"

            ) {

                recorder.onstop = null;

                recorder.stop();

            }


            if (audioStreamRef.current) {

                audioStreamRef.current

                    .getTracks()

                    .forEach(track => track.stop());


                audioStreamRef.current = null;

            }


            if (displayStreamRef.current) {

                displayStreamRef.current

                    .getTracks()

                    .forEach(track => track.stop());


                displayStreamRef.current = null;

            }


            recorderRef.current = null;

            isStartingRef.current = false;


            if (audioUrlRef.current) {

                URL.revokeObjectURL(audioUrlRef.current);

                audioUrlRef.current = "";

            }

        };

    }, []);


    // ==================================================
    // SHARED VALUES
    // ==================================================

    const value = {

        // Recording state

        status,

        error,

        setError,

        recordingTime,

        audioUrl,

        audioBlob,

        audioSize,


        // Recording actions

        startCapture,

        stopCapture,

        downloadRecording,

        clearRecording,


        // Utilities

        formatTime,

        formatFileSize,


        // Shared global widget state

        isWidgetOpen,

        isWidgetMinimized,


        // Shared global widget actions

        openWidget,

        closeWidget,

        toggleWidget,

        minimizeWidget,

        restoreWidget,

        toggleWidgetMinimized,

    };


    // ==================================================
    // PROVIDER
    // ==================================================

    return (

        <ScizzorContext.Provider value={value}>

            {children}

        </ScizzorContext.Provider>

    );

}