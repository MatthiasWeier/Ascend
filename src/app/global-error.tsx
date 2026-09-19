"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({ level: "error", message: "Root layout crashed", error: error.message, digest: error.digest }));
  }, [error]);

  return (
    <html lang="de">
      <body style={{ background: "#0c0b08", color: "#f2f2ef", fontFamily: "system-ui, sans-serif" }}>
        <main
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Ascend ist gerade abgestürzt / Ascend has crashed</h1>
          <p style={{ maxWidth: "24rem", fontSize: "0.875rem", opacity: 0.7 }}>
            Bitte lad die Seite neu. Falls das öfter passiert, sag Bescheid.
            <br />
            Please reload the page. If this keeps happening, let us know.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              background: "#fb7119",
              color: "#150d05",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Nochmal versuchen / Try again
          </button>
        </main>
      </body>
    </html>
  );
}
