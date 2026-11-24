import { useEffect, useState } from "react";

const API_BASE_URL =
window.location.hostname === "localhost" ||
window.location.hostname === "127.0.0.1"
? "http://localhost:5000"
: window.location.origin;

function useCreators(role) {
const [creators, setCreators] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
let cancelled = false;


const loadCreators = async () => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/auth/creators?role=${encodeURIComponent(role)}`
    );

    const contentType =
      response.headers.get("content-type") || "";

    const text = await response.text();

    if (!contentType.includes("application/json")) {
      throw new Error(
        `Server returned a non-JSON response (${response.status}).`
      );
    }

    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        "The server returned invalid JSON."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
        `Unable to load ${role}s.`
      );
    }

    const list =
      data?.creators ||
      data?.artists ||
      data?.users ||
      data?.data ||
      [];

    if (!cancelled) {
      setCreators(
        Array.isArray(list)
          ? list
          : []
      );

      setError("");
    }

  } catch (requestError) {

    if (
      requestError?.name ===
      "AbortError"
    ) {
      return;
    }

    console.error(
      `Creator loading error (${role}):`,
      requestError
    );

    if (!cancelled) {
      setError(
        requestError?.message ||
        `Unable to load ${role}s.`
      );
    }

  } finally {

    if (!cancelled) {
      setLoading(false);
    }

  }
};

/*
  Start the request asynchronously.
  State updates happen inside the fetch
  callback rather than synchronously in
  the effect body.
*/

const timer = setTimeout(
  loadCreators,
  0
);

return () => {
  cancelled = true;
  clearTimeout(timer);
};


}, [role]);

return {
creators,
loading,
error,
};
}

export default useCreators;
