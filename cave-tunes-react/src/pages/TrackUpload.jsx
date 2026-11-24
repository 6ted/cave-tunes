
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Music,
  Upload,
  X,
  Plus,
} from "lucide-react";

import { useUpload } from "../context/useUpload.jsx";

import "../styles/UploadStudio.css";

// Ensure featured artists are always stored as an array
function normalizeFeaturedArtists(value) {
  if (Array.isArray(value)) {
    return value
      .filter(name => typeof name === "string")
      .map(name => name.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map(name => name.trim())
      .filter(Boolean);
  }

  return [];
}

function TrackUpload() {
  const navigate = useNavigate();

  const {
    releaseData,
    updateReleaseData
  } = useUpload();

  const [tracks, setTracks] = useState(() =>
    (releaseData.tracks || []).map(track => ({
      ...track,
      featured_artists: normalizeFeaturedArtists(
        track.featured_artists
      )
    }))
  );

  const [artistInputs, setArtistInputs] = useState({});

  // ADD AUDIO FILES
  function handleFiles(files) {
    if (!files || files.length === 0) return;

    const newTracks = Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random()}`,

      name: file.name,

      file,

      url: URL.createObjectURL(file),

      // RELEASE INFORMATION
      release_type: releaseData.release_type || "single",

      title: releaseData.title || "",

      artist_name: releaseData.artist_name || "",

      album_name: releaseData.album_name || "",

      ep_name: releaseData.ep_name || "",

      genre: releaseData.genre || "",

      country: releaseData.country || "",

      language: releaseData.language || "",

      release_date: releaseData.release_date || "",

      // EACH NEW TRACK STARTS WITH ITS OWN EMPTY LIST
      featured_artists: []
    }));

    setTracks(prev => [
      ...prev,
      ...newTracks
    ]);
  }

  // REMOVE TRACK
  function removeTrack(id) {
    const trackToRemove = tracks.find(
      track => track.id === id
    );

    if (trackToRemove?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(trackToRemove.url);
    }

    setTracks(prev =>
      prev.filter(track => track.id !== id)
    );

    setArtistInputs(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  }

  // UPDATE ONE TRACK'S FEATURED ARTISTS
  function handleAddFeaturedArtist(trackId) {
    const artistName = (
      artistInputs[trackId] || ""
    ).trim();

    if (!artistName) return;

    setTracks(prev =>
      prev.map(track => {
        if (track.id !== trackId) {
          return track;
        }

        const currentArtists = normalizeFeaturedArtists(
          track.featured_artists
        );

        // Prevent duplicate artist names on the same track
        const alreadyExists = currentArtists.some(
          artist =>
            artist.toLowerCase() === artistName.toLowerCase()
        );

        if (alreadyExists) {
          return track;
        }

        return {
          ...track,
          featured_artists: [
            ...currentArtists,
            artistName
          ]
        };
      })
    );

    setArtistInputs(prev => ({
      ...prev,
      [trackId]: ""
    }));
  }

  // REMOVE ONE FEATURED ARTIST FROM ONE TRACK
  function handleRemoveFeaturedArtist(trackId, artistIndex) {
    setTracks(prev =>
      prev.map(track => {
        if (track.id !== trackId) {
          return track;
        }

        const updatedArtists = normalizeFeaturedArtists(
          track.featured_artists
        ).filter((_, index) => index !== artistIndex);

        return {
          ...track,
          featured_artists: updatedArtists
        };
      })
    );
  }

  // SAVE TRACKS AND CONTINUE
  function continueNext() {
    const updatedTracks = tracks.map(track => ({
      ...track,

      // Preserve each track's own featured artists
      featured_artists: normalizeFeaturedArtists(
        track.featured_artists
      )
    }));

    updateReleaseData({
      ...releaseData,

      // Do not use a shared release-level featured artist list
      featured_artists: [],

      tracks: updatedTracks
    });

    navigate("/artwork-upload");
  }

  return (
    <div className="upload-studio">

      <div className="upload-title">
        <Music size={42} />

        <div>
          <h1>
            Upload Tracks
          </h1>

          <p>
            Add your songs for this release
          </p>
        </div>
      </div>

      {/* AUDIO FILE SELECTION */}
      <div className="upload-section">
        <h2>
          Select Audio Files
        </h2>

        <label className="file-box">
          <Upload size={35} />

          <span>
            Choose MP3, WAV or FLAC files
          </span>

          <input
            type="file"
            accept="audio/*"
            multiple
            hidden
            onChange={e => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {/* TRACK LIST */}
      <div className="upload-section">
        <h2>
          Track List
        </h2>

        {tracks.length === 0 && (
          <p>
            No tracks added yet
          </p>
        )}

        {tracks.map((track, index) => {
          const trackFeaturedArtists = normalizeFeaturedArtists(
            track.featured_artists
          );

          return (
            <div
              className="release-card"
              key={track.id}
              style={{
                alignItems: "flex-start",
                marginBottom: "20px"
              }}
            >
              <Music />

              <div style={{ flex: 1, minWidth: 0 }}>

                <h3>
                  {index + 1}. {track.name}
                </h3>

                {/* AUDIO PREVIEW */}
                {track.url && (
                  <audio
                    controls
                    src={track.url}
                    style={{
                      width: "100%",
                      maxWidth: "400px"
                    }}
                  />
                )}

                {/* TRACK-SPECIFIC FEATURED ARTISTS */}
                <div
                  className="track-featured-artists"
                  style={{ marginTop: "15px" }}
                >
                  <h4>
                    Featured Artists
                  </h4>

                  <p>
                    Add the artists featured on this particular track.
                  </p>

                  {/* CURRENT ARTISTS */}
                  {trackFeaturedArtists.length > 0 && (
                    <div className="featured-artists-list">
                      {trackFeaturedArtists.map(
                        (artist, artistIndex) => (
                          <div
                            className="featured-artist-tag"
                            key={`${track.id}-${artistIndex}`}
                          >
                            <span>
                              {artist}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveFeaturedArtist(
                                  track.id,
                                  artistIndex
                                )
                              }
                              aria-label={`Remove ${artist}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* ADD ARTIST INPUT */}
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginTop: "10px",
                      flexWrap: "wrap"
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Enter featured artist name"
                      value={artistInputs[track.id] || ""}
                      onChange={e =>
                        setArtistInputs(prev => ({
                          ...prev,
                          [track.id]: e.target.value
                        }))
                      }
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddFeaturedArtist(track.id);
                        }
                      }}
                      style={{
                        flex: 1,
                        minWidth: "180px"
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handleAddFeaturedArtist(track.id)
                      }
                      disabled={
                        !(artistInputs[track.id] || "").trim()
                      }
                    >
                      <Plus size={16} />
                      Add Artist
                    </button>
                  </div>

                  {trackFeaturedArtists.length === 0 && (
                    <small>
                      No featured artists added to this track.
                    </small>
                  )}
                </div>

              </div>

              {/* REMOVE TRACK */}
              <button
                type="button"
                onClick={() => removeTrack(track.id)}
                aria-label={`Remove ${track.name}`}
              >
                <X />
              </button>

            </div>
          );
        })}
      </div>

      {/* CONTINUE */}
      <button
        className="next-button"
        onClick={continueNext}
        disabled={tracks.length === 0}
      >
        Continue To Artwork →
      </button>

    </div>
  );
}

export default TrackUpload;
