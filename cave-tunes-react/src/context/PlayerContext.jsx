import { API_BASE_URL as SHARED_API_BASE_URL } from "../services/api";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { PlayerContext } from "./PlayerContext";
import { useAuth } from "./AuthContext";

import {
  getSongLikeStatus,
  likeSong,
  unlikeSong,
 
} from "../services/api";

const API_BASE_URL = SHARED_API_BASE_URL;


// ======================================================
// MEDIA URL
// ======================================================

const getMediaUrl = (url) => {
  if (!url) return "";

  const value = String(url).trim();

  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_BASE_URL}${value}`;
  }

  return `${API_BASE_URL}/${value}`;
};


// ======================================================
// NORMALIZE SONG
// ======================================================

const normalizeSong = (song) => {
  if (!song) return null;

  const songId = song.id || song.song_id;

  const coverUrl =
    song.cover ||
    song.cover_url ||
    song.cover_image_url ||
    song.cover_file_url ||
    "";

  const audioUrl = songId
    ? `${API_BASE_URL}/api/music/${encodeURIComponent(songId)}/stream`
    : "";

  return {
    ...song,

    id: songId,

    title: song.title || song.song_title || "Untitled Song",

    artist: song.artist || song.artist_name || "Unknown Artist",

    album: song.album || song.album_name || "",

    audioUrl,

    cover: getMediaUrl(coverUrl),
  };
};


function PlayerProvider({ children }) {

  const { user } = useAuth();

  // ======================================================
  // MUSIC AUDIO
  // ======================================================

  const audioRef = useRef(new Audio());

// ======================================================
// VERIFIED LISTENING SESSION
// ======================================================

const listeningSessionRef = useRef(null);

const listeningHeartbeatBusyRef = useRef(false);

const visitorIdRef = useRef(null);

  // ======================================================
  // ADVERTISEMENT AUDIO
  // Separate from the music audio element.
  // ======================================================

  const adAudioRef = useRef(new Audio());

  const endedHandlerRef = useRef(null);

 


  // ======================================================
  // MUSIC STATE
  // ======================================================

  const [currentSong, setCurrentSong] = useState(null);

  const [queue, setQueue] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(-1);

  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);

  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(1);

  const [isShuffle, setIsShuffle] = useState(false);

  const [repeatMode, setRepeatMode] = useState("off");

  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);


  // ======================================================
  // ADVERTISEMENT STATE
  // ======================================================

  const [isAdPlaying, setIsAdPlaying] = useState(false);

  const [currentAd, setCurrentAd] = useState(null);

  const [isPremium, setIsPremium] = useState(false);

  const [adLoading, setAdLoading] = useState(false);


  // ======================================================
  // ADVERTISEMENT REFS
  // ======================================================

// Number of different songs selected by a free listener.
const selectedSongsRef = useRef(0);

// Song waiting to play after an advertisement.
const pendingSongRef = useRef(null);

  

  // Prevent overlapping advertisements.
  const isAdPlayingRef = useRef(false);

  // Advertisement rotation.
  const adIndexRef = useRef(0);

  // Stores what should happen after an advertisement.
  //
  // resume = resume current song
  // next = move to next song
  // repeat = restart current song
  //
  const adReturnActionRef = useRef("resume");

  // Current premium status.
  const premiumRef = useRef(false);

  // Latest music state references.
  const queueRef = useRef([]);

  const currentIndexRef = useRef(-1);

  const currentSongRef = useRef(null);

  const isShuffleRef = useRef(false);

  const repeatModeRef = useRef("off");

  const currentTimeRef = useRef(0);


  // Keep refs synchronized with React state.
// ======================================================
// KEEP PLAYER REFS SYNCHRONIZED WITH STATE
// ======================================================

useEffect(() => {
  queueRef.current = queue;

  currentIndexRef.current = currentIndex;

  currentSongRef.current = currentSong;

  isShuffleRef.current = isShuffle;

  repeatModeRef.current = repeatMode;

  currentTimeRef.current = currentTime;

}, [
  queue,
  currentIndex,
  currentSong,
  isShuffle,
  repeatMode,
  currentTime,
]);

  // ======================================================
  // SHARED PLAYLIST MODAL STATE
  // ======================================================

  const [playlistModalSong, setPlaylistModalSong] = useState(null);

  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);

  const openPlaylistModal = useCallback((song) => {

    if (!song?.id) return;

    setPlaylistModalSong(normalizeSong(song));

    setPlaylistModalOpen(true);

  }, []);

  const closePlaylistModal = useCallback(() => {

    setPlaylistModalOpen(false);

    setPlaylistModalSong(null);

  }, []);


  // ======================================================
  // GLOBAL LIKE STATE
  // ======================================================

  const [likeMap, setLikeMap] = useState({});


  // ======================================================
  // UPDATE LOCAL LIKE STATE
  // ======================================================

  const updateSongLikes = useCallback(
    (songId, liked, likesCount) => {

      if (!songId) return;

      setLikeMap((prev) => ({
        ...prev,

        [songId]: {
          liked: Boolean(liked),

          likes: Number(likesCount || 0),

          loading: false,
        },
      }));

    },
    []
  );


  // ======================================================
  // GET LIKE STATE
  // ======================================================

  const getSongLikeState = useCallback(
    (songId) => {

      if (!songId) {
        return {
          liked: false,
          likes: 0,
          loading: false,
        };
      }

      return (
        likeMap[songId] || {
          liked: false,
          likes: 0,
          loading: false,
        }
      );

    },
    [likeMap]
  );


  // ======================================================
  // LOAD LIKE STATUS
  // ======================================================

  const syncSongLikeStatus = useCallback(
    async (songId) => {

      if (!songId) return;

      try {

        const data = await getSongLikeStatus(songId);

        setLikeMap((prev) => ({
          ...prev,

          [songId]: {
            liked: Boolean(data.liked),

            likes: Number(data.likes || 0),

            loading: false,
          },
        }));

      } catch (error) {

        console.error(
          "Cave Tunes: Unable to load like status:",
          error
        );

      }

    },
    []
  );


  // ======================================================
  // LIKE / UNLIKE SONG
  // ======================================================

  const toggleSongLike = useCallback(
    async (songId) => {

      if (!songId) {

        console.warn(
          "Cave Tunes: Cannot like song — no song ID."
        );

        return null;
      }

      const current =
        likeMap[songId] || {
          liked: false,
          likes: 0,
          loading: false,
        };

      if (current.loading) return null;

      setLikeMap((prev) => ({
        ...prev,

        [songId]: {
          ...(prev[songId] || {
            liked: false,
            likes: 0,
          }),

          loading: true,
        },
      }));

      try {

        let data;

        if (current.liked) {

          data = await unlikeSong(songId);

          setLikeMap((prev) => ({
            ...prev,

            [songId]: {
              liked: false,

              likes: Number(data?.likes ?? 0),

              loading: false,
            },
          }));

          return {
            liked: false,

            likes: Number(data?.likes ?? 0),
          };

        }

        data = await likeSong(songId);

        setLikeMap((prev) => ({
          ...prev,

          [songId]: {
            liked: true,

            likes: Number(data?.likes ?? 0),

            loading: false,
          },
        }));

        return {
          liked: true,

          likes: Number(data?.likes ?? 0),
        };

      } catch (error) {

        console.error(
          "Cave Tunes: Like error:",
          error
        );

        setLikeMap((prev) => ({
          ...prev,

          [songId]: {
            ...current,

            loading: false,
          },
        }));

        throw error;
      }

    },
    [likeMap]
  );


  // ======================================================
  // SYNC LIKE STATUS WHEN SONG CHANGES
  // ======================================================

  useEffect(() => {

    if (!currentSong?.id) return;

    let isActive = true;

    const songId = currentSong.id;

    const loadLikeStatus = async () => {

      try {

        const data = await getSongLikeStatus(songId);

        if (!isActive) return;

        setLikeMap((prev) => ({
          ...prev,

          [songId]: {
            liked: Boolean(data.liked),

            likes: Number(data.likes || 0),
          },
        }));

      } catch (error) {

        console.error(
          "Cave Tunes: Unable to load like status:",
          error
        );

      }

    };

    loadLikeStatus();

    return () => {
      isActive = false;
    };

  }, [currentSong?.id]);


  // ======================================================
  // GET AUTHENTICATION TOKEN
  // ======================================================

  const getAuthToken = useCallback(() => {

    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken")
    );

  }, []);

// ======================================================
// GET OR CREATE ANONYMOUS LISTENER ID
// ======================================================

const getVisitorId = useCallback(() => {

  if (visitorIdRef.current) {
    return visitorIdRef.current;
  }

  let visitorId = localStorage.getItem("caveTunesVisitorId");

  if (!visitorId) {

    visitorId = crypto.randomUUID();

    localStorage.setItem(
      "caveTunesVisitorId",
      visitorId
    );

  }

  visitorIdRef.current = visitorId;

  return visitorId;

}, []);


// ======================================================
// START VERIFIED LISTENING SESSION
// ======================================================

const startListeningSession = useCallback(async (songId) => {

  if (!songId) return;

  // Clear the previous song's session.
  listeningSessionRef.current = null;

  try {

    const token = getAuthToken();

    const response = await fetch(
      `${API_BASE_URL}/api/music/${encodeURIComponent(songId)}/listening-session`,
      {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",

          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },

        body: JSON.stringify({
          visitor_id: getVisitorId(),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success || !data.session_id) {

      console.error(
        "Cave Tunes: Could not start listening session:",
        data
      );

      return;
    }

    listeningSessionRef.current = {
      songId: Number(songId),
      sessionId: data.session_id,
    };

    console.log(
      "Cave Tunes: Listening session started:",
      data.session_id
    );

  } catch (error) {

    console.error(
      "Cave Tunes: Listening session error:",
      error
    );

  }

}, [getAuthToken, getVisitorId]);


// ======================================================
// SEND LISTENING HEARTBEAT
// ======================================================

const sendListeningHeartbeat = useCallback(async () => {

  const session = listeningSessionRef.current;

  const audio = audioRef.current;

  // No session or no actual music playback.
  if (!session) return;

  if (audio.paused || isAdPlayingRef.current) return;

  if (listeningHeartbeatBusyRef.current) return;

  if (audio.currentTime <= 0) return;

  listeningHeartbeatBusyRef.current = true;

  try {

    const token = getAuthToken();

    const response = await fetch(
      `${API_BASE_URL}/api/music/${encodeURIComponent(session.songId)}/listening-session/${encodeURIComponent(session.sessionId)}/heartbeat`,
      {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",

          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },

        body: JSON.stringify({
          visitor_id: getVisitorId(),

          media_time: audio.currentTime,

          playing: true,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {

      console.error(
        "Cave Tunes: Listening heartbeat failed:",
        data
      );

      return;
    }

    console.log(
      "Cave Tunes: Listening progress:",
      data
    );

   if (data.qualified) {

  // Stop sending heartbeats for this completed session.
  listeningSessionRef.current = null;

  if (data.counted) {

    console.log(
      "Cave Tunes: Play successfully counted!"
    );

  } else {

    console.log(
      "Cave Tunes: Listening session completed:",
      data.message
    );

  }

}

  } catch (error) {

    console.error(
      "Cave Tunes: Heartbeat error:",
      error
    );

  } finally {

    listeningHeartbeatBusyRef.current = false;

  }

}, [getAuthToken, getVisitorId]);


// ======================================================
// AUTOMATIC LISTENING HEARTBEATS
// ======================================================

useEffect(() => {

  const interval = setInterval(() => {

    const audio = audioRef.current;

    if (
      !audio.paused &&
      !isAdPlayingRef.current &&
      listeningSessionRef.current
    ) {

      sendListeningHeartbeat();

    }

  }, 5000);

  return () => {
    clearInterval(interval);
  };

}, [sendListeningHeartbeat]);
  // ======================================================
  // PREMIUM SUBSCRIPTION CHECK
  //
  // Reuses the existing endpoint:
  // GET /api/subscription/status
  // ======================================================

  useEffect(() => {

    let isActive = true;

    const checkSubscription = async () => {

      const token = getAuthToken();

      // Guests are treated as free listeners.
      if (!token) {

        premiumRef.current = false;

        setIsPremium(false);

        return;
      }

      try {

        const response = await fetch(
          `${API_BASE_URL}/api/subscription/status`,
          {
            method: "GET",

            credentials: "include",

            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Subscription request failed: ${response.status}`
          );
        }

        const data = await response.json();

        if (!isActive) return;

        const premium = Boolean(data.isPremium);

        premiumRef.current = premium;

        setIsPremium(premium);

        console.log(
          "Cave Tunes subscription status:",
          premium ? "Premium" : "Free"
        );

      } catch (error) {

        console.error(
          "Cave Tunes: Subscription check failed:",
          error
        );

        // Fail open if subscription status cannot be verified.
        premiumRef.current = false;

        if (isActive) {
          setIsPremium(false);
        }

      }

    };

    checkSubscription();

    return () => {
      isActive = false;
    };

  }, [user, getAuthToken]);


 

  // ======================================================
  // SAVE PERSONAL LISTENING HISTORY
  // ======================================================

  const saveListeningHistory = useCallback(async (song) => {

    if (!song?.id) return;

    const songId = Number(song.id);

    if (!Number.isInteger(songId) || songId <= 0) {
      return;
    }

    try {

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("accessToken");

      const response = await fetch(
        `${API_BASE_URL}/api/library/history/${songId}`,
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type": "application/json",

            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
          },
        }
      );

      if (!response.ok) {

        console.error(
          "Cave Tunes: Unable to save listening history:",
          response.status
        );

      }

    } catch (error) {

      console.error(
        "Cave Tunes: Listening history request failed:",
        error
      );

    }

  }, []);


  // ======================================================
  // LOAD SONG
  // ======================================================

  const loadSong = useCallback(
    async (song) => {

      if (!song) return;

      const normalizedSong = normalizeSong(song);

      if (!normalizedSong?.audioUrl) {

        console.error(
          "Unable to load song: No audio URL found.",
          song
        );

        setIsPlaying(false);

        return;
      }

      const audio = audioRef.current;

      try {

       audio.pause();

audio.src = normalizedSong.audioUrl;

audio.currentTime = 0;

audio.load();

setCurrentSong(normalizedSong);

setCurrentTime(0);

setDuration(0);

await audio.play();

setIsPlaying(true);

// Do not create earning sessions for the artist's own songs.
const isOwnSong =
    user?.id &&
    Number(normalizedSong.user_id) === Number(user.id);

if (!isOwnSong) {
    await startListeningSession(normalizedSong.id);
} else {
    console.log(
        "Cave Tunes: Skipping earning session for your own song."
    );
}

// Listening history must still be saved for every song.
await saveListeningHistory(normalizedSong);
      } catch (error) {

        console.error(
          "Unable to load song:",
          error
        );

        setIsPlaying(false);

      }

    },
    [saveListeningHistory, startListeningSession, user,]
  );


  // ======================================================
  // ADVANCE TO NEXT SONG
  //
  // Internal function.
  // This function does not check whether an ad is due.
  // ======================================================

  const advanceSong = useCallback(async () => {

    const currentQueue = queueRef.current;

    const index = currentIndexRef.current;

    if (currentQueue.length === 0) {

      setIsPlaying(false);

      return;
    }

    if (isShuffleRef.current) {

      if (currentQueue.length === 1) {

        await loadSong(currentQueue[0]);

        return;
      }

      let nextIndex;

      do {

        nextIndex = Math.floor(
          Math.random() * currentQueue.length
        );

      } while (nextIndex === index);

      setCurrentIndex(nextIndex);

      await loadSong(currentQueue[nextIndex]);

      return;
    }

    const nextIndex = index + 1;

    if (nextIndex >= currentQueue.length) {

      if (repeatModeRef.current === "all") {

        setCurrentIndex(0);

        await loadSong(currentQueue[0]);

        return;
      }

      setIsPlaying(false);

      setCurrentTime(0);

      return;
    }

    setCurrentIndex(nextIndex);

    await loadSong(currentQueue[nextIndex]);

  }, [loadSong]);


  // ======================================================
  // ADVERTISEMENT RETURN ACTION
  // ======================================================
