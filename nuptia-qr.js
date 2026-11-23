export async function startQrCamera({ videoEl, resultEl, onTokenDetected }) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (resultEl) resultEl.textContent = "Caméra non supportée sur ce navigateur.";
    return null;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }
  });

  videoEl.srcObject = stream;
  videoEl.style.display = "block";
  await videoEl.play();

  const hasBarcodeDetector = "BarcodeDetector" in window;
  const detector = hasBarcodeDetector ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null;

  let active = true;

  const scanLoop = async () => {
    if (!active) return;

    if (detector && videoEl.readyState >= 2) {
      try {
        const codes = await detector.detect(videoEl);
        if (codes.length > 0 && codes[0].rawValue) {
          const raw = codes[0].rawValue.trim();
          let token = raw;
          try {
            const parsedUrl = new URL(raw);
            token = parsedUrl.searchParams.get("invite") || raw;
          } catch (_) {
            // Le QR code contient directement le token
          }
          if (resultEl) resultEl.textContent = `QR détecté : ${token}`;
          await onTokenDetected(token);
        }
      } catch (_) {
        // Ignore une frame non lisible
      }
    } else if (!hasBarcodeDetector && resultEl) {
      resultEl.textContent = "Caméra active : utilisez la validation manuelle si le QR n'est pas lu.";
    }

    requestAnimationFrame(scanLoop);
  };

  requestAnimationFrame(scanLoop);

  return () => {
    active = false;
    stream.getTracks().forEach((track) => track.stop());
    videoEl.style.display = "none";
  };
}
