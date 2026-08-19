import Script from "next/script";

export default function Home() {
  return (
    <>
      <div id="sentient-root" suppressHydrationWarning>
        <div className="static-loader">
          <strong>SENTIENT OS</strong>
          <span>Initializing behavioral policy engine…</span>
        </div>
      </div>
      <Script type="module" src="/assets/js/app.js" strategy="afterInteractive" />
    </>
  );
}
