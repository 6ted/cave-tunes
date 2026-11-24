import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

import PlayerProvider from "./context/PlayerContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import UploadProvider from "./context/UploadProvider.jsx";


ReactDOM.createRoot(
  document.getElementById("root")
).render(

  <React.StrictMode>

    <AuthProvider>

      <PlayerProvider>

        <UploadProvider>

          <App />

        </UploadProvider>

      </PlayerProvider>

    </AuthProvider>

  </React.StrictMode>

);