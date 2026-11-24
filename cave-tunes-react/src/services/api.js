// ======================================================
// CAVE TUNES API SERVICE
// src/services/api.js
// ======================================================


// ======================================================
// API BASE URL
// ======================================================

// ======================================================
// API BASE URL
// ======================================================

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:5000"
      : "https://cave-tunes-api.onrender.com"
  )
).replace(/\/$/, "");

console.log(
  "🎵 Cave Tunes API:",
  API_BASE_URL
);

// ======================================================
// GENERIC API REQUEST
// ======================================================

async function request(endpoint, options = {}) {
  // auth:false prevents OTP and other public requests
  // from sending an existing JWT.
  const {
    auth = true,
    ...fetchOptions
  } = options;

  const token = localStorage.getItem("token");

  const headers = {
    ...(fetchOptions.headers || {}),
  };

  // ====================================================
  // JSON CONTENT TYPE
  // ====================================================

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers["Content-Type"] =
      "application/json";
  }


  // ====================================================
  // AUTHORIZATION
  // ====================================================
if (auth && token) {
  headers.Authorization =
    `Bearer ${token}`;
}


  // ====================================================
  // SEND REQUEST
  // ====================================================

  let response;

  try {
  response = await fetch(
  `${API_BASE_URL}${endpoint}`,
  {
    ...fetchOptions,
    headers,
  }
);
  } catch (error) {
    throw new Error(
      "Unable to connect to the Cave Tunes server.",
      {
        cause: error,
      }
    );
  }


  // ====================================================
  // READ RESPONSE
  // ====================================================

  let data = {};

  try {
    data = await response.json();
  } catch {
    // Server returned no JSON.
  }


  // ====================================================
  // UNAUTHORIZED
  // ====================================================

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("caveTunesUser");
  }


  // ====================================================
  // FORBIDDEN
  // ====================================================

  if (response.status === 403) {
    throw new Error(
      data?.message ||
        "You do not have permission to perform this action."
    );
  }


  // ====================================================
  // OTHER HTTP ERRORS
  // ====================================================

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );
  }


  // ====================================================
  // SUCCESS
  // ====================================================

  return data;
}


// ======================================================
// AUTHENTICATION
// ======================================================


// ======================================================
// REGISTER
// POST /api/auth/register
// Requires OTP verification before authentication.
// ======================================================

export async function registerUser({
  username,
  email,
  password,
  role = "listener",
}) {
  return request(
    "/api/auth/register",
    {
      method: "POST",
      auth: false,

      body: JSON.stringify({
        username,
        email,
        password,
        role,
      }),
    }
  );
}


// ======================================================
// LOGIN
// POST /api/auth/login
// Requires OTP verification before authentication.
// ======================================================

export async function loginUser(email, password) {
  return request(
    "/api/auth/login",
    {
      method: "POST",
      auth: false,

      body: JSON.stringify({
        email,
        password,
      }),
    }
  );
}


// ======================================================
// VERIFY EMAIL OTP
// POST /api/auth/verify-otp
// ======================================================

export async function verifyEmailOtp(
  challengeToken,
  code
) {
  return request(
    "/api/auth/verify-otp",
    {
      method: "POST",
      auth: false,

      body: JSON.stringify({
        challengeToken,
        code,
      }),
    }
  );
}


// ======================================================
// RESEND EMAIL OTP
// POST /api/auth/resend-otp
// ======================================================

export async function resendEmailOtp(
  challengeToken
) {
  return request(
    "/api/auth/resend-otp",
    {
      method: "POST",
      auth: false,

      body: JSON.stringify({
        challengeToken,
      }),
    }
  );
}


// ======================================================
// GOOGLE LOGIN URL
// ======================================================

export function getGoogleAuthUrl() {
  return `${API_BASE_URL}/api/auth/google`;
}


// ======================================================
// CURRENT USER
// ======================================================

export async function getCurrentUser() {
  return request(
    "/api/auth/me"
  );
}

// ======================================================
// PREMIUM SUBSCRIPTION STATUS
// GET /api/subscription/status
// ======================================================

export async function getSubscriptionStatus() {
  return request(
    "/api/subscription/status"
  );
}

// ======================================================
// GET MONETIZATION REQUEST STATUS
// ======================================================

