// Capitalizes the first character of a string
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Global state variables
let jsonData = null;
let currentThreatCategory = "Air";
let currentAircraftType = "FA-18C_hornet";
let currentTabId = "programTab";

// Defines per-aircraft capabilities
const aircraftCapabilities = {
  "FA-18C_hornet": {
    hasPrograms: true,
    hasThreatTable: true,
    hasComm: true,
  },
  "F-16C_50": {
    hasPrograms: true,
    hasThreatTable: true,
    hasComm: true,
  },
};

// Access paths to aircraft-specific DTC structure fields
const dtcPaths = {
  "FA-18C_hornet": {
    programSettings: () => jsonData?.data?.ALR67?.CMDS?.CMDSProgramSettings,
    threatTable: () => jsonData?.data?.ALR67?.CMDS?.CMDS_Threat_table,
    delayBetweenPrograms: () =>
      jsonData?.data?.ALR67?.CMDS?.CMDSProgramSettings?.delay_between_programs,
  },
  "F-16C_50": {
    bingoSettings: () => jsonData?.data?.MPD?.CMDS?.CMDSBingoSettings,
    programSettings: () => jsonData?.data?.MPD?.CMDS?.CMDSProgramSettings,
    threatTable: () => jsonData?.data?.MPD?.CMDS?.CMDSPrograms,
    delayBetweenPrograms: () => jsonData?.data?.MPD?.CMDS?.CMDSPrograms?.delayBetweenPrograms,
  },
};

// Map for displaying user-friendly program names
const friendlyNames = {
  // F-18
  AUTO_1: "Auto 1",
  AUTO_2: "Auto 2",
  AUTO_3: "Auto 3",
  AUTO_4: "Auto 4",
  BYP: "Bypass",
  MAN_1: "Manual 1",
  MAN_2: "Manual 2",
  MAN_3: "Manual 3",
  MAN_4: "Manual 4",
  MAN_5: "Manual 5",
  MAN_6: "Manual 6",
  SEMI: "Semi-Auto",
  NONE: "None",

  // F-16
  AUTO1: "Auto 1",
  AUTO2: "Auto 2",
  AUTO3: "Auto 3",
  AUTO4: "Auto 4",
  MAN1: "Manual 1",
  MAN2: "Manual 2",
  MAN3: "Manual 3",
  MAN4: "Manual 4",
  MAN5: "Manual 5",
  MAN6: "Manual 6",
};

// Shows or hides UI tabs depending on aircraft capabilities
function updateTabVisibilityForAircraft(type) {
  const caps = aircraftCapabilities[type] || {};

  renderTabButtons(); // Refresh tab buttons based on capability

  toggleElement("programTab", caps.hasPrograms);
  toggleElement("threatTab", caps.hasThreatTable);
  toggleElement("commTab", caps.hasComm);

  const tabKeyMap = {
    programTab: "hasPrograms",
    threatTab: "hasThreatTable",
    commTab: "hasComm",
  };

  // Redirect if current tab isn't supported
  const validTab = caps[tabKeyMap[currentTabId]] ?? false;
  if (!validTab) {
    if (caps.hasPrograms) currentTabId = "programTab";
    else if (caps.hasThreatTable) currentTabId = "threatTab";
    else if (caps.hasComm) currentTabId = "commTab";
  }

  switchTab(currentTabId);
}

// Show/hide DOM element by ID
function toggleElement(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("hidden", !show);
}

// Sets theme on load (uses localStorage or system preference)
function applyTheme() {
  const theme =
    localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("themeToggle").textContent =
    theme === "dark" ? "Light Mode" : "Dark Mode";
}

// Toggles between light/dark theme
function toggleDarkMode() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  applyTheme();
}