// ======================================================
// ADVERTISEMENT RETURN ACTION
// ======================================================

const runAdReturnAction = useCallback(async () => {

  const action = adReturnActionRef.current;

  adReturnActionRef.current = "resume";

  // Play the song selected before the advertisement.
  if (action === "selected") {

    const pendingSong = pendingSongRef.current;

    pendingSongRef.current = null;

    if (pendingSong) {
      await loadSong(pendingSong);
    }

    return;
  }

  // Resume the existing song at its saved position.
  if (action === "resume") {

    try {

      await audioRef.current.play();

      setIsPlaying(true);

    } catch (error) {

      console.error(
        "Cave Tunes: Unable to resume music:",
        error
      );

    }

    return;
  }

  // Move to the next song.
  if (action === "next") {

    await advanceSong();

    return;
  }

  // Repeat the current song.
  if (action === "repeat") {

    try {

      audioRef.current.currentTime = 0;

      setCurrentTime(0);

      await audioRef.current.play();

      setIsPlaying(true);

    } catch (error) {

      console.error(
        "Cave Tunes: Unable to repeat song:",
        error
      );

    }

  }

}, [advanceSong, loadSong]);

  // ======================================================
  // START ADVERTISEMENT
  //
  // Gets active advertisements from:
  // GET /api/ads/active
  //
  // Streams advertisements from:
  // GET /api/ads/:id/stream
  // ======================================================

  const startAdvertisement = useCallback(
    async (returnAction = "resume") => {

      // Premium users never receive forced advertisements.
      if (premiumRef.current) {

        await runAdReturnAction();

        return;
      }

      // Prevent overlapping advertisements.
      if (isAdPlayingRef.current) return;

      const adAudio = adAudioRef.current;

      adReturnActionRef.current = returnAction;

      // Pause music while the advertisement plays.
      audioRef.current.pause();

      setIsPlaying(false);

      setAdLoading(true);

      try {

        const token = getAuthToken();

        const response = await fetch(
          `${API_BASE_URL}/api/ads/active`,
          {
            method: "GET",

            credentials: "include",

            headers: {
              ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            },
          }
        );

        if (!response.ok) {

          throw new Error(
            `Unable to retrieve advertisements: ${response.status}`
          );

        }

        const data = await response.json();

        const ads = Array.isArray(data.ads)
          ? data.ads
          : [];

        // No active advertisements:
        // Do not trap the listener.
        if (ads.length === 0) {

          console.warn(
            "Cave Tunes: No active advertisements available."
          );

          selectedSongsRef.current = 0;

       

          setAdLoading(false);

          await runAdReturnAction();

          return;
        }

        // Rotate through active advertisements.
        const selectedIndex =
          adIndexRef.current % ads.length;

        const selectedAd = ads[selectedIndex];

        adIndexRef.current =
          (selectedIndex + 1) % ads.length;

        if (!selectedAd?.id) {

          throw new Error(
            "Invalid advertisement received."
          );

        }

        const adUrl =
          `${API_BASE_URL}/api/ads/${encodeURIComponent(selectedAd.id)}/stream`;

        adAudio.pause();

        adAudio.src = adUrl;

        adAudio.currentTime = 0;

        adAudio.volume = audioRef.current.volume;

        adAudio.load();

        setCurrentAd(selectedAd);

        isAdPlayingRef.current = true;

        setIsAdPlaying(true);

        setAdLoading(false);

      console.log(
  "Cave Tunes: Playing advertisement:",
  selectedAd.title
);

await adAudio.play();

// Reset only after advertisement playback starts successfully.
selectedSongsRef.current = 0;

console.log(
  "Cave Tunes: Advertisement started. Selection counter reset."
);

      } catch (error) {

        console.error(
          "Cave Tunes: Advertisement playback failed:",
          error
        );

        adAudio.pause();

        isAdPlayingRef.current = false;

        setIsAdPlaying(false);

        setCurrentAd(null);

        setAdLoading(false);

        // If an advertisement cannot play,
        // do not leave the music player paused.
        await runAdReturnAction();

      }

    },
    [getAuthToken, runAdReturnAction]
  );


  // ======================================================
  // ADVERTISEMENT AUDIO EVENTS
  // ======================================================

  useEffect(() => {

    const adAudio = adAudioRef.current;

    const handleAdEnded = async () => {

      if (!isAdPlayingRef.current) return;

      console.log(
        "Cave Tunes: Advertisement completed."
      );

      isAdPlayingRef.current = false;

      setIsAdPlaying(false);

      setCurrentAd(null);

      adAudio.removeAttribute("src");

      adAudio.load();

      await runAdReturnAction();

    };

    const handleAdError = () => {

      if (!isAdPlayingRef.current) return;

      console.error(
        "Cave Tunes: Advertisement audio error:",
        adAudio.error
      );

      isAdPlayingRef.current = false;

      setIsAdPlaying(false);

      setCurrentAd(null);

      setAdLoading(false);

      adAudio.pause();

      adAudio.removeAttribute("src");

      adAudio.load();

      runAdReturnAction();

    };

    adAudio.addEventListener("ended", handleAdEnded);

    adAudio.addEventListener("error", handleAdError);

    return () => {

      adAudio.removeEventListener("ended", handleAdEnded);

      adAudio.removeEventListener("error", handleAdError);

      adAudio.pause();

    };

  }, [runAdReturnAction]);


  // ======================================================
  // MANUAL NEXT SONG
  //
  // If an advertisement is due, play it first.
  // Manual skipping does not count as a completion.
  // ======================================================
