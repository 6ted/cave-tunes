// ======================================================
// CAVE TUNES
// SCIZZOR CUSTOM HOOK
// src/context/useScizzor.js
// ======================================================

import { useContext } from "react";

import ScizzorContext from "./scizzorContextObject";

export default function useScizzor() {
    const context = useContext(ScizzorContext);

    if (!context) {
        throw new Error(
            "useScizzor must be used inside ScizzorProvider."
        );
    }

    return context;
}