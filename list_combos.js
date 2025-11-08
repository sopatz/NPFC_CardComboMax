// Loads NPFC Combos.csv and lists every combo

// list_combos.js
// Loads NPFC Combos.csv and lists every combo with sorting options

const CSV_FILE = "NPFC Combos.csv";
let combos = []; // store globally for re-sorting

function getCardColor(cardName) {
    const tactical = ["Analysis", "Marking", "Pressuring", "Countering", "Mini-Game", "Line Control", "Set Plays"];
    const technical = ["Dribbling", "Place Kicks", "Shooting", "Passing", "Freestyling", "Sliding", "Heading"];
    const physical = ["Running", "Weights", "Kicking", "Sprinting", "Agility", "Aerobics", "Stretching"];
    const support = ["Oil Therapy", "Meditation", "Signing", "PK Practice", "Judo", "Visualising", "Meeting", "Spa", "Mini-Camp", "Gaming", "Karaoke"];

    const name = (cardName || "").trim();

    if (tactical.includes(name)) return { bg: "#c9f5c4", text: "#2f5b2f" }; // green
    if (technical.includes(name)) return { bg: "#ffcaca", text: "#661a1a" }; // red
    if (physical.includes(name)) return { bg: "#cae1ff", text: "#1a3b66" }; // blue
    if (support.includes(name)) return { bg: "#fff5c2", text: "#665c1a" }; // yellow

    return { bg: "#eaeaea", text: "#333" }; // default gray
}

function renderComboItem(combo, container) {
    const comboName = combo["Combo Name"] || combo.ComboName || "(unnamed)";
    const cards = [combo.card1, combo.card2, combo.card3].filter(c => c && c.trim() !== "");
    const cardElements = cards.map(cardName => {
        const color = getCardColor(cardName);
        return `<span style="
                    background-color:${color.bg};
                    color:${color.text};
                    padding:2px 6px;
                    border-radius:4px;
                    margin-right:4px;
                    display:inline-block;
                ">${cardName}</span>`;
    }).join("");

    const skillUps = [
        ["Kicking", combo.Kicking],
        ["Speed", combo.Speed],
        ["Stamina", combo.Stamina],
        ["Technique", combo.Technique],
        ["Toughness", combo.Toughness],
        ["Jumping", combo.Jumping],
        ["Willpower", combo.Willpower]
    ].filter(([name, val]) => val != null && val !== "")
     .map(([name, val]) => [name, Number(val)]);

    const li = document.createElement("li");
    li.className = "comboRow";
    li.innerHTML = `
        <strong>${comboName}</strong> (${combo.Category || ""})<br>
        Cards: ${cardElements}<br>
        Total Skill Up: ${combo["Total skill up"] || combo["Total skill up"] === 0 ? combo["Total skill up"] : ""}<br>
        ${skillUps.map(([name, val]) => `${name}: ${val > 0 ? '+' + val : val}`).join(", ")}
    `;
    container.appendChild(li);
}

// Renders the combos in the selected order
function renderCombosList(sortMode = "alpha") {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";

    if (!combos || combos.length === 0) {
        resultsDiv.textContent = "No combos found in CSV.";
        return;
    }

    // Create a sorted copy
    let sorted = [...combos];

    if (sortMode === "skill") {
        sorted.sort((a, b) => {
            const skillA = parseFloat(a["Total skill up"]) || 0;
            const skillB = parseFloat(b["Total skill up"]) || 0;
            return skillB - skillA; // descending
        });
    } else {
        sorted.sort((a, b) => {
            const nameA = (a["Combo Name"] || a.ComboName || "").toLowerCase();
            const nameB = (b["Combo Name"] || b.ComboName || "").toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }

    const ul = document.createElement("ul");
    ul.style.listStyleType = "none";
    ul.style.paddingLeft = "0";

    sorted.forEach(combo => renderComboItem(combo, ul));

    resultsDiv.appendChild(ul);

    const summary = document.createElement("p");
    summary.innerHTML = `<strong>${sorted.length} combos listed (${sortMode === "skill" ? "by Total Skill Up" : "A–Z"})</strong>`;
    resultsDiv.appendChild(summary);
}

document.addEventListener("DOMContentLoaded", () => {
    Papa.parse(CSV_FILE, {
        download: true,
        header: true,
        complete: (results) => {
            combos = results.data.filter(row => row["Combo Name"] || row.ComboName);
            renderCombosList("alpha"); // default sort

            // hook up the dropdown
            const sortSelect = document.getElementById("sort-select");
            if (sortSelect) {
                sortSelect.addEventListener("change", () => {
                    renderCombosList(sortSelect.value);
                });
            }
        },
        error: (err) => {
            document.getElementById("results").innerText = "Error loading CSV: " + err.message;
        }
    });
});