// ======================================================
// MANUAL NEXT SONG
// ======================================================

const nextSong = useCallback(async () => {

  if (isAdPlayingRef.current) return;

  await advanceSong();

}, [advanceSong]);

// ======================================================
// NATURAL SONG COMPLETION
//
// Song completion no longer counts toward advertisements.
// Advertisements are triggered by selecting songs.
// ======================================================

const handleSongEnded = useCallback(() => {

  if (isAdPlayingRef.current) return;

  // Repeat One.
  if (repeatModeRef.current === "one") {

    const audio = audioRef.current;

    audio.currentTime = 0;

    audio.play().catch((error) => {

      console.error(
        "Unable to repeat song:",
        error
      );

    });

    return;
  }

  // Otherwise advance normally.
  advanceSong();

}, [advanceSong]);

  // ======================================================
  // MUSIC AUDIO EVENT HANDLER
  // ======================================================

  useEffect(() => {

    const audio = audioRef.current;

    const handleTimeUpdate = () => {

      setCurrentTime(audio.currentTime || 0);

    };

    const handleLoadedMetadata = () => {

      setDuration(
        Number.isFinite(audio.duration)
          ? audio.duration
          : 0
      );

    };

    const handlePlay = () => {

      setIsPlaying(true);

    };

    const handlePause = () => {

      setIsPlaying(false);

    };

    const handleEnded = () => {

      if (endedHandlerRef.current) {
        endedHandlerRef.current();
      }

    };

    const handleError = () => {

      console.error(
        "Audio element error:",
        {
          src: audio.src,
          error: audio.error,
        }
      );

    };

    audio.addEventListener("timeupdate", handleTimeUpdate);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    audio.addEventListener("play", handlePlay);

    audio.addEventListener("pause", handlePause);

    audio.addEventListener("ended", handleEnded);

    audio.addEventListener("error", handleError);

    return () => {

      audio.removeEventListener("timeupdate", handleTimeUpdate);

      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);

      audio.removeEventListener("play", handlePlay);

      audio.removeEventListener("pause", handlePause);

      audio.removeEventListener("ended", handleEnded);

      audio.removeEventListener("error", handleError);

      audio.pause();

    };

  }, []);


  // ======================================================
  // UPDATE ENDED HANDLER
  // ======================================================

  useEffect(() => {

    endedHandlerRef.current = handleSongEnded;

  }, [handleSongEnded]);


  // ======================================================
  // MUSIC AND ADVERTISEMENT VOLUME
  // ======================================================

  useEffect(() => {

    audioRef.current.volume = volume;

    adAudioRef.current.volume = volume;

  }, [volume]);



