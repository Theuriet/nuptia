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
    const txt = await res.text();
    throw new Error(`Supabase ${res.status}: ${txt}`);
  }
  return res.json();
}

async function getOrCreateWedding() {
  const existing = await sbFetch(`weddings?slug=eq.${encodeURIComponent(slug)}&select=*`);
  if (existing.length > 0) {
    return existing[0];
  }
  const created = await sbFetch("weddings", {
    method: "POST",
    body: JSON.stringify({
      slug,
      couple_names: "A.Theuriet & Naomie M"
    })
  });
  return created[0];
}

function setupSupabaseGuestForm() {
  const nameInput = document.querySelector("#sb-guest-name");
  const phoneInput = document.querySelector("#sb-guest-phone");
  const tableInput = document.querySelector("#sb-guest-table");
  const addBtn = document.querySelector("#sb-add-guest-btn");
  const statusEl = document.querySelector("#sb-guest-status");
  const linkBox = document.querySelector("#sb-guest-link-box");

  addBtn?.addEventListener("click", async () => {
    const fullName = nameInput?.value.trim();
    const phone = phoneInput?.value.trim() || null;
    const tableName = tableInput?.value.trim() || null;

    if (!fullName) {
      if (statusEl) statusEl.textContent = "Entrez le nom de l'invité.";
      return;
    }

    try {
      if (statusEl) statusEl.textContent = "Enregistrement dans Supabase...";
      const wedding = await getOrCreateWedding();

      let tableId = null;
      if (tableName) {
        const foundTables = await sbFetch(
          `tables?wedding_id=eq.${encodeURIComponent(wedding.id)}&name=eq.${encodeURIComponent(
            tableName
          )}&select=*`
        );
        if (foundTables.length > 0) {
          tableId = foundTables[0].id;
        } else {
          const newTables = await sbFetch("tables", {
            method: "POST",
            body: JSON.stringify({
              wedding_id: wedding.id,
              name: tableName,
              capacity: 10
            })
          });
          tableId = newTables[0]?.id || null;
        }
      }

      const token = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

      const inserted = await sbFetch("guests", {
        method: "POST",
        body: JSON.stringify({
          wedding_id: wedding.id,
          table_id: tableId,
          full_name: fullName,
          phone,
          qr_token: token,
          checked_in: false
        })
      });

      const guest = inserted[0];
      const inviteUrl = `${window.location.origin}${window.location.pathname}?wedding=${encodeURIComponent(
        wedding.slug
      )}&invite=${encodeURIComponent(guest.qr_token)}`;

      const waText = encodeURIComponent(
        `Bonjour ${guest.full_name}, voici votre invitation pour le mariage de ${wedding.couple_names} : ${inviteUrl}`
      );

      if (statusEl) statusEl.textContent = `Enregistré dans Supabase : ${guest.full_name}`;
      if (linkBox) {
        linkBox.innerHTML = `
          <p>Lien : <a href="${inviteUrl}" target="_blank" rel="noopener">${inviteUrl}</a></p>
          <a href="https://wa.me/?text=${waText}" target="_blank" rel="noopener">Envoyer sur WhatsApp</a>
        `;
      }

      if (nameInput) nameInput.value = "";
      if (phoneInput) phoneInput.value = "";
      if (tableInput) tableInput.value = "";
    } catch (err) {
      if (statusEl) statusEl.textContent = `Erreur : ${err.message}`;
    }
  });
}

async function loadPublicInviteData() {
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
    await sbFetch(`guests?id=eq.${encodeURIComponent(guest.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ rsvp_status: "confirmed" })
    });
    alert("Présence confirmée !");
  });

  container.querySelector("#btn-decline")?.addEventListener("click", async () => {
    await sbFetch(`guests?id=eq.${encodeURIComponent(guest.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ rsvp_status: "declined" })
    });
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
  setupSupabaseGuestForm();

  if (inviteToken) {
    const inviteData = await loadPublicInviteData();
    renderPublicInvite(inviteData);
  }
}

init().catch((err) => {
  console.error("Erreur NUPTIA :", err);
});
