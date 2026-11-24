
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  Image,
  Upload,
  CheckCircle,
} from "lucide-react";

import { useUpload } from "../context/useUpload.jsx";

import "../styles/UploadStudio.css";

function ArtworkUpload() {
  const navigate = useNavigate();

  const {
    releaseData,
    updateReleaseData
  } = useUpload();

  const [cover, setCover] = useState(
    releaseData.cover || null
  );

  // Create artwork preview URL
  const preview = useMemo(() => {
    if (!cover) return null;

    return URL.createObjectURL(cover);
  }, [cover]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Handle cover selection
  function handleCover(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    setCover(file);
  }

  // Continue to metadata
  function continueNext() {
    if (!cover) {
      alert("Please upload cover artwork first");
      return;
    }

    updateReleaseData({
      // Preserve all existing release information
      ...releaseData,

      // Save artwork
      cover,

      // Preserve every track and its individual featured artists
      tracks: (releaseData.tracks || []).map(track => ({
        ...track,

        featured_artists: Array.isArray(track.featured_artists)
          ? [...track.featured_artists]
          : typeof track.featured_artists === "string"
            ? track.featured_artists
                .split(",")
                .map(name => name.trim())
                .filter(Boolean)
            : []
      }))
    });

    navigate("/metadata");
  }

  return (
    <div className="upload-studio">

      <div className="upload-title">
        <Image size={42} />

        <div>
          <h1>Cover Artwork</h1>
          <p>Upload your release artwork</p>
        </div>
      </div>

      {/* ARTWORK UPLOAD */}
      <div className="upload-section">
        <h2>Artwork Upload</h2>

        <label className="file-box">
          <Upload size={35} />

          <span>
            {cover ? cover.name : "Choose Cover Image"}
          </span>

          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              handleCover(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {/* ARTWORK PREVIEW */}
      {preview && (
        <div className="upload-section">
          <h2>Preview</h2>

          <img
            src={preview}
            alt="Cover Preview"
            className="cover-preview"
          />
        </div>
      )}

      {/* CONTINUE */}
      <button
        className="next-button"
        onClick={continueNext}
      >
        <CheckCircle size={22} />
        Continue To Metadata →
      </button>

    </div>
  );
}

export default ArtworkUpload;