// Renders tab buttons dynamically based on aircraft capabilities
function renderTabButtons() {
  const container = document.getElementById("tabButtons");
  container.innerHTML = "";

  const caps = aircraftCapabilities[currentAircraftType];

  const tabs = [
    {
      id: "programTab",
      label: "Countermeasure Programs",
      capability: "hasPrograms",
      btnId: "tabProgramsBtn",
    },
    {
      id: "threatTab",
      label: "Threat Table",
      capability: "hasThreatTable",
      btnId: "tabThreatsBtn",
    },
    { id: "commTab", label: "Communications", capability: "hasComm", btnId: "tabCommBtn" },
  ];

  tabs.forEach(({ id, label, capability, btnId }) => {
    if (!caps[capability]) return;
    const btn = document.createElement("button");
    btn.id = btnId;
    btn.textContent = label;
    btn.className = "px-4 py-2 border rounded";
    btn.onclick = () => switchTab(id);
    container.appendChild(btn);
  });
}

// Activates a tab and updates style
function switchTab(tabId) {
  const allTabs = ["programTab", "threatTab", "commTab"];
  allTabs.forEach((t) => document.getElementById(t)?.classList.add("hidden"));

  const allButtons = ["tabProgramsBtn", "tabThreatsBtn", "tabCommBtn"];
  allButtons.forEach((b) =>
    document.getElementById(b)?.classList.remove("bg-blue-600", "text-white")
  );

  const tabElement = document.getElementById(tabId);
  const buttonElement = {
    programTab: "tabProgramsBtn",
    threatTab: "tabThreatsBtn",
    commTab: "tabCommBtn",
  }[tabId];

  if (!tabElement || !document.getElementById(buttonElement)) return;

  tabElement.classList.remove("hidden");
  document.getElementById(buttonElement).classList.add("bg-blue-600", "text-white");

  if (tabId === "threatTab") {
    currentThreatCategory = "Air";
    switchThreatCategory("Air");
  } else if (tabId === "commTab") {
    renderCommTab();
  }

  currentTabId = tabId;
}
// Switches threat category (Air, Ground, etc.) and updates button states
function switchThreatCategory(category) {
  currentThreatCategory = category;
  renderThreatTable(category); // Re-renders the table based on selected category

  // Remove active class from all buttons
  ["Air", "Ground", "Naval", "Other"].forEach((cat) => {
    const btn = document.getElementById(`cat-${cat}`);
    if (btn) btn.classList.remove("bg-blue-600", "text-white");
  });

  // Highlight the selected category button
  const activeBtn = document.getElementById(`cat-${category}`);
  if (activeBtn) activeBtn.classList.add("bg-blue-600", "text-white");
}

