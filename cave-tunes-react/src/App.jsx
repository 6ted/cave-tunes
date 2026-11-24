import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import {
  useState,
} from "react";

import "./App.css";


/* ======================================================
   CONTEXT
====================================================== */

import {
  NotificationProvider,
} from "./context/NotificationContext";

import {
    ScizzorProvider,
} from "./context/ScizzorContext";


import {
    YouTubePlayerProvider,
} from "./context/YouTubePlayerContext";

import GlobalYouTubePlayer from "./components/GlobalYouTubePlayer";
/* ======================================================
   LAYOUT COMPONENTS
====================================================== */

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import PlayerBar from "./components/PlayerBar";
import FullPlayer from "./components/FullPlayer";
import ProtectedRoute from "./components/ProtectedRoute";
import PremiumRoute from "./components/PremiumRoute";
import VerificationRequest
  from "./components/admin/VerificationRequest";

import SubmitRequest
  from "./components/admin/SubmitRequest";

import VerificationComplete from "./pages/VerificationComplete";

import VerifyOTP from "./pages/VerifyOTP";
/* ======================================================
   PUBLIC PAGES
====================================================== */

import Home from "./pages/Home";
import Tunes from "./pages/Tunes";
import Artists from "./pages/Artists";
import YouTube from "./pages/YouTube";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import EP from "./pages/EP";
import Feed from "./pages/Feed";
import Radio from "./pages/Radio";
import Premium from "./pages/PremiumPage.jsx";
import Charts from "./pages/Charts";
import FreeVerification from "./pages/FreeVerification";
/* ======================================================
   USER PAGES
====================================================== */

import Library from "./pages/Library";
import Profile from "./pages/Profile";
import CreatorProfile from "./pages/CreatorProfile";


/* ======================================================
   CREATOR
====================================================== */

import UploadStudio from "./pages/UploadStudio";

import Monetization
  from "./pages/Monetization";

import MonetizationApplication
  from "./pages/MonetizationApplication";

import Wallet from "./pages/Wallet";
import Analytics from "./pages/Analytics";

import Producers from "./pages/Producers";
import DJs from "./pages/DJs";
import RecordLabels from "./pages/RecordLabels";

import Settings from "./pages/Settings";
import Subscription from "./pages/Subscription";
import EditProfile from "./pages/EditProfile";
import ManageCatalogue from "./pages/ManageCatalogue";
import RoyaltyManagement from "./pages/RoyaltyManagement";
import ScizzorCapture from "./pages/ScizzorCapture";
import GlobalScizzor from "./components/GlobalScizzor";

/* ======================================================
   RELEASE FLOW
====================================================== */

import ReleaseInfo from "./pages/ReleaseInfo";
import TrackUpload from "./pages/TrackUpload";
import ArtworkUpload from "./pages/ArtworkUpload";
import Metadata from "./pages/Metadata";
import Distribution from "./pages/Distribution";
import Copyright from "./pages/Copyright";
import UploadReview from "./pages/UploadReview";
import Notifications from "./pages/Notifications";
import ReleaseManager from "./pages/ReleaseManager";
import RoyaltySplits from "./pages/RoyaltySplits.jsx";

/* ======================================================
   ALBUM
====================================================== */

import Album from "./pages/Album";
import Albums from "./pages/Albums";


/* ======================================================
   ADMIN
====================================================== */

import AdminDashboard from "./pages/AdminDashboard";
import AdminRequests from "./pages/AdminRequests";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminAds from "./pages/AdminAds";
import AdminNotifications from "./pages/AdminNotifications";
import MonetizationSetup
  from "./pages/MonetizationSetup";

import MonetizationReview
  from "./pages/MonetizationReview";

import MonetizationSuccess
  from "./pages/MonetizationSuccess";

import MonetizationStatus
  from "./pages/MonetizationStatus";


/* ======================================================
   APP
====================================================== */

