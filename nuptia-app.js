import {
  loginWithCode,
  getCurrentRole,
  logoutRole,
  applyRolePermissions
} from "./nuptia-auth.js";
import { startQrCamera } from "./nuptia-qr.js";

const SUPABASE_URL = "https://yreablulslmnnexoojek.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3YNYOYJrO00k7VUqLfIhXw_0BFOHjN9";

const params = new URLSearchParams(window.location.search);
const slug = params.get("wedding") || "theuriet-naomi";
const inviteToken = params.get("invite");

let stopCameraFn = null;

function setupRoleBar() {
  const inputEl = document.querySelector("#role-code-input");
  const loginBtn = document.querySelector("#role-login-btn");
  const logoutBtn = document.querySelector("#role-logout-btn");
  const statusEl = document.querySelector("#role-status");

  const updateUI = () => {
    const role = getCurrentRole();
    applyRolePermissions(role);
    if (statusEl) {
      statusEl.textContent = `Rôle : ${role}`;
    }
  };

  loginBtn?.addEventListener("click", () => {
    if (!inputEl) return;
    const role = loginWithCode(inputEl.value);
    if (!role) {
      if (statusEl) statusEl.textContent = "Code PIN invalide";
      return;
    }
    inputEl.value = "";
    updateUI();
  });

  logoutBtn?.addEventListener("click", () => {
    logoutRole();
    updateUI();
  });

  updateUI();
}

function findInviteInLocalStorage(token) {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      const raw = localStorage.getItem(key);
      if (!raw || !raw.startsWith("{")) continue;
      const parsed = JSON.parse(raw);
      const lists = [
        parsed.guests,
        parsed.wedding?.guests,
        ...(Array.isArray(parsed.weddings) ? parsed.weddings.map((w) => w.guests) : [])
      ].filter(Array.isArray);

      for (const list of lists) {
        const found = list.find(
          (g) =>
            g &&
            (g.qr_token === token ||
              g.token === token ||
              g.invite_token === token ||
              g.code === token ||
              String(g.id) === token)
        );
        if (found) {
          const weddingName =
            parsed.couple_names ||
            parsed.wedding?.couple_names ||
            parsed.weddings?.[0]?.couple_names ||
            "A.Theuriet & Naomie M";
          return {
            wedding: { slug, couple_names: weddingName },
            guest: {
              ...found,
              full_name: found.full_name || found.name || found.nom || "Invité",
              qr_token: found.qr_token || found.token || found.code || token
            },
            table: found.table_name ? { name: found.table_name } : null
          };
        }
      }
    }
  } catch (_) {
    // Ignore les clés non JSON
  }
  return null;
}

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    throw new Error(`Supabase erreur ${res.status}`);
  }
  return res.json();
}

async function loadPublicInviteData() {
  const localMatch = findInviteInLocalStorage(inviteToken);
  if (localMatch) {
    return localMatch;
  }

  const weddings = await sbFetch(`weddings?slug=eq.${encodeURIComponent(slug)}&select=*`);
  const wedding = weddings[0] || { slug, couple_names: "A.Theuriet & Naomie M" };

  const guests = await sbFetch(
    `guests?qr_token=eq.${encodeURIComponent(inviteToken)}&select=*`
  );
  const guest = guests[0] || null;

  let table = null;
  if (guest?.table_id) {
    const tables = await sbFetch(`tables?id=eq.${encodeURIComponent(guest.table_id)}&select=*`);
    table = tables[0] || null;
  }

  return { wedding, guest, table };
}

function renderPublicInvite({ wedding, guest, table }) {
  const container = document.querySelector("#invite-view");
  if (!container) return;

  if (!guest) {
    container.innerHTML = `
      <h2>${wedding.couple_names}</h2>
      <p>Invitation introuvable pour ce code.</p>
    `;
    return;
  }

  const inviteUrl = `${window.location.origin}${window.location.pathname}?wedding=${encodeURIComponent(
    wedding.slug
  )}&invite=${encodeURIComponent(guest.qr_token)}`;

  const waText = encodeURIComponent(
    `Bonjour ${guest.full_name}, voici votre invitation pour le mariage de ${
      wedding.couple_names
    } : ${inviteUrl}`
  );

  container.innerHTML = `
    <h2>${wedding.couple_names}</h2>
    <p>Invité : <strong>${guest.full_name}</strong></p>
    <p>Table : <strong>${table ? table.name : "À attribuer"}</strong></p>
    <p>Code QR : <code>${guest.qr_token}</code></p>
    <button id="btn-confirm" type="button">Confirmer ma présence</button>
    <button id="btn-decline" type="button">Décliner</button>
    <a href="https://wa.me/?text=${waText}" target="_blank" rel="noopener">Partager sur WhatsApp</a>
  `;

  container.querySelector("#btn-confirm")?.addEventListener("click", async () => {
    if (guest.id) {
      await sbFetch(`guests?id=eq.${encodeURIComponent(guest.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ rsvp_status: "confirmed" })
      }).catch(() => {});
    }
    alert("Présence confirmée !");
  });

  container.querySelector("#btn-decline")?.addEventListener("click", async () => {
    if (guest.id) {
      await sbFetch(`guests?id=eq.${encodeURIComponent(guest.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ rsvp_status: "declined" })
      }).catch(() => {});
    }
    alert("Réponse enregistrée.");
  });
}

function setupQrControls() {
  const startBtn = document.querySelector("#start-qr-btn");
  const stopBtn = document.querySelector("#stop-qr-btn");
  const videoEl = document.querySelector("#qr-video");
  const resultEl = document.querySelector("#qr-scan-result");

  startBtn?.addEventListener("click", async () => {
    if (stopCameraFn) stopCameraFn();
    stopCameraFn = await startQrCamera({
      videoEl,
      resultEl,
      onTokenDetected: async (token) => {
        const guests = await sbFetch(
          `guests?qr_token=eq.${encodeURIComponent(token)}&select=*`
        );
        const guest = guests[0];
        if (!guest) {
          if (resultEl) resultEl.textContent = `Invité introuvable (${token})`;
          return;
        }
        await sbFetch(`guests?id=eq.${encodeURIComponent(guest.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ checked_in: true })
        });
        if (resultEl) resultEl.textContent = `Entrée validée : ${guest.full_name}`;
      }
    });
  });

  stopBtn?.addEventListener("click", () => {
    if (stopCameraFn) {
      stopCameraFn();
      stopCameraFn = null;
    }
    if (resultEl) resultEl.textContent = "Caméra arrêtée.";
  });
}

async function init() {
  setupRoleBar();
  setupQrControls();

  if (inviteToken) {
    const inviteData = await loadPublicInviteData();
    renderPublicInvite(inviteData);
  }
}

init().catch((err) => {
  console.error("Erreur NUPTIA :", err);
});
