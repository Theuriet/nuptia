import {
  loadWeddingWorkspace,
  addReceptionTable,
  addGuest,
  checkInGuest,
  subscribeToWeddingUpdates
} from "./nuptia-db.js";
import {
  buildGuestInviteUrl,
  loadPublicInvitation,
  updateGuestRsvp,
  buildWhatsAppShareLink
} from "./nuptia-invite.js";
import {
  loginWithCode,
  getCurrentRole,
  logoutRole,
  applyRolePermissions
} from "./nuptia-auth.js";
import { startQrCamera } from "./nuptia-qr.js";

const params = new URLSearchParams(window.location.search);
const slug = params.get("wedding") || "theuriet-naomi";
const inviteToken = params.get("invite");

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

async function init() {
  setupRoleBar();

  if (inviteToken) {
    const inviteData = await loadPublicInvitation({ slug, qrToken: inviteToken });
    renderPublicInvite(inviteData);
    return;
  }

  let state = await loadWeddingWorkspace(slug);
  renderWorkspace(state);

  subscribeToWeddingUpdates(state.wedding.id, async () => {
    state = await loadWeddingWorkspace(slug);
    renderWorkspace(state);
  });

  const guestForm = document.querySelector("#guest-form");
  if (guestForm) {
    guestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fullName = guestForm.querySelector('[name="full_name"]').value.trim();
      const phone = guestForm.querySelector('[name="phone"]').value.trim();
      const tableId = guestForm.querySelector('[name="table_id"]')?.value || null;
      if (!fullName) return;

      await addGuest({
        weddingId: state.wedding.id,
        fullName,
        phone,
        tableId: tableId || null
      });
      guestForm.reset();
    });
  }

  const tableForm = document.querySelector("#table-form");
  if (tableForm) {
    tableForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = tableForm.querySelector('[name="table_name"]').value.trim();
      const capacity = Number(tableForm.querySelector('[name="capacity"]')?.value || 10);
      if (!name) return;

      await addReceptionTable(state.wedding.id, name, capacity);
      tableForm.reset();
    });
  }
}

function renderPublicInvite({ wedding, guest, table }) {
  const container = document.querySelector("#invite-view");
  if (!container) return;

  const inviteUrl = buildGuestInviteUrl({
    slug: wedding.slug,
    qrToken: guest?.qr_token
  });
  const waFr = buildWhatsAppShareLink({ lang: "fr", wedding, guest, table, inviteUrl });

  container.innerHTML = `
    <h2>${wedding.couple_names}</h2>
    <p>Invité : <strong>${guest ? guest.full_name : "Invité"}</strong></p>
    <p>Table : <strong>${table ? table.name : "À attribuer"}</strong></p>
    <p>Code QR : <code>${guest ? guest.qr_token : ""}</code></p>
    <button id="btn-confirm">Confirmer ma présence</button>
    <button id="btn-decline">Décliner</button>
    <a href="${waFr}" target="_blank" rel="noopener">Partager sur WhatsApp</a>
  `;

  if (guest?.qr_token) {
    container.querySelector("#btn-confirm")?.addEventListener("click", async () => {
      await updateGuestRsvp(guest.qr_token, "confirmed");
      alert("Présence confirmée !");
    });
    container.querySelector("#btn-decline")?.addEventListener("click", async () => {
      await updateGuestRsvp(guest.qr_token, "declined");
      alert("Réponse enregistrée.");
    });
  }
}

function renderWorkspace(state) {
  const listEl = document.querySelector("#guest-list");
  if (!listEl) return;

  const tableMap = new Map(state.tables.map((t) => [t.id, t.name]));

  listEl.innerHTML = state.guests
    .map((g) => {
      const inviteUrl = buildGuestInviteUrl({ slug: state.wedding.slug, qrToken: g.qr_token });
      const tableName = tableMap.get(g.table_id) || "Sans table";
      const waUrl = buildWhatsAppShareLink({
        lang: "fr",
        wedding: state.wedding,
        guest: g,
        table: g.table_id ? { name: tableName } : null,
        inviteUrl
      });

      return `
        <div class="guest-row">
          <span><strong>${g.full_name}</strong> — ${tableName} — ${g.checked_in ? "Entré" : "En attente"}</span>
          <a href="${waUrl}" target="_blank" rel="noopener">WhatsApp</a>
          <button data-checkin-id="${g.id}" ${g.checked_in ? "disabled" : ""}>Valider entrée</button>
        </div>
      `;
    })
    .join("");

  listEl.querySelectorAll("[data-checkin-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await checkInGuest({
        guestId: btn.dataset.checkinId,
        weddingId: state.wedding.id
      });
    });
  });
}

init().catch((err) => {
  console.error("Erreur NUPTIA :", err);
});
