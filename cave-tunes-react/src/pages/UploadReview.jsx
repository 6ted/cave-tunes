
import { useState } from "react";

import {
  CheckCircle,
  Music,
  Image,
  Globe,
  Copyright,
  Send,
  Loader,
  User,
  FileText,
  DollarSign,
  ShieldCheck,
} from "lucide-react";

import { useUpload } from "../context/useUpload.jsx";

import { uploadRelease } from "../services/uploadService.js";

import "../styles/UploadStudio.css";

// ======================================================
// NORMALIZE FEATURED ARTISTS
// ======================================================

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

// ======================================================
// MAIN COMPONENT
// ======================================================

function UploadReview() {
  const { releaseData } = useUpload();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);
const [uploadStage, setUploadStage] = useState("uploading");
  // ======================================================
  // NORMALIZE RELEASE DATA
  // ======================================================

  const releaseType =
    releaseData.release_type ||
    releaseData.releaseType ||
    "single";

  const artistName =
    releaseData.artist_name ||
    releaseData.artistName ||
    "";

  const title = releaseData.title || "";
  const country = releaseData.country || "";
  const genre = releaseData.genre || "";
  const language = releaseData.language || "";

  const releaseDate =
    releaseData.release_date ||
    releaseData.releaseDate ||
    "";

  const albumName =
    releaseData.album_name ||
    releaseData.albumName ||
    "";

  const epName =
    releaseData.ep_name ||
    releaseData.epName ||
    "";

  const tracks = Array.isArray(releaseData.tracks)
    ? releaseData.tracks
    : [];

  const metadata = releaseData.metadata || {};
  const distribution = releaseData.distribution || {};
  const copyright = releaseData.copyright || {};

  // ======================================================
  // ROYALTY SPLITS
  // ======================================================

  const royaltyData =
    releaseData.royalty_splits || {};

  const royaltySplits =
    Array.isArray(royaltyData.splits)
      ? royaltyData.splits
      : [];

  const individualRoyaltyTracks =
    Array.isArray(royaltyData.tracks)
      ? royaltyData.tracks
      : [];

  const royaltyTotal = royaltySplits.reduce(
    (total, split) =>
      total + Number(split.percentage || 0),
    0
  );

  const isValidRoyaltyTotal = total =>
    Math.abs(total - 100) < 0.001;

  // ======================================================
  // RELEASE TITLE
  // ======================================================

  function getReleaseTitle() {
    if (releaseType === "ep") {
      return epName || title || "Untitled EP";
    }

    if (releaseType === "album") {
      return albumName || title || "Untitled Album";
    }

    return title || "Untitled Single";
  }




  // ======================================================
  // SUBMIT RELEASE
  // ======================================================

  const submitRelease = async () => {
    try {
      if (!tracks.length) {
        setMessage("Please add at least one audio track.");
        return;
      }

      // Every track must have an audio file.
      const missingAudioIndex = tracks.findIndex(
        track => !track.file
      );

      if (missingAudioIndex !== -1) {
        setMessage(
          `Track ${missingAudioIndex + 1} is missing its audio file. Please go back and select it again.`
        );
        return;
      }

      // ==================================================
      // VALIDATE ROYALTY SPLITS
      // ==================================================

      if (royaltyData.apply_to_all) {
        if (
          royaltySplits.length > 0 &&
          !isValidRoyaltyTotal(royaltyTotal)
        ) {
          setMessage(
            `Royalty splits must equal 100%. Current total: ${royaltyTotal}%.`
          );
          return;
        }
      } else if (individualRoyaltyTracks.length > 0) {
        for (let index = 0; index < tracks.length; index++) {
          const savedTrack = individualRoyaltyTracks.find(
            entry => Number(entry.track_index) === index
          );

          const splits = Array.isArray(savedTrack?.splits)
            ? savedTrack.splits
            : [];

          const total = splits.reduce(
            (sum, split) =>
              sum + Number(split.percentage || 0),
            0
          );

          if (!isValidRoyaltyTotal(total)) {
            setMessage(
              `Track ${index + 1} royalty splits must equal 100%. Current total: ${total}%.`
            );
            return;
          }
        }
      }

      setLoading(true);
setUploadProgress(0);
setUploadStage("uploading");
setMessage("Uploading release...");
      const formData = new FormData();

      // ==================================================
      // TRACK-SPECIFIC FEATURED ARTISTS
      // ==================================================

      const trackFeaturedArtists = tracks.map(
        (track, index) => ({
          track_index: index,

          track_name:
            track.name ||
            track.title ||
            track.file?.name ||
            `Track ${index + 1}`,

          featured_artists: normalizeFeaturedArtists(
            track.featured_artists
          )
        })
      );

// ==================================================
// VALIDATE TRACK FILES
// ==================================================



// ==================================================
// TRACK-SPECIFIC FEATURED ARTISTS
// ==================================================



formData.append(
    "track_featured_artists",
    JSON.stringify(trackFeaturedArtists)
);

     

      // ==================================================
      // RELEASE INFORMATION
      // ==================================================

      formData.append(
        "release_type",
        releaseType.toLowerCase()
      );

      formData.append("title", title);
      formData.append("artist_name", artistName);
      formData.append("album_name", albumName);
      formData.append("ep_name", epName);
      formData.append("genre", genre);
      formData.append("country", country);
      formData.append("language", language);
      formData.append("release_date", releaseDate);

      // ==================================================
      // AUDIO FILES
      // Order MUST match trackFeaturedArtists
      // ==================================================

tracks.forEach(track => {
    formData.append(
        "audio",
        track.file
    );
});

      // ==================================================
      // COVER
      // ==================================================

      if (releaseData.cover) {
        formData.append("cover", releaseData.cover);
      }

      // ==================================================
      // COPYRIGHT
      // ==================================================

      formData.append(
        "copyright_owner",
        copyright.copyrightOwner || ""
      );

      formData.append(
        "master_owner",
        copyright.masterOwner || ""
      );

      formData.append(
        "copyright_year",
        copyright.copyrightYear || ""
      );

      formData.append(
        "publishing_rights",
        copyright.publishingRights || ""
      );

      formData.append(
        "license",
        copyright.license || ""
      );

      // ==================================================
      // METADATA
      // ==================================================

      formData.append("isrc", metadata.isrc || "");
      formData.append("upc", metadata.upc || "");

      formData.append(
        "record_label",
        metadata.recordLabel || ""
      );

      formData.append(
        "producer",
        metadata.producer || ""
      );

      formData.append(
        "composer",
        metadata.composer || ""
      );

      formData.append(
        "songwriter",
        metadata.songwriter || ""
      );

      formData.append(
        "mix_engineer",
        metadata.mixingEngineer || ""
      );

      formData.append(
        "master_engineer",
        metadata.masteringEngineer || ""
      );

      formData.append(
        "lyrics",
        metadata.lyrics || ""
      );

      // ==================================================
      // DISTRIBUTION
      // ==================================================

      formData.append(
        "platforms",
        JSON.stringify(
          distribution.platforms?.length
            ? distribution.platforms
            : ["Cave Tunes"]
        )
      );

      formData.append(
        "territories",
        distribution.territories || "Worldwide"
      );

      formData.append(
        "monetization_enabled",
        distribution.monetizedEnabled ? "true" : "false"
      );

      formData.append(
        "streaming_royalties",
        distribution.streamingRoyalties ? "true" : "false"
      );

      formData.append(
        "download_sales",
        distribution.downloadSales ? "true" : "false"
      );

      formData.append(
        "youtube_monetization",
        distribution.youtubeMonetization ? "true" : "false"
      );

      formData.append(
        "scheduled_release",
        distribution.scheduledRelease || ""
      );

      // ==================================================
      // ROYALTY SPLITS
      // ==================================================

      const hasIndividualSplits =
        individualRoyaltyTracks.length > 0;

      const finalRoyaltyData =
        royaltySplits.length > 0 || hasIndividualSplits
          ? royaltyData
          : {
              apply_to_all: true,
              splits: [
                {
                  user_id: null,
                  participant_name: artistName || "Song Owner",
                  role: "master_owner",
                  percentage: 100
                }
              ]
            };

      formData.append(
        "royalty_splits",
        JSON.stringify(finalRoyaltyData)
      );

      // ==================================================
      // DEBUG
      // ==================================================

      console.log("========================================");
      console.log("FINAL RELEASE SUBMISSION");
      console.log("========================================");

      console.log(
        "TRACK FEATURED ARTISTS:",
        trackFeaturedArtists
      );

      for (const [key, value] of formData.entries()) {
        if (key !== "audio" && key !== "cover") {
          console.log(key, ":", value);
        }
      }

      console.log("========================================");

      // ==================================================
      // SEND TO BACKEND
      // ==================================================

     const result = await uploadRelease(
  formData,
  (progress) => {
    setUploadProgress(progress.percentage);

    if (progress.percentage >= 100) {
      setUploadStage("processing");
    } else {
      setUploadStage("uploading");
    }
  }
);

      console.log("UPLOAD SUCCESS:", result);

      setMessage(
        result.message ||
        "Release uploaded successfully 🎵"
      );

    } catch (error) {
      console.error("UPLOAD ERROR:", error);

      setMessage(
        error.message || "Upload failed."
      );

  } finally {
  setLoading(false);
  setUploadProgress(0);
  setUploadStage("uploading");
}
  };

  // ======================================================
  // COMPONENT
  // ======================================================

  return (
    <div className="upload-studio">

      {/* HEADER */}

      <div className="upload-title">
        <CheckCircle size={42} />

        <div>
          <h1>Review Release</h1>

          <p>
            Review all information before submitting your release
          </p>
        </div>
      </div>

      {/* RELEASE INFORMATION */}

      <div className="upload-section">
        <h2>
          <Music size={22} />
          Release Information
        </h2>

        <p>
          <strong>Release Type:</strong>{" "}
          {releaseType.toUpperCase()}
        </p>

        <p>
          <strong>Release Title:</strong>{" "}
          {getReleaseTitle()}
        </p>

        <p>
          <strong>Artist:</strong>{" "}
          {artistName || "Not provided"}
        </p>

        <p>
          <strong>Country:</strong>{" "}
          {country || "Not selected"}
        </p>

        <p>
          <strong>Genre:</strong>{" "}
          {genre || "Not selected"}
        </p>

        <p>
          <strong>Language:</strong>{" "}
          {language || "Not selected"}
        </p>

        <p>
          <strong>Release Date:</strong>{" "}
          {releaseDate || "Not scheduled"}
        </p>

        {releaseType === "album" && (
          <p>
            <strong>Album Name:</strong>{" "}
            {albumName || "Not provided"}
          </p>
        )}

        {releaseType === "ep" && (
          <p>
            <strong>EP Name:</strong>{" "}
            {epName || "Not provided"}
          </p>
        )}
      </div>

      {/* TRACKS */}

      <div className="upload-section">
        <h2>
          <Music size={22} />
          Tracks ({tracks.length})
        </h2>

        {tracks.length > 0 ? (
          tracks.map((track, index) => {
            const featuredArtists =
              normalizeFeaturedArtists(
                track.featured_artists
              );

            return (
              <div
                className="release-card"
                key={track.id || index}
              >
                <Music size={24} />

                <div>
                  <h3>
                    {index + 1}.{" "}
                    {track.name ||
                      track.file?.name ||
                      "Untitled Track"}
                  </h3>

                  <p>
                    <strong>Featured Artists:</strong>{" "}
                    {featuredArtists.length > 0
                      ? featuredArtists.join(", ")
                      : "None"}
                  </p>

                  {track.url && (
                    <audio
                      controls
                      src={track.url}
                    />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p>No tracks added.</p>
        )}
      </div>

      {/* ARTWORK */}

      <div className="upload-section">
        <h2>
          <Image size={22} />
          Artwork
        </h2>

        {releaseData.cover ? (
          <>
            <p>
              <strong>File:</strong>{" "}
              {releaseData.cover.name}
            </p>

            {releaseData.cover.type?.startsWith("image/") && (
              <img
                src={URL.createObjectURL(releaseData.cover)}
                alt="Release artwork"
                style={{
                  width: "220px",
                  height: "220px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  marginTop: "10px"
                }}
              />
            )}
          </>
        ) : (
          <p>No artwork uploaded.</p>
        )}
      </div>

      {/* METADATA */}

      <div className="upload-section">
        <h2>
          <FileText size={22} />
          Music Metadata
        </h2>

        <p>
          <strong>ISRC:</strong>{" "}
          {metadata.isrc || "Not provided"}
        </p>

        <p>
          <strong>UPC:</strong>{" "}
          {metadata.upc || "Not provided"}
        </p>

        <p>
          <strong>Record Label:</strong>{" "}
          {metadata.recordLabel || "Not provided"}
        </p>

        <p>
          <strong>Producer:</strong>{" "}
          {metadata.producer || "Not provided"}
        </p>

        <p>
          <strong>Composer:</strong>{" "}
          {metadata.composer || "Not provided"}
        </p>

        <p>
          <strong>Songwriter:</strong>{" "}
          {metadata.songwriter || "Not provided"}
        </p>

        <p>
          <strong>Mixing Engineer:</strong>{" "}
          {metadata.mixingEngineer || "Not provided"}
        </p>

        <p>
          <strong>Mastering Engineer:</strong>{" "}
          {metadata.masteringEngineer || "Not provided"}
        </p>

        <div>
          <strong>Lyrics:</strong>

          <div
            style={{
              whiteSpace: "pre-wrap",
              marginTop: "8px"
            }}
          >
            {metadata.lyrics || "No lyrics provided"}
          </div>
        </div>
      </div>

      {/* DISTRIBUTION */}

      <div className="upload-section">
        <h2>
          <Globe size={22} />
          Distribution
        </h2>

        <p>
          <strong>Platforms:</strong>{" "}
          {distribution.platforms?.length
            ? distribution.platforms.join(", ")
            : "Cave Tunes"}
        </p>

        <p>
          <strong>Territories:</strong>{" "}
          {distribution.territories || "Worldwide"}
        </p>

        <p>
          <strong>Monetization:</strong>{" "}
          {distribution.monetizedEnabled ? "Enabled" : "Disabled"}
        </p>

        <p>
          <strong>Streaming Royalties:</strong>{" "}
          {distribution.streamingRoyalties ? "Enabled" : "Disabled"}
        </p>

        <p>
          <strong>Download Sales:</strong>{" "}
          {distribution.downloadSales ? "Enabled" : "Disabled"}
        </p>

        <p>
          <strong>Enabled Monetization:</strong>{" "}
          {distribution.youtubeMonetization
            ? "Confirmed"
            : "Not enabled"}
        </p>

        <p>
          <strong>Scheduled Release:</strong>{" "}
          {distribution.scheduledRelease || "Immediate"}
        </p>
      </div>

      {/* COPYRIGHT */}

      <div className="upload-section">
        <h2>
          <Copyright size={22} />
          Copyright & Ownership
        </h2>

        <p>
          <strong>Copyright Owner:</strong>{" "}
          {copyright.copyrightOwner || "Not provided"}
        </p>

        <p>
          <strong>Master Owner:</strong>{" "}
          {copyright.masterOwner || "Not provided"}
        </p>

        <p>
          <strong>Copyright Year:</strong>{" "}
          {copyright.copyrightYear || "Not provided"}
        </p>

        <p>
          <strong>Publishing Rights:</strong>{" "}
          {copyright.publishingRights || "Not provided"}
        </p>

        <p>
          <strong>License:</strong>{" "}
          {copyright.license || "Not provided"}
        </p>
      </div>

      {/* ROYALTY SPLITS */}

      <div className="upload-section">
        <h2>
          <DollarSign size={22} />
          Royalty Splits
        </h2>

        <p>
          <strong>Apply to all tracks:</strong>{" "}
          {royaltyData.apply_to_all ? "Yes" : "No"}
        </p>

        {royaltyData.apply_to_all ? (
          <>
            {royaltySplits.length > 0 ? (
              <>
                {royaltySplits.map((split, index) => (
                  <div
                    className="release-card"
                    key={
                      split.user_id ||
                      split.participant_name ||
                      index
                    }
                  >
                    <User size={24} />

                    <div>
                      <h3>
                        {split.participant_name ||
                          "Unknown Participant"}
                      </h3>

                      <p>
                        <strong>Role:</strong>{" "}
                        {split.role || "Other"}
                      </p>

                      <p>
                        <strong>Percentage:</strong>{" "}
                        {Number(split.percentage || 0)}%
                      </p>
                    </div>
                  </div>
                ))}

                <p>
                  <strong>Total Royalty Allocation:</strong>{" "}
                  {royaltyTotal}%

                  {isValidRoyaltyTotal(royaltyTotal)
                    ? " — Valid"
                    : " — Must equal 100%"}
                </p>
              </>
            ) : (
              <div>
                <p>No custom royalty split was provided.</p>

                <p>
                  <strong>Default Owner:</strong>{" "}
                  {artistName || "Song Owner"}
                </p>

                <p>
                  <strong>Role:</strong> Master Owner
                </p>

                <p>
                  <strong>Percentage:</strong> 100%
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {tracks.map((track, index) => {
              const savedTrack =
                individualRoyaltyTracks.find(
                  entry =>
                    Number(entry.track_index) === index
                );

              const splits = Array.isArray(savedTrack?.splits)
                ? savedTrack.splits
                : [];

              const total = splits.reduce(
                (sum, split) =>
                  sum + Number(split.percentage || 0),
                0
              );

              return (
                <div
                  className="release-card"
                  key={track.id || index}
                  style={{
                    display: "block",
                    marginBottom: "15px"
                  }}
                >
                  <h3>
                    Track {index + 1}:{" "}
                    {track.name ||
                      track.title ||
                      `Track ${index + 1}`}
                  </h3>

                  {splits.map((split, splitIndex) => (
                    <div key={split.user_id || splitIndex}>
                      <p>
                        <strong>
                          {split.participant_name || "Unknown Participant"}
                        </strong>
                      </p>

                      <p>
                        Role: {split.role || "Other"}
                      </p>

                      <p>
                        Percentage: {Number(split.percentage || 0)}%
                      </p>
                    </div>
                  ))}

                  <p>
                    <strong>Total:</strong> {total}%
                    {isValidRoyaltyTotal(total)
                      ? " — Valid"
                      : " — Must equal 100%"}
                  </p>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* FINAL CONFIRMATION */}

      <div className="upload-section">
        <h2>
          <ShieldCheck size={22} />
          Final Submission
        </h2>

        <p>
          Please review all information above carefully.
          Once submitted, this release will be sent for processing.
        </p>

        <p>
          Your audio files, artwork, metadata, copyright
          information, distribution settings and royalty splits
          will be submitted together.
        </p>

        <p>
          Each track's featured artists will be submitted
          separately with its corresponding audio file.
        </p>
      </div>

      {/* SUBMIT */}

      <button
        type="button"
        className="next-button"
        onClick={submitRelease}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader size={22} className="spin" />
            Uploading...
          </>
        ) : (
          <>
            <Send size={22} />
            Submit Release
          </>
        )}
      </button>

      {/* MESSAGE */}

      {message && (
        <div className="upload-section">
          <h2>{message}</h2>
        </div>
      )}


{/* FULL SCREEN UPLOAD PROGRESS */}

{loading && (
  <div className="upload-progress-overlay">

    <div className="upload-progress-card">

      <div className="upload-progress-icon">
        {uploadStage === "processing" ? (
          <Music size={38} />
        ) : (
          <Loader size={38} className="spin" />
        )}
      </div>

      <h2>
        {uploadStage === "processing"
          ? "Processing Your Release"
          : "Uploading Your Release"}
      </h2>

      <p className="upload-progress-description">
        {uploadStage === "processing"
          ? "Your files have been transferred. We're now converting your audio, embedding artwork and saving your release."
          : "Please wait while your music and artwork are being uploaded."}
      </p>

      {/* PROGRESS BAR */}

      <div className="upload-progress-track">

        <div
          className="upload-progress-fill"
          style={{
            width: `${uploadProgress}%`
          }}
        />

      </div>

      <div className="upload-progress-details">

        <span>
          {uploadStage === "processing"
            ? "Upload complete"
            : "Uploading files"}
        </span>

        <strong>
          {uploadProgress}%
        </strong>

      </div>

      <div className="upload-progress-footer">
        <ShieldCheck size={17} />
        Please keep this page open until the process finishes.
      </div>

    </div>

  </div>
)}

    </div>
  );
}

export default UploadReview;
