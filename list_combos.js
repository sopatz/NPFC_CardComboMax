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
    return { bg: "#eaeaea", text: "#333" };
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

// Calculate sum of selected skill columns for a combo
function getSelectedSkillSum(combo, selectedSkills) {
    return selectedSkills.reduce((sum, skill) => {
        const val = parseFloat(combo[skill]) || 0;
        return sum + val;
    }, 0);
}

// Renders the combo list with sorting and filtering
function renderCombosList(sortMode = "alpha", selectedSkills = [], selectedType = "all") {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";

    if (!combos || combos.length === 0) {
        resultsDiv.textContent = "No combos found in CSV.";
        return;
    }

    let filtered = [...combos];

    // Filter by selected combo type
    if (selectedType !== "all") {
        filtered = filtered.filter(c => {
            const cat = (c.Category || "").trim().toLowerCase();
            return cat === selectedType.toLowerCase();
        });
    }

    // Defining the in-game order of card combos
    const inGameComboOrder = [
        "Dribbling Shot",
        "Controlled Shot",
        "Volley Shot",
        "Banana Shot",
        "Rocket Shot",
        "Blind Shot",
        "Bicycle Kick",
        "Midfield Strike",
        "Knuckle Shot",
        "Super Long Shot",
        "Miracle Loop",
        "Driving Shot",
        "Shadow Striker",
        "Fast Dribble",
        "Rapid Dribbling",
        "Shock Dribble",
        "Phantom Dribbler",
        "Headed Shot",
        "Explosive Header",
        "Sliding Header",
        "Aerial Specialist",
        "Target Man",
        "Hold Up Play",
        "First-Touch Pass",
        "Pin-Point Pass",
        "Velvet Pass",
        "No-Look Pass",
        "Killer Pass",
        "Linked Partners",
        "Last Gasp Pass",
        "Tricky Feint",
        "Magic Trapping",
        "Magnet Trapping",
        "Ball Control",
        "Body Balance",
        "Body of Steel",
        "Bodywork",
        "Wing Change",
        "Long Pass",
        "Homing Cross",
        "Long Throw",
        "Scissors Feint",
        "Pivot Turn",
        "Roulette Turn",
        "Feint Steps",
        "Attack Waves",
        "2nd Strike",
        "Compact Field",
        "Trick Play",
        "Eye Contact",
        "Vocal Tactics",
        "Marking Transfer",
        "Triangle",
        "Chasing",
        "Intercepting",
        "Impulse Play",
        "Diagonal Run",
        "Wing Attack",
        "Overlapping",
        "Open Space",
        "Rapid Turnaround",
        "Offside Trap",
        "Wing Block",
        "Flowing Football",
        "Total Football",
        "Rush Attack",
        "Open the Gates",
        "Superior Numbers",
        "Holding Ground",
        "Covering",
        "Blocking",
        "Brick Wall",
        "Dogged Marker",
        "Iron Defence",
        "Risky Block",
        "Gutsy Clearance",
        "Deadly Slide",
        "Star Takedown",
        "Tough Midfielder",
        "Relentless Pressure",
        "The Chain",
        "Strategist",
        "Attack Pivot",
        "Control Tower",
        "Star Striker",
        "Goal Sniffer",
        "FK Master",
        "Free Kick Legend",
        "Last Trump",
        "Lucky Chance",
        "Wonder Boy",
        "Pitch Director",
        "Football Professor",
        "Ball Magician",
        "Hard Dynamo",
        "Midfield Maestro",
        "Wild Man",
        "Mood Maker",
        "Trickery",
        "Multitool",
        "Super Sub",
        "Captaincy",
        "Hungry for Glory",
        "Commander",
        "Heart of Steel",
        "Determination",
        "Keen Coaching",
        "Wild Rage",
        "Iron Fist",
        "Team Rally",
        "Team Love",
        "Last Gasp Miracle",
        "Ultra Relaxation",
        "Super-Refreshment",
        "Fan Service",
        "Titanic Goalie (GK)",
        "Super Save (GK)",
        "Desperate Saves (GK)",
        "Goalie Runs Up (GK)",
        "Blind Plane",
        "Rock-A-Bye",
        "Samba Steps",
        "Acrobatics",
        "Golden Feet",
        "Choo-Choo Train"
    ];

    // Sort list
    if (sortMode === "skill") {
        filtered.sort((a, b) => (parseFloat(b["Total skill up"]) || 0) - (parseFloat(a["Total skill up"]) || 0));
    } 
    else if (sortMode === "in-game") {
        // Sort combos according to in-game order outlined above
        filtered.sort((a, b) => {
            const nameA = (a["Combo Name"] || a.ComboName || "").trim();
            const nameB = (b["Combo Name"] || b.ComboName || "").trim();

            const indexA = inGameComboOrder.indexOf(nameA);
            const indexB = inGameComboOrder.indexOf(nameB);

            // Hidden combos (ones not in the defined in-game list) go at the end, alphabetically
            if (indexA === -1 && indexB === -1) return nameA.localeCompare(nameB);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;

            return indexA - indexB;
        });
    }
    else if (sortMode === "custom") {
        filtered = filtered.filter(combo => 
            selectedSkills.some(skill => (parseFloat(combo[skill]) || 0) !== 0)
        );
        filtered.sort((a, b) => getSelectedSkillSum(b, selectedSkills) - getSelectedSkillSum(a, selectedSkills));
    } 
    else {
        filtered.sort((a, b) => {
            const nameA = (a["Combo Name"] || a.ComboName || "").toLowerCase();
            const nameB = (b["Combo Name"] || b.ComboName || "").toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }

    if (filtered.length === 0) {
        resultsDiv.textContent = "No combos match the selected criteria.";
        return;
    }

    const ul = document.createElement("ul");
    ul.style.listStyleType = "none";
    ul.style.paddingLeft = "0";
    filtered.forEach(combo => renderComboItem(combo, ul));
    resultsDiv.appendChild(ul);

    const summary = document.createElement("p");
    let summaryText = `${filtered.length} combos listed`;
    if (selectedType !== "all") summaryText += ` (Type: ${selectedType})`;
    if (sortMode === "skill") summaryText += " (by Total Skill Up)";
    if (sortMode === "in-game") summaryText += " (by In-Game Order)";
    if (sortMode === "custom" && selectedSkills.length > 0)
        summaryText += ` (filtered and sorted by combined ${selectedSkills.join(", ")})`;
    summary.innerHTML = `<strong>${summaryText}</strong>`;
    resultsDiv.appendChild(summary);
}

document.addEventListener("DOMContentLoaded", () => {
    Papa.parse(CSV_FILE, {
        download: true,
        header: true,
        complete: (results) => {
            combos = results.data.filter(row => row["Combo Name"] || row.ComboName);
            renderCombosList("alpha");

            const sortSelect = document.getElementById("sort-select");
            const customControls = document.getElementById("custom-skill-controls");
            const applyBtn = document.getElementById("apply-skill-sort");
            const typeFilter = document.getElementById("type-filter");

            // Track current filters so multiple controls can combine
            let currentSort = "alpha";
            let currentSkills = [];
            let currentType = "all";

            // Sort dropdown
            sortSelect.addEventListener("change", () => {
                currentSort = sortSelect.value;
                customControls.style.display = currentSort === "custom" ? "block" : "none";
                if (currentSort !== "custom")
                    renderCombosList(currentSort, currentSkills, currentType);
            });

            // Type filter dropdown
            typeFilter.addEventListener("change", () => {
                currentType = typeFilter.value;
                renderCombosList(currentSort, currentSkills, currentType);
            });

            // Apply custom skill sort
            applyBtn.addEventListener("click", () => {
                currentSkills = Array.from(
                    document.querySelectorAll('#custom-skill-controls input[type="checkbox"]:checked')
                ).map(cb => cb.value);

                if (currentSkills.length === 0) {
                    alert("Please select at least one skill to sort by.");
                    return;
                }
                renderCombosList("custom", currentSkills, currentType);
            });
        },
        error: (err) => {
            document.getElementById("results").innerText = "Error loading CSV: " + err.message;
        }
    });
});