export async function getMonetizationRequest() {
    return request("/api/creator/monetization-request");
}


// ======================================================
// GET VERIFICATION REQUEST STATUS
// ======================================================
export async function getVerificationRequest() {

    return request(
        "/api/creator/verification-request"
    );

}

// ======================================================
// UPDATE PROFILE
// ======================================================

export async function updateProfile(
  formData
) {
  return request(
    "/api/auth/update-profile",
    {
      method: "POST",
      body: formData,
    }
  );
}


// ======================================================
// PUBLIC MUSIC
// ======================================================


// ======================================================
// GET ALL PUBLIC SONGS
// ======================================================

export async function getSongs() {
  return request(
    "/api/music"
  );
}


// ======================================================
// GET SINGLE SONG
// ======================================================

export async function getSong(id) {
  return request(
    `/api/music/${id}`
  );
}


// ======================================================
// GET MY UPLOADED SONGS
// ======================================================

export async function getMySongs() {
  return request(
    "/api/music/my-uploads"
  );
}


// ======================================================
// ARTIST ANALYTICS
// GET /api/music/analytics/me?period=30d
// ======================================================

export async function getArtistAnalytics(period = "30d") {
  return request(
    `/api/music/analytics/me?period=${encodeURIComponent(period)}`
  );
}


// ======================================================
// RECORD PLAY
// ======================================================

export async function recordPlay(id) {
  return request(
    `/api/music/${id}/play`,
    {
      method: "POST",
    }
  );
}




// ======================================================
// DOWNLOAD SONG FILE
//
// POST /api/music/:id/download
//
// Requires:
// - Logged-in user
// - Active subscription
//
// Returns the actual MP3 file.
// ======================================================