// Renders the threat table UI based on current category and aircraft
function renderThreatTable(category) {
  const tableBody = document.getElementById("threatTableBody");
  tableBody.innerHTML = "";

  const threatData = dtcPaths[currentAircraftType]?.threatTable?.();
  let rows = threatData?.[category] || [];

  // Optional fallback: custom logic for F-16 structure
  if (currentAircraftType === "F-16C_50" && !Array.isArray(rows)) {
    rows = Object.values(threatData).filter((entry) => {
      return (
        entry.category === category ||
        (category === "Other" && !["Air", "Ground", "Naval"].includes(entry.category))
      );
    });
  }

  const searchQuery = document.getElementById("threatSearch")?.value?.toLowerCase() || "";
  const filteredRows = rows.filter((entry) => {
    const name = entry.group_name?.toLowerCase() || entry.name?.toLowerCase() || "";
    const hint = entry.hint?.toLowerCase() || "";
    return name.includes(searchQuery) || hint.includes(searchQuery);
  });

  filteredRows.forEach((entry, index) => {
    const tr = document.createElement("tr");
    tr.className = "border-b";

    // Index #
    const tdIndex = document.createElement("td");
    tdIndex.className = "p-2";
    tdIndex.textContent = index + 1;
    tr.appendChild(tdIndex);

    // Name / Hint
    const tdName = document.createElement("td");
    tdName.className = "p-2";
    tdName.textContent = entry.group_name || entry.name || entry.hint || "Unknown";
    if (entry.hint) {
      tdName.title = entry.hint.replace(/\n/g, ", ");
    }
    tr.appendChild(tdName);

    // Threshold selector
    const tdThresh = document.createElement("td");
    tdThresh.className = "p-2";
    const selThresh = document.createElement("select");

    (entry.thresholds || []).forEach((th) => {
      const option = document.createElement("option");
      option.value = th.label || th;
      option.textContent = th.label || th;
      const isSelected =
        entry.default_threshold?.label === th.label || entry.defaultThreshold === th;
      if (isSelected) option.selected = true;
      selThresh.appendChild(option);
    });

    selThresh.onchange = () => {
      if (currentAircraftType === "FA-18C_hornet") {
        entry.default_threshold.label = selThresh.value;
      } else {
        entry.defaultThreshold = selThresh.value;
      }
    };

    tdThresh.appendChild(selThresh);
    tr.appendChild(tdThresh);

    // Program selector
    const tdProg = document.createElement("td");
    tdProg.className = "p-2";
    const selProg = document.createElement("select");

    Object.entries(friendlyNames)
      .filter(([k]) => k.startsWith("AUTO_"))
      .forEach(([key, label]) => {
        const num = parseInt(key.split("_")[1]);
        const option = document.createElement("option");
        option.value = num;
        option.textContent = label;
        if (entry.program === num) option.selected = true;
        selProg.appendChild(option);
      });

    selProg.onchange = () => {
      entry.program = parseInt(selProg.value);
    };

    tdProg.appendChild(selProg);
    tr.appendChild(tdProg);

    tableBody.appendChild(tr);
  });
}
// Renders editable COMM1 and COMM2 channel data
function renderCommTab() {
  const commRoot = jsonData?.data?.COMM;
  if (!commRoot || !commRoot.COMM1 || !commRoot.COMM2) {
    console.warn("COMM1 or COMM2 missing in JSON structure");
    return;
  }

  const comm1 = commRoot.COMM1;
  const comm2 = commRoot.COMM2;

  const comm1Body = document.getElementById("comm1Body");
  const comm2Body = document.getElementById("comm2Body");
  comm1Body.innerHTML = "";
  comm2Body.innerHTML = "";

  // Reusable COMM table renderer for COMM1/COMM2
  const renderCommTable = (comm, tbody, commKey) => {
    Object.entries(comm)
      .filter(([key]) => key.startsWith("Channel_"))
      .sort((a, b) => {
        const getSortKey = (k) => {
          const match = k.match(/^Channel_(\d+)$/);
          return match ? parseInt(match[1]) : k;
        };
        return getSortKey(a[0]) - getSortKey(b[0]);
      })
      .forEach(([chan, details]) => {
        const tr = document.createElement("tr");
        tr.className = "border-b";

        // Channel label
        const tdChan = document.createElement("td");
        tdChan.className = "p-2";
        tdChan.textContent = chan.replace("Channel_", "Channel ");
        tr.appendChild(tdChan);

        // Frequency input
        const tdFreq = document.createElement("td");
        tdFreq.className = "p-2";
        const freqInput = document.createElement("input");
        freqInput.type = "number";
        freqInput.step = "0.01";
        freqInput.value = details.frequency ?? details.freq ?? "";
        freqInput.className = "w-24";
        freqInput.onblur = () => {
          const val = parseFloat(freqInput.value);
          if (!isNaN(val)) {
            if ("frequency" in details) details.frequency = val;
            else if ("freq" in details) details.freq = val;
          } else {
            freqInput.value = details.frequency ?? details.freq ?? "";
          }
        };
        tdFreq.appendChild(freqInput);
        tr.appendChild(tdFreq);

        // Modulation selector
        const tdMod = document.createElement("td");
        tdMod.className = "p-2";
        const selMod = document.createElement("select");
        ["AM", "FM"].forEach((label, idx) => {
          const opt = new Option(label, idx);
          if (details.modulation == idx) opt.selected = true;
          selMod.appendChild(opt);
        });
        selMod.onchange = () => {
          details.modulation = parseInt(selMod.value);
        };
        tdMod.appendChild(selMod);
        tr.appendChild(tdMod);

        // Channel name input
        const tdName = document.createElement("td");
        tdName.className = "p-2";
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = details.name ?? `CH ${chan.replace("Channel_", "")}`;
        nameInput.className = "w-24";
        nameInput.onblur = () => {
          if ("name" in details || currentAircraftType === "FA-18C_hornet") {
            details.name = nameInput.value;
          }
        };
        tdName.appendChild(nameInput);
        tr.appendChild(tdName);

        tbody.appendChild(tr);
      });

    // Optional: Guard checkbox for F/A-18C
    if ("Guard" in comm && currentAircraftType === "FA-18C_hornet") {
      const trGuard = document.createElement("tr");
      trGuard.innerHTML = `
          <td colspan="4" class="p-2 pt-4">
            <label>
              <input type="checkbox" id="guardToggle-${commKey}" ${comm.Guard ? "checked" : ""}/>
              Guard Enabled
            </label>
          </td>
        `;
      tbody.appendChild(trGuard);

      const guardInput = trGuard.querySelector("input[type='checkbox']");
      guardInput.onchange = () => {
        comm.Guard = guardInput.checked;
      };
    }
  };

  // Render both COMM tables
  renderCommTable(comm1, comm1Body, "comm1");
  renderCommTable(comm2, comm2Body, "comm2");
}
function renderConfigurator() {
  const settings = dtcPaths[currentAircraftType]?.programSettings?.();
  if (!settings) return;

  const bingoContainer = document.getElementById("bingoSettingsContainer");
  const bingoFields = document.getElementById("bingoSettingsFields");
  bingoContainer.classList.add("hidden"); // Hide by default

  // ─── F-16 Bingo Editor ───
  if (currentAircraftType === "F-16C_50") {
    const bingoData = dtcPaths["F-16C_50"]?.bingoSettings?.();
    if (bingoData) {
      bingoContainer.classList.remove("hidden");
      bingoFields.innerHTML = "";

      const qtyFields = [
        { key: "ChaffNum", label: "Chaff Qty", min: 0, max: 99 },
        { key: "FlaresNum", label: "Flare Qty", min: 0, max: 99 },
        { key: "Other1Num", label: "Other1 Qty", min: 0, max: 99 },
        { key: "Other2Num", label: "Other2 Qty", min: 0, max: 99 },
      ];

      const checkboxFields = [
        { key: "BINGO", label: "BINGO Warning" },
        { key: "FDBK", label: "Feedback (FDBK)" },
        { key: "REQCTR", label: "Request Counter (REQCTR)" },
      ];

      const qtyRow = document.createElement("div");
      qtyRow.className = "flex flex-nowrap gap-4 mb-4 overflow";

      qtyFields.forEach(({ key, label, min, max }) => {
        const col = document.createElement("div");
        col.className = "flex flex-col min-w-[100px]";

        const lbl = document.createElement("label");
        lbl.className = "block text-sm font-medium mb-1";
        lbl.textContent = label;

        const input = document.createElement("input");
        input.type = "number";
        input.className = "w-20";
        input.min = min;
        input.max = max;
        input.value = bingoData[key];
        input.onblur = () => {
          const val = parseInt(input.value);
          if (!isNaN(val)) bingoData[key] = Math.max(min, Math.min(max, val));
          else input.value = bingoData[key];
        };

        col.appendChild(lbl);
        col.appendChild(input);
        qtyRow.appendChild(col);
      });

      const checkboxRow = document.createElement("div");
      checkboxRow.className = "flex flex-wrap gap-x-6 gap-y-2";

      checkboxFields.forEach(({ key, label }) => {
        const wrapper = document.createElement("label");
        wrapper.className = "flex items-center gap-2";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = bingoData[key];
        checkbox.onchange = () => {
          bingoData[key] = checkbox.checked;
        };

        wrapper.appendChild(checkbox);
        wrapper.appendChild(document.createTextNode(label));
        checkboxRow.appendChild(wrapper);
      });

      const formContainer = document.createElement("div");
      formContainer.className = "flex flex-col gap-4";
      formContainer.appendChild(qtyRow);
      formContainer.appendChild(checkboxRow);
      bingoFields.appendChild(formContainer);
    }
  }

  // ─── Global Delay Between Programs ───
  const delay = dtcPaths[currentAircraftType]?.delayBetweenPrograms?.();
  if (typeof delay === "number") {
    const globalDelayInput = document.getElementById("globalDelay");
    globalDelayInput.value = delay;
    globalDelayInput.onblur = () => {
      let v = parseFloat(globalDelayInput.value);
      if (!isNaN(v)) {
        v = Math.round(v / 0.25) * 0.25;
        v = Math.max(0, Math.min(99, v));
        globalDelayInput.value = v;

        if (currentAircraftType === "FA-18C_hornet")
          jsonData.data.ALR67.CMDS.CMDSProgramSettings.delay_between_programs = v;
        else if (currentAircraftType === "F-16C_50")
          jsonData.data.MPD.CMDS.CMDSPrograms.delayBetweenPrograms = v;
      }
    };
  }
  const autoContainer = document.getElementById("autoPrograms");
  const manContainer = document.getElementById("manualPrograms");

  autoContainer.innerHTML = '<h2 class="text-lg font-semibold mb-2">AUTO Programs</h2>';
  manContainer.innerHTML = '<h2 class="text-lg font-semibold mb-2">Manual Programs</h2>';

  const manualSections = [];
  let bypassSection = null;

  Object.entries(settings).forEach(([program, fields]) => {
    if (typeof fields !== "object") return;

    const section = document.createElement("div");
    section.className = "program-section";

    const header = document.createElement("div");
    header.className = "section-header";
    header.textContent = friendlyNames[program] || program;

    const content = document.createElement("div");
    content.className = "space-y-2 mt-2";

    header.addEventListener("click", () => {
      content.classList.toggle("collapsed");
    });

    // Render per-countermeasure (Chaff, Flare, etc.)
    ["Chaff", "Flare", "Other1", "Other2"].forEach((type) => {
      const typeData = fields[type];
      if (!typeData) return;

      const row = document.createElement("div");
      row.className = "flex gap-4 items-end mb-2";

      const typeLabel = document.createElement("div");
      typeLabel.className = "w-16 font-medium";
      typeLabel.textContent = type;
      row.appendChild(typeLabel);

      // Per-aircraft parameter schema
      const paramSchemaMap = {
        "F-16C_50": [
          { label: "Burst Qty", key: "BurstQuantity", step: 1, min: 1, max: 99 },
          { label: "Burst Interval", key: "BurstInterval", step: 0.001, min: 0.02, max: 10 },
          { label: "Salvo Qty", key: "SalvoQuantity", step: 1, min: 1, max: 99 },
          { label: "Salvo Interval", key: "SalvoInterval", step: 0.01, min: 0.5, max: 150 },
        ],
        "FA-18C_hornet": [
          { label: "Quantity", key: "Quantity", step: 1, min: 0, max: 100 },
          { label: "Repeat", key: "Repeat", step: 1, min: 1, max: 24 },
          { label: "Interval", key: "Interval", step: 0.25, min: 0.25, max: 5 },
        ],
      };

      const defaultSchema = [
        { label: "Quantity", key: "Quantity", step: 1, min: 0, max: 100 },
        { label: "Repeat", key: "Repeat", step: 1, min: 1, max: 24 },
        { label: "Interval", key: "Interval", step: 0.25, min: 0.25, max: 5 },
      ];

      const paramFields = paramSchemaMap[currentAircraftType] || defaultSchema;

      paramFields.forEach(({ label, key, step, min, max }) => {
        if (typeData[key] === undefined) return;

        const col = document.createElement("div");
        col.className = "flex flex-col";

        const lbl = document.createElement("label");
        lbl.className = "block text-xs";
        lbl.textContent = label;
        col.appendChild(lbl);

        const input = document.createElement("input");
        input.type = "number";
        input.className = "w-20";
        input.step = step;
        input.min = min;
        input.max = max;
        input.value = typeData[key];

        input.onblur = () => {
          let v = parseFloat(input.value);
          if (!isNaN(v)) {
            v = Math.round(v / step) * step;
            v = Math.max(min, Math.min(max, v));
            input.value = v;
            typeData[key] = v;
          } else {
            input.value = typeData[key];
          }
        };

        col.appendChild(input);
        row.appendChild(col);
      });

      content.appendChild(row);
    });

    section.appendChild(header);
    section.appendChild(content);

    if (program.startsWith("AUTO")) autoContainer.appendChild(section);
    else if (program === "BYP") bypassSection = section;
    else manualSections.push(section);
  });

  manualSections.forEach((s) => manContainer.appendChild(s));
  if (bypassSection) manContainer.appendChild(bypassSection);
}
// Trigger file download with aircraft-specific .DTC filename
function downloadJson() {
  const fileName = document.getElementById("filename").value;

  if (!jsonData.data) jsonData.data = {};
  jsonData.data.name = "";
  jsonData.data.type = currentAircraftType;

  jsonData.name = fileName.replace(/\.json$/, "");
  jsonData.type = currentAircraftType;

  const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".DTC") ? fileName : `${fileName}.DTC`;
  a.click();
  URL.revokeObjectURL(url);
}
// Load the default DTC JSON for the current aircraft
async function loadDefaultJson() {
  try {
    const res = await fetch(
      currentAircraftType === "F-16C_50"
        ? "F-16CM_bl50_DTC_1_DEFAULT.json"
        : "FA-18C_Lot20_DTC1_DEFAULT.json"
    );
    jsonData = await res.json();

    renderConfigurator();
    renderCommTab();
    updateTabVisibilityForAircraft(currentAircraftType);
  } catch {
    alert("Failed to load default configuration.");
  }
}
// Load a custom uploaded DTC file
document.getElementById("fileInput").addEventListener("change", function (e) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      jsonData = JSON.parse(event.target.result);

      // Detect and set aircraft type
      const detectedType = jsonData?.type || jsonData?.data?.type;
      if (detectedType && aircraftCapabilities[detectedType]) {
        currentAircraftType = detectedType;
        document.getElementById("aircraftSelect").value = detectedType;
        updateTabVisibilityForAircraft(detectedType);
      }

      // Patch COMM channel names if missing
      if (jsonData?.data?.COMM) {
        ["COMM1", "COMM2"].forEach((commKey) => {
          const comm = jsonData.data.COMM[commKey];
          if (comm) {
            Object.entries(comm).forEach(([chan, details]) => {
              if (chan.startsWith("Channel_") && !("name" in details)) {
                details.name = `CH ${chan.replace("Channel_", "")}`;
              }
            });
          }
        });
      }

      renderTabButtons();
      renderConfigurator();
      renderCommTab();
    } catch {
      alert("Invalid DTC file.");
    }
  };
  reader.readAsText(e.target.files[0]);
});
// Search bar filtering threat table
document.getElementById("threatSearch").addEventListener("input", () => {
  renderThreatTable(currentThreatCategory);
});

// Aircraft dropdown change triggers reload + tab preservation
document.getElementById("aircraftSelect").addEventListener("change", (e) => {
  const selected = e.target.value;
  const previousTab = currentTabId;

  currentAircraftType = selected;
  updateTabVisibilityForAircraft(selected);

  const caps = aircraftCapabilities[selected];
  const fallbackTab = caps.hasPrograms
    ? "programTab"
    : caps.hasThreatTable
    ? "threatTab"
    : "commTab";

  const tabToShow = caps[
    {
      programTab: "hasPrograms",
      threatTab: "hasThreatTable",
      commTab: "hasComm",
    }[previousTab]
  ]
    ? previousTab
    : fallbackTab;

  currentTabId = tabToShow;
  switchTab(tabToShow);
  loadDefaultJson();
});

// Initial boot
updateTabVisibilityForAircraft(currentAircraftType);
applyTheme();
loadDefaultJson();