// ======================================================
// PLAY SONG
//
// Free listeners can select two different songs
// without advertisements.
// The third selection triggers an advertisement.
// ======================================================

const playSong = useCallback(
  async (song, songs = []) => {

    if (!song) return;

    // Do not allow another song to interrupt an ad.
    if (isAdPlayingRef.current) return;

    const normalizedSong = normalizeSong(song);

    if (!normalizedSong?.audioUrl) return;

    const normalizedQueue =
      Array.isArray(songs) && songs.length > 0
        ? songs.map(normalizeSong).filter(Boolean)
        : [];

    if (normalizedQueue.length > 0) {

      setQueue(normalizedQueue);

      const index = normalizedQueue.findIndex(
        (item) => item.id === normalizedSong.id
      );

      setCurrentIndex(index >= 0 ? index : 0);

    } else if (queueRef.current.length === 0) {

      setQueue([normalizedSong]);

      setCurrentIndex(0);

    }

    // Same song: resume without counting another selection.
    if (currentSongRef.current?.id === normalizedSong.id) {

      if (!audioRef.current.paused) return;

      try {

        if (!audioRef.current.src) {

          audioRef.current.src = normalizedSong.audioUrl;

          audioRef.current.load();

        }

        await audioRef.current.play();

        setIsPlaying(true);

      } catch (error) {

        console.error(
          "Unable to resume song:",
          error
        );

      }

      return;
    }

    // Premium listeners never receive forced advertisements.
    if (!premiumRef.current) {

      selectedSongsRef.current += 1;

      console.log(
        "Cave Tunes: Song selections:",
        selectedSongsRef.current
      );

      // Allow TWO songs before triggering an advertisement.
      if (selectedSongsRef.current >= 3) {

        console.log(
          "Cave Tunes: Third song selected. Advertisement due."
        );

        // Save the selected song for playback after the ad.
        pendingSongRef.current = normalizedSong;

        await startAdvertisement("selected");

        return;
      }

    }

    // First and second selections play immediately.
    // Premium listeners also play immediately.
    await loadSong(normalizedSong);

  },
  [loadSong, startAdvertisement]
);


  // ======================================================
  // PAUSE SONG
  //
  // During an advertisement, pause the advertisement.
  // ======================================================

  const pauseSong = useCallback(() => {

    if (isAdPlayingRef.current) {

      adAudioRef.current.pause();

      return;
    }

    audioRef.current.pause();

    setIsPlaying(false);

  }, []);


  // ======================================================
  // TOGGLE PLAY / PAUSE
  // ======================================================

  const togglePlay = useCallback(async () => {

    // Toggle advertisement playback if an ad is active.
    if (isAdPlayingRef.current) {

      const adAudio = adAudioRef.current;

      if (adAudio.paused) {

        try {

          await adAudio.play();

        } catch (error) {

          console.error(
            "Unable to resume advertisement:",
            error
          );

        }

      } else {

        adAudio.pause();

      }

      return;
    }

    if (!currentSongRef.current) return;

    if (!audioRef.current.paused) {

      audioRef.current.pause();

      setIsPlaying(false);

      return;
    }

    try {

      await audioRef.current.play();

      setIsPlaying(true);

    } catch (error) {

      console.error(
        "Unable to resume song:",
        error
      );

    }

  }, []);


  // ======================================================
  // PREVIOUS SONG
  // ======================================================

  const previousSong = useCallback(async () => {

    // Do not allow skipping an active advertisement.
    if (isAdPlayingRef.current) return;

    const currentQueue = queueRef.current;

    const index = currentIndexRef.current;

    if (currentQueue.length === 0) return;

    if (currentTimeRef.current > 3) {

      audioRef.current.currentTime = 0;

      setCurrentTime(0);

      return;
    }

    const previousIndex = index - 1;

    if (previousIndex < 0) {

      if (repeatModeRef.current === "all") {

        const lastIndex = currentQueue.length - 1;

        setCurrentIndex(lastIndex);

        await loadSong(currentQueue[lastIndex]);

        return;
      }

      audioRef.current.currentTime = 0;

      setCurrentTime(0);

      return;
    }

    setCurrentIndex(previousIndex);

    await loadSong(currentQueue[previousIndex]);

  }, [loadSong]);


  // ======================================================
  // SEEK
  // ======================================================

  const seek = useCallback((time) => {

    // Do not allow seeking through an advertisement.
    if (isAdPlayingRef.current) return;

    const newTime = Number(time);

    if (!Number.isFinite(newTime)) return;

    audioRef.current.currentTime = newTime;

    setCurrentTime(newTime);

  }, []);


  // ======================================================
  // CHANGE VOLUME
  // ======================================================

  const changeVolume = useCallback((newVolume) => {

    const value = Math.min(
      1,
      Math.max(0, Number(newVolume))
    );

    setVolume(value);

    audioRef.current.volume = value;

    adAudioRef.current.volume = value;

  }, []);


  // ======================================================
  // SHUFFLE
  // ======================================================

  const toggleShuffle = useCallback(() => {

    setIsShuffle((prev) => !prev);

  }, []);


  // ======================================================
  // REPEAT
  // ======================================================

  const toggleRepeat = useCallback(() => {

    setRepeatMode((prev) => {

      if (prev === "off") return "all";

      if (prev === "all") return "one";

      return "off";

    });

  }, []);


  // ======================================================
  // STOP PLAYER
  // ======================================================

  const stopSong = useCallback(() => {

    const audio = audioRef.current;

    const adAudio = adAudioRef.current;

    audio.pause();

    audio.removeAttribute("src");

    audio.load();

    audio.currentTime = 0;

    adAudio.pause();

    adAudio.removeAttribute("src");

    adAudio.load();

    adAudio.currentTime = 0;

    isAdPlayingRef.current = false;


 selectedSongsRef.current = 0;

    adReturnActionRef.current = "resume";

    setIsAdPlaying(false);

    setCurrentAd(null);

    setAdLoading(false);

    setCurrentSong(null);

    setCurrentIndex(-1);

    setIsPlaying(false);

    setCurrentTime(0);

    setDuration(0);

    setQueue([]);

  }, []);


  // ======================================================
  // PLAYER CONTEXT VALUE
  // ======================================================

  const value = {

    // MUSIC
    currentSong,

    queue,

    currentIndex,

    isPlaying,

    currentTime,

    duration,

    volume,

    isShuffle,

    repeatMode,

    playSong,

    pauseSong,

    togglePlay,

    nextSong,

    previousSong,

    seek,

    changeVolume,

    toggleShuffle,

    toggleRepeat,

    stopSong,

    fullPlayerOpen,

    setFullPlayerOpen,


    // ADVERTISEMENT
    isAdPlaying,

    currentAd,

    isPremium,

    adLoading,


    // LIKES
    likeMap,

    updateSongLikes,

    getSongLikeState,

    syncSongLikeStatus,

    toggleSongLike,


    // PLAYLIST MODAL
    playlistModalSong,

    playlistModalOpen,

    openPlaylistModal,

    closePlaylistModal,

  };


  return (

    <PlayerContext.Provider value={value}>

      {children}

    </PlayerContext.Provider>

  );

}

export default PlayerProvider;