export async function downloadSongFile(id) {

  if (!id) {
    throw new Error("Song ID is required.");
  }

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken");

  if (!token) {
    throw new Error("Please log in to download music.");
  }

  let response;

  try {

    response = await fetch(
      `${API_BASE_URL}/api/music/${encodeURIComponent(id)}/download`,
      {
        method: "POST",

        credentials: "include",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

  } catch (error) {

    throw new Error(
      "Unable to connect to the Cave Tunes server.",
      {
        cause: error,
      }
    );

  }

  // --------------------------------------------------
  // HANDLE SERVER ERRORS
  // --------------------------------------------------

  if (!response.ok) {

    let data = {};

    try {
      data = await response.json();
    } catch {
      // Response was not JSON.
    }

    if (response.status === 401) {

      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("caveTunesUser");

      throw new Error(
        data.message || "Your session has expired. Please log in again."
      );

    }

    if (response.status === 403) {

      throw new Error(
        data.message ||
        "An active Cave Tunes subscription is required to download music."
      );

    }

    throw new Error(
      data.message ||
      data.error ||
      `Download failed. Server returned ${response.status}.`
    );

  }

  // --------------------------------------------------
  // RECEIVE MP3 FILE
  // --------------------------------------------------

  const blob = await response.blob();

  if (!blob || blob.size === 0) {
    throw new Error("The downloaded audio file is empty.");
  }

  return {
    blob,

    filename:
      getFilenameFromResponse(response) ||
      `cave-tunes-song-${id}.mp3`,

    downloadsCount:
      response.headers.get("X-Downloads-Count"),

    downloadCounted:
      response.headers.get("X-Download-Counted") === "true",
  };

}


// ======================================================
// EXTRACT DOWNLOAD FILENAME
// ======================================================

function getFilenameFromResponse(response) {

  const disposition =
    response.headers.get("Content-Disposition");

  if (!disposition) return null;

  const match =
    disposition.match(/filename="?([^"]+)"?/i);

  return match ? match[1] : null;

}


// ======================================================
// BACKWARD-COMPATIBLE DOWNLOAD FUNCTION
// ======================================================

export async function recordDownload(id) {

  return downloadSongFile(id);

}


// ======================================================
// ADMIN API
// ======================================================
//
// These functions match:
//
// /api/admin
//
// and your adminRoutes.js
//
// All admin routes are protected by:
//
// authMiddleware
// adminMiddleware
//
// ======================================================


// ======================================================
// ADMIN DASHBOARD
// GET /api/admin/dashboard
// ======================================================

export async function getAdminDashboard() {
  return request(
    "/api/admin/dashboard"
  );
}

// ======================================================
// GET ADMIN USER ANALYTICS
// GET /api/admin/analytics?period=month
// ======================================================

export async function getAdminAnalytics(
  period = "month"
) {
  return request(
    `/api/admin/analytics?period=${encodeURIComponent(period)}`
  );
}

// ======================================================
// GET ALL USERS
// GET /api/admin/users
// ======================================================

export async function getAdminUsers() {
  return request(
    "/api/admin/users"
  );
}


// ======================================================
// GET SINGLE USER
// GET /api/admin/users/:id
// ======================================================

export async function getAdminUser(id) {
  return request(
    `/api/admin/users/${id}`
  );
}


// ======================================================
// UPDATE ADMIN STATUS
// PUT /api/admin/users/:id/admin
// ======================================================

export async function updateAdminStatus(
  id,
  isAdmin
) {
  return request(
    `/api/admin/users/${id}/admin`,
    {
      method: "PUT",

      body: JSON.stringify({
        is_admin: isAdmin,
      }),
    }
  );
}


// ======================================================
// UPDATE USER ROLE
// PUT /api/admin/users/:id/role
// ======================================================

export async function updateAdminUserRole(
  id,
  role
) {
  return request(
    `/api/admin/users/${id}/role`,
    {
      method: "PUT",

      body: JSON.stringify({
        role,
      }),
    }
  );
}


// ======================================================
// DELETE USER
// DELETE /api/admin/users/:id
// ======================================================

export async function deleteAdminUser(
  id
) {
  return request(
    `/api/admin/users/${id}`,
    {
      method: "DELETE",
    }
  );
}


// ======================================================
// GET ALL ADMIN SONGS
// GET /api/admin/songs
// ======================================================

export async function getAdminSongs() {
  return request(
    "/api/admin/songs"
  );
}


// ======================================================
// GET TOP SONGS
// GET /api/admin/songs/top
// ======================================================

export async function getAdminTopSongs() {
  return request(
    "/api/admin/songs/top"
  );
}


// ======================================================
// DELETE SONG
// DELETE /api/admin/songs/:id
// ======================================================

export async function deleteAdminSong(
  id
) {
  return request(
    `/api/admin/songs/${id}`,
    {
      method: "DELETE",
    }
  );
}


// ======================================================
// ADMIN NOTIFICATIONS API
// ======================================================

// ======================================================
// SEND ADMIN NOTIFICATION
// POST /api/admin/notifications/send
//
// audience: "all" | "user"
// delivery: "in_app" | "email"
//
// email means in-app notification + email.
// ======================================================

export async function sendAdminNotification({
  audience,
  userId = null,
  title,
  message,
  actionUrl = null,
  delivery = "in_app",
}) {
  return request(
    "/api/admin/notifications/send",
    {
      method: "POST",

      body: JSON.stringify({
        audience,
        userId,
        title,
        message,
        actionUrl,
        delivery,
      }),
    }
  );
}


// ======================================================
// GET ADMIN NOTIFICATION HISTORY
// GET /api/admin/notifications/history
// ======================================================

export async function getAdminNotificationHistory() {
  return request(
    "/api/admin/notifications/history"
  );
}


// ======================================================
// GET ADMIN NOTIFICATION STATISTICS
// GET /api/admin/notifications/stats
// ======================================================

export async function getAdminNotificationStats() {
  return request(
    "/api/admin/notifications/stats"
  );
}


// ======================================================
// CREATOR PROFILE API
// ======================================================


// ======================================================
// GET CREATOR PROFILE
// GET /api/auth/creators/:id
// ======================================================

export async function getCreator(id) {

  return request(
    `/api/auth/creators/${id}`
  );

}



// ======================================================
// FOLLOW / TOGGLE FOLLOW CREATOR
// POST /api/auth/creators/:id/follow
// ======================================================

export async function followCreator(id) {
  const response = await request(
    `/api/auth/creators/${id}/follow`,
    {
      method: "POST",
    }
  );

  return {
    ...response,

    following: Boolean(
      response.following ??
      response.isFollowing ??
      response.is_following ??
      false
    ),

    followers: Number(
      response.followers_count ??
      response.followers ??
      response.follower_count ??
      0
    ),

    followers_count: Number(
      response.followers_count ??
      response.followers ??
      response.follower_count ??
      0
    ),
  };
}
// ======================================================
// UNFOLLOW CREATOR
// DELETE /api/auth/creators/:id/follow
// ======================================================

export async function unfollowCreator(id) {

  return request(
    `/api/auth/creators/${id}/follow`,
    {
      method: "DELETE",
    }
  );

}


// ======================================================
// VERIFICATION REQUESTS
// ======================================================


// GET /api/admin/verification

export async function getVerificationRequests(){

  return request(
    "/api/admin/verification"
  );

}



// PATCH /api/admin/verification/:id

export async function updateVerificationRequest(
  id,
  status
){

  return request(
    `/api/admin/verification/${id}`,
    {
      method:"PATCH",

      body:JSON.stringify({
        status,
      }),
    }
  );

}



// ======================================================
// MONETIZATION REQUESTS
// ======================================================


// GET /api/admin/monetization

export async function getMonetizationRequests(){

  return request(
    "/api/admin/monetization"
  );

}



// PATCH /api/admin/monetization/:id

export async function updateMonetizationRequest(
  id,
  status
){

  return request(
    `/api/admin/monetization/${id}`,
    {
      method:"PATCH",

      body:JSON.stringify({
        status,
      }),
    }
  );

}



// ======================================================
// WITHDRAW REQUESTS
// ======================================================


// GET /api/admin/withdraws

export async function getWithdrawRequests(){

  return request(
    "/api/admin/withdraws"
  );

}



// PATCH /api/admin/withdraws/:id

// ======================================================
// PATCH /api/admin/withdraws/:id
// ======================================================

export async function updateWithdrawRequest(
  id,
  status,
  reason = null
) {

  return request(
    `/api/admin/withdraws/${encodeURIComponent(id)}`,
    {
      method: "PATCH",

      body: JSON.stringify({
        status,
        reason:
          typeof reason === "string"
            ? reason.trim()
            : null,
      }),
    }
  );

}

// ======================================================
// SUBMIT CREATOR VERIFICATION REQUEST
// POST /api/creator/verification-request
// ======================================================

// ======================================================
// CREATOR VERIFICATION PAYMENT
// ======================================================

// CREATE PAYCHANGU CHECKOUT
// POST /api/creator/verification/payment

export async function createVerificationPayment() {
    return request(
        "/api/creator/verification/payment",
        {
            method: "POST",
        }
    );
}


// VERIFY PAYMENT STATUS
// GET /api/creator/verification/payment/status

export async function getVerificationPaymentStatus(txRef) {
    return request(
        `/api/creator/verification/payment/status?tx_ref=${encodeURIComponent(
            txRef
        )}`
    );
}


// ======================================================
// SUBMIT CREATOR VERIFICATION REQUEST
// POST /api/creator/verification-request
// ======================================================

export async function submitVerificationRequest(formData) {
    return request(
        "/api/creator/verification-request",
        {
            method: "POST",
            body: formData,
        }
    );
}
// ======================================================
// CREATE VERIFICATION REQUEST
// POST /api/creator-request/verification-request
// ======================================================

export async function createVerificationRequest(
  reason
){

  return request(
    "/api/creator-request/verification-request",
    {
      method:"POST",

      body:JSON.stringify({
        reason,
      }),
    }
  );

}

// ======================================================
// NOTIFICATIONS
// ======================================================


// ======================================================
// GET NOTIFICATIONS
// GET /api/notifications
// ======================================================

export async function getNotifications({
    limit = 100,
    offset = 0,
} = {}) {

    return request(
        `/api/notifications?limit=${encodeURIComponent(
            limit
        )}&offset=${encodeURIComponent(
            offset
        )}`
    );

}


// ======================================================
// MARK ONE NOTIFICATION READ
// PATCH /api/notifications/:id/read
// ======================================================

export async function markNotificationRead(
    notificationId
) {

    return request(
        `/api/notifications/${encodeURIComponent(
            notificationId
        )}/read`,
        {
            method: "PATCH",
        }
    );

}


// ======================================================
// MARK ALL NOTIFICATIONS READ
// PATCH /api/notifications/read-all
// ======================================================

export async function markAllNotificationsRead() {

    return request(
        "/api/notifications/read-all",
        {
            method: "PATCH",
        }
    );

}


// ======================================================
// GET UNREAD NOTIFICATION COUNT
// GET /api/notifications/unread-count
// ======================================================

export async function getUnreadNotificationCount() {

    return request(
        "/api/notifications/unread-count"
    );

}

// ======================================================
// SONG LIKES
// ======================================================

export async function getSongLikeStatus(songId) {

    const token =
        localStorage.getItem("token");


    if (!token) {

        throw new Error(
            "AUTH_REQUIRED"
        );

    }


    const response = await fetch(
        `${API_BASE_URL}/api/music/${songId}/like`,
        {
            method: "GET",

            headers: {
                Authorization:
                    `Bearer ${token}`,
            },
        }
    );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.message ||
            "Unable to get like status."
        );

    }


    return data;

}


