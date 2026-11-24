import { useState } from "react";
import { UploadContext } from "./UploadContext.js";

function createInitialReleaseData() {
  return {
    // ======================================================
    // RELEASE
    // ======================================================

    release_type: "single",

    artist_name: "",
    country: "",
    genre: "",
    language: "",

    title: "",
    album_name: "",
    ep_name: "",

    release_date: "",

    // ======================================================
    // TRACKS
    // ======================================================

    tracks: [],

    // ======================================================
    // ARTWORK
    // ======================================================

    cover: null,

    // ======================================================
    // METADATA / CREDITS
    // ======================================================

    metadata: {
      isrc: "",
      upc: "",
      record_label: "",

      producer: "",
      composer: "",
      songwriter: "",

      mixing_engineer: "",
      mastering_engineer: "",

      featured_artists: [],

      lyrics: "",
      lyric_file: null,

      canvas_video: null
    },

    // ======================================================
    // DISTRIBUTION
    // ======================================================

    distribution: {
      platforms: ["Cave Tunes"],
      territories: "Worldwide",

      monetization_enabled: false,
      monetized_enabled_at: "",

      streaming_royalties: false,
      download_sales: false,
      youtube_monetization: false,

      scheduled_release: ""
    },

    // ======================================================
    // COPYRIGHT
    // ======================================================

    copyright: {}
  };
}


function UploadProvider({ children }) {

  const [releaseData, setReleaseData] = useState(
    createInitialReleaseData()
  );


  const updateReleaseData = (data) => {

    setReleaseData(prev => ({

      ...prev,

      ...data,

      // Deep merge metadata
      metadata: data.metadata
        ? {
            ...prev.metadata,
            ...data.metadata
          }
        : prev.metadata,

      // Deep merge distribution
      distribution: data.distribution
        ? {
            ...prev.distribution,
            ...data.distribution
          }
        : prev.distribution

    }));

  };


  const clearRelease = () => {

    setReleaseData(
      createInitialReleaseData()
    );

  };


  return (

    <UploadContext.Provider
      value={{
        releaseData,
        updateReleaseData,
        clearRelease
      }}
    >

      {children}

    </UploadContext.Provider>

  );

}


export default UploadProvider;