function App() {

  const [
    sidebarOpen,
    setSidebarOpen
  ] = useState(false);


  return (

    <BrowserRouter>

      {/* ==================================================
          NOTIFICATION PROVIDER
          
          This wraps the entire Cave Tunes application.

          Navbar
          Sidebar
          Notifications
          and other pages

          can therefore share notification state.
      ================================================== */}

      <NotificationProvider>
         <ScizzorProvider>
            <YouTubePlayerProvider>
        <div className="app">


          {/* =================================================
              SIDEBAR
          ================================================= */}

          <Sidebar
            open={sidebarOpen}
            setOpen={setSidebarOpen}
          />


          {/* =================================================
              MAIN AREA
          ================================================= */}

          <div className="main-area">


            <Navbar
              setSidebarOpen={setSidebarOpen}
            />


            <main className="page-container">

              <Routes>


                {/* =================================================
                    PUBLIC
                ================================================= */}

                <Route
                  path="/"
                  element={<Home />}
                />

                <Route
                  path="/tunes"
                  element={<Tunes />}
                />

                <Route
                  path="/youtube"
                  element={<YouTube />}
                />

                <Route
                  path="/artists"
                  element={<Artists />}
                />

<Route
  path="/charts"
  element={<Charts />}
/>

    <Route
  path="/login"
  element={<Login />}
/>

<Route
  path="/premium"
  element={<Premium />}
/>

<Route
  path="/premium-page"
  element={<Premium />}
/>

<Route
  path="/signup"
  element={<SignUp />}
/>

                <Route
  path="/verify-otp"
  element={<VerifyOTP />}
/>

                <Route
                  path="/album/:albumName/:artistName"
                  element={<Album />}
                />

                <Route
                  path="/albums"
                  element={<Albums />}
                />

                <Route
                  path="/ep/:title/:artist"
                  element={<EP />}
                />
<Route
  path="/radio"
  element={<Radio />}
/>


<Route
    path="/free-verification"
    element={<FreeVerification />}
/>
                {/* =================================================
                    ADMIN
                ================================================= */}

                <Route
                  element={
                    <ProtectedRoute adminOnly />
                  }
                >

                  <Route
                    path="/admin-dashboard"
                    element={<AdminDashboard />}
                  />

                  <Route
  path="/admin-analytics"
  element={<AdminAnalytics />}
/>

<Route
  path="/admin-notifications"
  element={<AdminNotifications />}
/>

                  <Route
                    path="/admin-requests"
                    element={<AdminRequests />}
                  />


<Route
  path="/admin-ads"
  element={<AdminAds />}
/>
                </Route>


                {/* =================================================
                    AUTHENTICATED USER AREA
                ================================================= */}

                <Route
                  element={
                    <ProtectedRoute />
                  }
                >


                  {/* USER */}

                  <Route
                    path="/library"
                    element={<Library />}
                  />

<Route
  path="/feed"
  element={<Feed />}
/>



                  <Route
                    path="/profile"
                    element={<Profile />}
                  />

                  <Route
                    path="/settings"
                    element={<Settings />}
                  />

                <Route
                  path="/subscription"
                  element={<Subscription />}
                />

{/* =================================================
    PREMIUM PROTECTED SCIZZOR
================================================= */}

<Route element={<PremiumRoute />}>

    <Route
        path="/scizzor"
        element={<ScizzorCapture />}
    />

</Route>

                  {/* =================================================
                      NOTIFICATIONS
                  ================================================= */}

                  <Route
                    path="/notifications"
                    element={<Notifications />}
                  />


                  <Route
                    path="/edit-profile"
                    element={<EditProfile />}
                  />


                  <Route
                    path="/manage-catalogue/:type/:albumName/:artistName"
                    element={<ManageCatalogue />}
                  />


                  {/* =================================================
                      CREATOR PROFILE
                  ================================================= */}

                  <Route
                    path="/creator/:role/:id"
                    element={<CreatorProfile />}
                  />


                  {/* =================================================
                      CREATOR
                  ================================================= */}

                  <Route
                    path="/upload-studio"
                    element={<UploadStudio />}
                  />

                  <Route
                    path="/verification-request"
                    element={<VerificationRequest />}
                  />

                  <Route
    path="/verification-complete"
    element={<VerificationComplete />}
/>

                  <Route
                    path="/monetization"
                    element={<Monetization />}
                  />

                  <Route
                    path="/monetization/application"
                    element={
                      <MonetizationApplication />
                    }
                  />

                  <Route
                    path="/monetization/setup"
                    element={<MonetizationSetup />}
                  />

                  <Route
                    path="/monetization/success"
                    element={
                      <MonetizationSuccess />
                    }
                  />

                  <Route
                    path="/monetization/status"
                    element={<MonetizationStatus />}
                  />

                  <Route
                    path="/monetization/review"
                    element={
                      <MonetizationReview />
                    }
                  />

                  <Route
                    path="/submit-request"
                    element={<SubmitRequest />}
                  />

                  <Route
                    path="/wallet"
                    element={<Wallet />}
                  />

                <Route
                    path="/royalty-management"
                    element={<RoyaltyManagement />}
                />

                  <Route
                    path="/analytics"
                    element={<Analytics />}
                  />

                  <Route
                    path="/producers"
                    element={<Producers />}
                  />

                  <Route
                    path="/djs"
                    element={<DJs />}
                  />

                  <Route
                    path="/record-labels"
                    element={<RecordLabels />}
                  />


                  {/* =================================================
                      RELEASE FLOW
                  ================================================= */}

                  <Route
                    path="/release-info"
                    element={<ReleaseInfo />}
                  />

                  <Route
                    path="/track-upload"
                    element={<TrackUpload />}
                  />

                  <Route
                    path="/artwork-upload"
                    element={<ArtworkUpload />}
                  />

                  <Route
                    path="/metadata"
                    element={<Metadata />}
                  />

                  <Route
                    path="/distribution"
                    element={<Distribution />}
                  />

                  <Route
                    path="/copyright"
                    element={<Copyright />}
                  />

                <Route
                  path="/royalty-splits"
                  element={<RoyaltySplits />}
                />


                  <Route
                    path="/upload-review"
                    element={<UploadReview />}
                  />

                 <Route
                  path="/release-manager/:songId"
                  element={<ReleaseManager />}
                />
                </Route>


                {/* =================================================
                    ALTERNATIVE UPLOAD ROUTES
                ================================================= */}

                <Route
                  path="/upload"
                  element={
                    <ProtectedRoute>
                      <UploadStudio />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/upload/release-info"
                  element={
                    <ProtectedRoute>
                      <ReleaseInfo />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/upload/track-upload"
                  element={
                    <ProtectedRoute>
                      <TrackUpload />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/upload/artwork-upload"
                  element={
                    <ProtectedRoute>
                      <ArtworkUpload />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/upload/metadata"
                  element={
                    <ProtectedRoute>
                      <Metadata />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/upload/distribution"
                  element={
                    <ProtectedRoute>
                      <Distribution />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/upload/copyright"
                  element={
                    <ProtectedRoute>
                      <Copyright />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/upload/upload-review"
                  element={
                    <ProtectedRoute>
                      <UploadReview />
                    </ProtectedRoute>
                  }
                />


              </Routes>

            </main>

          </div>


          {/* =================================================
              PLAYER
          ================================================= */}

          <PlayerBar />

          <FullPlayer />

          {/* GLOBAL YOUTUBE PLAYER */}
<GlobalYouTubePlayer />

{/* GLOBAL SCIZZOR WIDGET */}
<GlobalScizzor />

        </div>
          </YouTubePlayerProvider>
</ScizzorProvider>
      </NotificationProvider>

    </BrowserRouter>

  );

}


export default App;