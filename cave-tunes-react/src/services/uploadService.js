import { API_BASE_URL as SHARED_API_BASE_URL } from "./api";

const API_URL = SHARED_API_BASE_URL;

export function uploadRelease(formData, onProgress) {
    return new Promise((resolve, reject) => {
        const token = localStorage.getItem("token");

        if (!token) {
            reject(
                new Error("You must be logged in before uploading.")
            );
            return;
        }

        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${API_URL}/api/upload/song`);

        xhr.setRequestHeader(
            "Authorization",
            `Bearer ${token}`
        );

        // ==============================================
        // REAL UPLOAD PROGRESS
        // ==============================================

        xhr.upload.addEventListener("progress", event => {
            if (event.lengthComputable && typeof onProgress === "function") {
                const percentage = Math.round(
                    (event.loaded / event.total) * 100
                );

                onProgress({
                    percentage,
                    loaded: event.loaded,
                    total: event.total
                });
            }
        });

        // ==============================================
        // UPLOAD COMPLETED
        // ==============================================

        xhr.addEventListener("load", () => {
            let responseData;

            try {
                responseData = JSON.parse(
                    xhr.responseText || "{}"
                );
            } catch {
                reject(
                    new Error("The server returned an invalid response.")
                );
                return;
            }

            if (xhr.status < 200 || xhr.status >= 300) {
                reject(
                    new Error(
                        responseData.message || "Upload failed."
                    )
                );
                return;
            }

            resolve(responseData);
        });

        // ==============================================
        // NETWORK ERROR
        // ==============================================

        xhr.addEventListener("error", () => {
            reject(
                new Error("Network error. Please check your connection.")
            );
        });

        xhr.addEventListener("abort", () => {
            reject(
                new Error("Upload was cancelled.")
            );
        });

        xhr.send(formData);
    });
}