export async function likeSong(songId) {

    const token =
        localStorage.getItem("token");


    if (!token) {

        throw new Error(
            "AUTH_REQUIRED"
        );

    }


    const response = await fetch(
        `${API_BASE_URL}/api/music/${songId}/like`,
        {
            method: "POST",

            headers: {
                Authorization:
                    `Bearer ${token}`,
            },
        }
    );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.message ||
            "Unable to like song."
        );

    }


    return data;

}


export async function unlikeSong(songId) {

    const token =
        localStorage.getItem("token");


    if (!token) {

        throw new Error(
            "AUTH_REQUIRED"
        );

    }


    const response = await fetch(
        `${API_BASE_URL}/api/music/${songId}/like`,
        {
            method: "DELETE",

            headers: {
                Authorization:
                    `Bearer ${token}`,
            },
        }
    );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.message ||
            "Unable to unlike song."
        );

    }


    return data;

}


// ======================================================
// MEDIA URL
// ======================================================

export function getMediaUrl(
  fileUrl
) {
  if (!fileUrl) {
    return "";
  }


  // Already a complete URL
  if (
    fileUrl.startsWith("http://") ||
    fileUrl.startsWith("https://") ||
    fileUrl.startsWith("blob:")
  ) {
    return fileUrl;
  }


  // Local backend media
  return `${API_BASE_URL}${
    fileUrl.startsWith("/")
      ? fileUrl
      : `/${fileUrl}`
  }`;
}

