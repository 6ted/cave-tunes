
// ======================================================
// CAVE TUNES
// AUTH HOOK
// src/hooks/useAuth.js
// ======================================================

import { useContext } from "react";

import AuthContext from "../context/AuthContext.jsx";


// ======================================================
// USE AUTH
// ======================================================

export function useAuth() {

    const context = useContext(
        AuthContext
    );

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider"
        );
    }

    return context;
}


export default useAuth;

