(() => {
  const sampleMeds = [
    { id: 1, name: "Paracetamol 500 mg", dose: "1 tableta", schedule: "08:00" },
    { id: 2, name: "Vitamina D 1000 UI", dose: "1 cápsula", schedule: "12:00" },
    { id: 3, name: "Ibuprofeno 200 mg", dose: "1 tableta", schedule: "20:00" }
  ];

  let meds = [];
  let checks = {};
  let currentPatientKey = null;
  let currentDateStr = null;

  // === Helpers ===
  const formatTime = iso => (iso ? new Date(iso).toLocaleTimeString() : "—");
  const storageKey = (p, d) => `hu02:${p}:${d}`;

  const saveToStorage = () => {
    if (!currentPatientKey || !currentDateStr) return;
    localStorage.setItem(storageKey(currentPatientKey, currentDateStr), JSON.stringify({ meds, checks }));
    setStatus("Guardado localmente ✓");
    renderAudit();
  };

  const loadFromStorage = (p, d) => {
    try {
      return JSON.parse(localStorage.getItem(storageKey(p, d)));
    } catch {
      return null;
    }
  };

  // === DOM ===
  const patientInput = document.getElementById("patientInput"),
    dateInput = document.getElementById("dateInput"),
    loadBtn = document.getElementById("loadBtn"),
    medListEl = document.getElementById("medList"),
    statusMsg = document.getElementById("statusMsg"),
    addSampleBtn = document.getElementById("addSampleBtn"),
    clearDayBtn = document.getElementById("clearDayBtn"),
    auditList = document.getElementById("auditList"),
    exportCsvBtn = document.getElementById("exportCsvBtn");

  dateInput.valueAsDate = new Date();

  const setStatus = t => (statusMsg.textContent = t || "");

  // === Render meds ===
  const renderMeds = () => {
    medListEl.innerHTML = "";
    if (meds.length === 0) {
      medListEl.innerHTML = `<div class="text-center small-muted p-3">No hay medicamentos. Carga ejemplos o añade la lista.</div>`;
      return;
    }
    meds.forEach(m => {
      const info = checks[m.id];
      const taken = info && info.taken;
      const item = document.createElement("div");
      item.className =
        "list-group-item med-item d-flex justify-content-between align-items-center " +
        (taken ? "taken" : "");
      item.innerHTML = `
        <div class="me-3">
          <div><strong>${m.name}</strong></div>
          <div class="small-muted">${m.dose || ""} ${m.schedule ? "• " + m.schedule : ""}</div>
        </div>
        <div class="text-end" style="min-width:170px">
          <div class="mb-1">
            <input type="checkbox" class="form-check-input me-2" id="chk_${m.id}" ${taken ? "checked" : ""}>
            <label for="chk_${m.id}" class="form-check-label small-muted">Tomado</label>
          </div>
          <div>
            <span class="badge bg-light text-dark time-badge">${info && info.takenAt ? formatTime(info.takenAt) : "—"}</span>
            <span class="badge bg-light text-dark actor-badge">${info && info.actor ? info.actor : ""}</span>
          </div>
        </div>
      `;
      medListEl.appendChild(item);

      const cb = item.querySelector(`#chk_${m.id}`);
      cb.addEventListener("change", () => {
        const actor = prompt(
          "¿Quién confirma la toma?",
          (checks[m.id] && checks[m.id].actor) || patientInput.value || "Paciente"
        );
        if (cb.checked) {
          checks[m.id] = {
            taken: true,
            takenAt: new Date().toISOString(),
            actor: actor || "Paciente"
          };
        } else {
          delete checks[m.id];
        }
        renderMeds();
        saveToStorage();
      });
    });
  };

  // === Render audit ===
  const renderAudit = () => {
    auditList.innerHTML = "";
    const items = Object.entries(checks)
      .filter(([, v]) => v && v.taken)
      .map(([id, v]) => ({ medId: +id, takenAt: v.takenAt, actor: v.actor }))
      .sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt));

    if (!items.length) {
      auditList.innerHTML = '<li class="text-muted">Sin acciones registradas hoy.</li>';
      return;
    }

    items.forEach(it => {
      const med = meds.find(m => m.id === it.medId);
      const li = document.createElement("li");
      li.innerHTML = `<strong>${med ? med.name : "ID " + it.medId}</strong> — ${formatTime(
        it.takenAt
      )} <span class="text-muted">por ${it.actor}</span>`;
      auditList.appendChild(li);
    });
  };

  // === Eventos ===
  loadBtn.addEventListener("click", () => {
    const p = (patientInput.value || "").trim(),
      d = dateInput.value;
    if (!p) return alert("Completa paciente ID / Nombre");
    if (!d) return alert("Selecciona una fecha");
    currentPatientKey = p;
    currentDateStr = d;
    const stored = loadFromStorage(p, d);
    if (stored && stored.meds) {
      meds = stored.meds;
      checks = stored.checks || {};
      setStatus("Datos cargados.");
    } else {
      meds = [];
      checks = {};
      setStatus("No hay datos guardados.");
    }
    renderMeds();
    renderAudit();
  });

  addSampleBtn.addEventListener("click", () => {
    if (!dateInput.value || !patientInput.value)
      return alert("Selecciona paciente y fecha.");
    meds = JSON.parse(JSON.stringify(sampleMeds));
    checks = {};
    renderMeds();
    saveToStorage();
  });

  clearDayBtn.addEventListener("click", () => {
    if (!currentPatientKey || !currentDateStr)
      return alert("Carga primero paciente y fecha.");
    if (!confirm("¿Seguro que quieres limpiar todo?")) return;
    checks = {};
    saveToStorage();
    renderMeds();
    renderAudit();
  });

  exportCsvBtn.addEventListener("click", () => {
    if (!currentPatientKey || !currentDateStr)
      return alert("Carga primero paciente y fecha.");
    const rows = [
      ["medicationId", "name", "dose", "schedule", "taken", "takenAt", "actor"]
    ];
    meds.forEach(m => {
      const i = checks[m.id];
      rows.push([
        m.id,
        `"${m.name}"`,
        `"${m.dose || ""}"`,
        m.schedule || "",
        i && i.taken ? "true" : "false",
        i && i.takenAt ? i.takenAt : "",
        i && i.actor ? `"${i.actor}"` : ""
      ]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hu02_${currentPatientKey}_${currentDateStr}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
})();