// ======================================================
// WALLET API
// ======================================================

// ======================================================
// GET WALLET
// GET /api/wallet
// ======================================================

export async function getWallet() {

  return request(
    "/api/wallet"
  );

}


// ======================================================
// GET WALLET TRANSACTIONS
// GET /api/wallet/transactions
// ======================================================

export async function getWalletTransactions({
  limit = 50,
  offset = 0,
} = {}) {

  return request(
    `/api/wallet/transactions?limit=${encodeURIComponent(
      limit
    )}&offset=${encodeURIComponent(
      offset
    )}`
  );

}


// ======================================================
// GET PAYOUT METHODS
// GET /api/wallet/payout-methods
// ======================================================

export async function getWalletPayoutMethods() {

  return request(
    "/api/wallet/payout-methods"
  );

}


// ======================================================
// ADD PAYOUT METHOD
// POST /api/wallet/payout-methods
// ======================================================

export async function addWalletPayoutMethod(
  data
) {

  return request(
    "/api/wallet/payout-methods",
    {
      method: "POST",

      body: JSON.stringify(
        data
      ),
    }
  );

}


// ======================================================
// GET WITHDRAWALS
// GET /api/wallet/withdrawals
// ======================================================

export async function getWalletWithdrawals() {

  return request(
    "/api/wallet/withdrawals"
  );

}


// ======================================================
// REQUEST WITHDRAWAL
// POST /api/wallet/withdrawals
// ======================================================

export async function requestWalletWithdrawal(
  amount,
  payoutMethodId
) {

  return request(
    "/api/wallet/withdrawals",
    {
      method: "POST",

      body: JSON.stringify({
        amount,
        payoutMethodId,
      }),
    }
  );

}


// ======================================================
// ROYALTY SETTLEMENT API
// ======================================================


// ======================================================
// GET MY ROYALTY SETTLEMENT SUMMARY
//
// GET /api/royalty-settlements/my
//
// Expected response:
//
// {
//   summary: {
//
//     estimated: {
//       total: 0
//     },
//
//     settled: {
//       total: 0
//     },
//
//     unsettled: {
//       total: 0
//     },
//
//     wallet: {
//       available: 0,
//       pending: 0,
//       lifetimeEarnings: 0
//     },
//
//     currency: "USD"
//
//   }
// }
//
// IMPORTANT:
//
// The frontend does NOT calculate royalty settlements.
//
// The backend settlement system is the
// authoritative source for:
//
//     estimated
//     settled
//     unsettled
//
// ======================================================

export async function getMyRoyaltySettlementSummary() {

  return request(
    "/api/royalty-settlements/my"
  );

}



// ======================================================
// SETTLE ONE SONG
// POST /api/royalty-settlements/songs/:songId/settle
// ======================================================

export async function settleSongRoyalties(songId) {
  return request(
    `/api/royalty-settlements/songs/${encodeURIComponent(songId)}/settle`,
    {
      method: "POST",
    }
  );
}


// ======================================================
// GET SONG SETTLEMENT HISTORY
// GET /api/royalty-settlements/songs/:songId
// ======================================================

export async function getSongSettlementHistory(songId) {
  return request(
    `/api/royalty-settlements/songs/${encodeURIComponent(songId)}`
  );
}


// ======================================================
// GET SONG UNSETTLED ACTIVITY
// GET /api/royalty-settlements/songs/:songId/unsettled
// ======================================================

export async function getSongUnsettledRoyalties(songId) {
  return request(
    `/api/royalty-settlements/songs/${encodeURIComponent(songId)}/unsettled`
  );
}


// ======================================================
// GET MY ROYALTY SETTLEMENTS
// GET /api/royalty-settlements/my
// ======================================================

export async function getMyRoyaltySettlements() {
  return request(
    "/api/royalty-settlements/my"
  );
}


// ======================================================
// SETTLE MY ROYALTIES
// POST /api/royalty-settlements/my/settle
// ======================================================

export async function settleMyRoyalties() {
  return request(
    "/api/royalty-settlements/my/settle",
    {
      method: "POST",
    }
  );
}


// ======================================================
// CAVE TUNES COUNTRY CHARTS API
// ======================================================

// GET FEATURED CHARTS
// GET /api/charts/featured
export async function getFeaturedCharts() {
  return request("/api/charts/featured");
}

// GET AVAILABLE COUNTRY CHARTS
// GET /api/charts/countries
export async function getAvailableCharts() {
  return request("/api/charts/countries");
}

// GET SONGS IN A SPECIFIC COUNTRY CHART
// GET /api/charts/:slug
// Examples: malawi, uk, usa, france
export async function getCountryChart(slug) {
  if (!slug) {
    throw new Error("Chart country is required.");
  }

  return request(
    `/api/charts/${encodeURIComponent(slug)}`
  );
}


// ======================================================
// GET API BASE URL
// ======================================================

export function getApiBaseUrl() {
  return API_BASE_URL;
}


// ======================================================
// CAVE TUNES RADIO API
// ======================================================

// GET UPCOMING RADIO PROGRAMS
export async function getRadioPrograms() {
  return request("/api/radio/programs");
}

// SET PROGRAM REMINDER
export async function setRadioProgramReminder(programId) {
  return request(
    `/api/radio/programs/${encodeURIComponent(programId)}/remind`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

// CANCEL PROGRAM REMINDER
export async function cancelRadioProgramReminder(programId) {
  return request(
    `/api/radio/programs/${encodeURIComponent(programId)}/remind`,
    {
      method: "DELETE",
    }
  );
}

// GET REMINDER STATUS
export async function getRadioReminderStatus(programId) {
  return request(
    `/api/radio/programs/${encodeURIComponent(programId)}/reminder-status`
  );
}

// GET MY RADIO REMINDERS
export async function getMyRadioReminders() {
  return request("/api/radio/my-reminders");
}


export async function getPopularCreators() {
    return request("/api/auth/creators/popular");
}

// ======================================================
// TRENDING IN LISTENER'S COUNTRY
// GET /api/auth/trending-in-country
// ======================================================

export async function getTrendingInCountry() {
    return request(
        "/api/auth/trending-in-country"
    );
}