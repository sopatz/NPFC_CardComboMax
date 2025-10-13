const CSV_FILE = "NPFC Combos.csv";

let combos = [];
let uniqueCards = new Set();

document.addEventListener("DOMContentLoaded", () => {
    Papa.parse(CSV_FILE, {
        download: true,
        header: true,
        complete: (results) => {
            combos = results.data.filter(row => row["Combo Name"] || row.ComboName);
            extractCards();
            buildCardInputs();
        },
        error: (err) => {
            document.getElementById("cardList").innerText = "Error loading CSV: " + err.message;
        }
    });
    document.getElementById("sortSelect").addEventListener("change", buildCardInputs);
    document.getElementById("findCombosBtn").addEventListener("click", findCombos);
    document.getElementById("resetBtn").addEventListener("click", resetCards);
});

function extractCards() {
    combos.forEach(combo => {
        ["card1", "card2", "card3"].forEach(key => {
            const card = combo[key]?.trim();
            if (card) uniqueCards.add(card);
        });
    });
}

function buildCardInputs() {
    const container = document.getElementById("cardList");

    // --- Save current input values before rebuilding ---
    const savedValues = {};
    document.querySelectorAll("#cardList input").forEach(input => {
        const cardName = input.id.replace(/^card-/, "").replace(/_/g, " ");
        savedValues[cardName] = input.value;
    });

    container.innerHTML = "";

    const sortMode = document.getElementById("sortSelect")?.value || "alpha";
    let sortedCards = Array.from(uniqueCards);

    // Category definitions (must match getCardColor)
    const categories = {
        "Tactical": ["Analysis", "Marking", "Pressuring", "Countering", "Mini-Game", "Line Control", "Set Plays"],
        "Technical": ["Dribbling", "Place Kicks", "Shooting", "Passing", "Freestyling", "Sliding", "Heading"],
        "Physical": ["Running", "Weights", "Kicking", "Sprinting", "Agility", "Aerobics", "Stretching"],
        "Support": ["Oil Therapy", "Meditation", "Signing", "PK Practice", "Judo", "Visualising", "Meeting", "Spa", "Mini-Camp", "Gaming", "Karaoke"]
    };

    // Determine order based on selected mode
    if (sortMode === "color") {
        const categorized = [];
        for (const arr of Object.values(categories)) {
            categorized.push(...arr.filter(c => sortedCards.includes(c)));
        }
        const uncategorized = sortedCards.filter(c => !categorized.includes(c));
        sortedCards = [...categorized, ...uncategorized];
    } else {
        sortedCards.sort();
    }

    // --- Add category headings and cards ---
    const addCategoryHeading = (title) => {
        const heading = document.createElement("div");
        heading.textContent = title;
        heading.style.fontWeight = "bold";
        heading.style.fontSize = "1.05em";
        heading.style.margin = "16px 92px 4px 12px";
        heading.style.padding = "4px 8px";
        heading.style.backgroundColor = "#e8e8e8";
        heading.style.borderRadius = "4px";
        heading.style.textAlign = "center";
        container.appendChild(heading);
    };

    if (sortMode === "color") {
        for (const [title, cards] of Object.entries(categories)) {
            const filtered = cards.filter(c => sortedCards.includes(c));
            if (filtered.length > 0) {
                addCategoryHeading(title);
                filtered.forEach(card => container.appendChild(createCardInput(card, savedValues[card])));
            }
        }

        // Add uncategorized section (if any)
        const uncategorized = sortedCards.filter(c =>
            !Object.values(categories).some(list => list.includes(c))
        );
        if (uncategorized.length > 0) {
            addCategoryHeading("Other Cards");
            uncategorized.forEach(card => container.appendChild(createCardInput(card, savedValues[card])));
        }
    } else {
        sortedCards.forEach(card => container.appendChild(createCardInput(card, savedValues[card])));
    }
}

function createCardInput(card, savedValue = "0") {
    const div = document.createElement("div");
    div.className = "cardItem";

    const label = document.createElement("label");
    label.textContent = card;

    const color = getCardColor(card);
    label.style.backgroundColor = color.bg;
    label.style.color = color.text;
    label.style.padding = "4px 8px";
    label.style.borderRadius = "4px";
    label.style.marginRight = "10px";
    label.style.minWidth = "140px";
    label.style.textAlign = "center";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "10";
    input.value = savedValue;
    input.id = `card-${card.replace(/\s+/g, "_")}`;

    div.appendChild(label);
    div.appendChild(input);

    return div;
}

// Helper function to assign colors by card category
function getCardColor(cardName) {
    const tactical = ["Analysis", "Marking", "Pressuring", "Countering", "Mini-Game", "Line Control", "Set Plays"];
    const technical = ["Dribbling", "Place Kicks", "Shooting", "Passing", "Freestyling", "Sliding", "Heading"];
    const physical = ["Running", "Weights", "Kicking", "Sprinting", "Agility", "Aerobics", "Stretching"];
    const support = ["Oil Therapy", "Meditation", "Signing", "PK Practice", "Judo", "Visualising", "Meeting", "Spa", "Mini-Camp", "Gaming", "Karaoke"];

    const name = cardName.trim();

    if (tactical.includes(name))
        return { bg: "#c9f5c4", text: "#2f5b2f" }; // green
    if (technical.includes(name))
        return { bg: "#ffcaca", text: "#661a1a" }; // red
    if (physical.includes(name))
        return { bg: "#cae1ff", text: "#1a3b66" }; // blue
    if (support.includes(name))
        return { bg: "#fff5c2", text: "#665c1a" }; // yellow

    // Default (if card not categorized)
    return { bg: "#eaeaea", text: "#333" };
}


function findCombos() {
    const cardCounts = {};
    document.querySelectorAll("#cardList input").forEach(input => {
        const count = parseInt(input.value);
        if (count > 0) {
            const cardName = input.id.replace(/^card-/, "").replace(/_/g, " ");
            cardCounts[cardName] = count;
        }
    });

    // Read optimization mode
    const mode = document.querySelector('input[name="optMode"]:checked').value;

    // Step 1: Filter combos that are fully makeable with current inventory
    const makeableCombos = combos.filter(combo => {
        const cardsNeeded = [combo.card1, combo.card2, combo.card3].filter(c => c && c.trim() !== "");
        return cardsNeeded.every(c => cardCounts[c.trim()] && cardCounts[c.trim()] > 0);
    });

    // Step 2: Optimize based on mode
    const gkLimitValue = document.getElementById("gkLimitSelect").value;
    const bestSet = maximizeUsage(makeableCombos, cardCounts, mode, gkLimitValue);

    displayResults(bestSet, mode);
}

// mode = "cards" or "skills"
function maximizeUsage(comboList, available, mode = "cards", gkLimit = "none") {
    // Step 1: Expand combos based on how many copies can be made
    const expanded = [];
    comboList.forEach(combo => {
        const required = [combo.card1, combo.card2, combo.card3].filter(c => c && c.trim() !== "");
        const maxCopies = Math.min(...required.map(c => Math.floor((available[c.trim()] || 0) / 1)));
        for (let i = 0; i < maxCopies; i++) {
            expanded.push({ ...combo });
        }
    });

    // Step 2: Backtracking search on expanded list
    let best = [];
    let bestScore = 0;

    function backtrack(startIndex, currentSet, remainingCounts) {
        const score = (mode === "skills")
            ? totalSkillPoints(currentSet)
            : totalCardsUsed(currentSet);

        if (score > bestScore) {
            bestScore = score;
            best = [...currentSet];
        }

        for (let i = startIndex; i < expanded.length; i++) {
            const combo = expanded[i];
            const needed = [combo.card1, combo.card2, combo.card3].filter(c => c && c.trim() !== "");

            // Check if we have enough remaining cards for another copy
            if (needed.every(c => remainingCounts[c.trim()] && remainingCounts[c.trim()] > 0)) {
                // --- GK limit check ---
                if (gkLimit !== "none") {
                    const gkCount = currentSet.filter(c => (c.Category || "").toUpperCase().includes("GK")).length;
                    const nextIsGK = (combo.Category || "").toUpperCase().includes("GK");
                    const limitNum = parseInt(gkLimit);
                    if (nextIsGK && gkCount >= limitNum) {
                        continue; // skip if adding this GK combo would exceed limit
                    }
                }
                const nextCounts = { ...remainingCounts };
                needed.forEach(c => nextCounts[c.trim()] -= 1);
                backtrack(i + 1, [...currentSet, combo], nextCounts);
            }
        }
    }

    backtrack(0, [], { ...available });
    return best;
}

function totalCardsUsed(comboSet) {
    let count = 0;
    comboSet.forEach(c => {
        const cards = [c.card1, c.card2, c.card3].filter(x => x && x.trim() !== "");
        count += cards.length;
    });
    return count;
}

function totalSkillPoints(comboSet) {
    let total = 0;
    comboSet.forEach(c => {
        const val = parseFloat(c["Total skill up"] || c.TotalSkillUp || c["Total Skill Up"]);
        if (!isNaN(val)) total += val;
    });
    return total;
}

function resetCards() {
    document.querySelectorAll("#cardList input").forEach(input => {
        input.value = "0";
    });

    // Optional: clear the results area too
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";
}

function displayResults(bestCombos, mode) {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";

    if (bestCombos.length === 0) {
        resultsDiv.textContent = "No full combos can be made with your current cards.";
        return;
    }

    // --- Group duplicates ---
    const comboCounts = {};
    bestCombos.forEach(c => {
        const key = c["Combo Name"];
        comboCounts[key] = comboCounts[key] || { combo: c, count: 0 };
        comboCounts[key].count++;
    });

    Object.values(comboCounts).forEach(({ combo, count }) => {
        const div = document.createElement("div");
        div.className = "comboResult";
        div.style.marginBottom = "10px";
        div.style.padding = "8px";
        div.style.borderBottom = "1px solid #ccc";

        // --- Color each card individually ---
        const cardElements = [combo.card1, combo.card2, combo.card3]
            .filter(x => x && x.trim() !== "")
            .map(cardName => {
                const color = getCardColor(cardName);
                return `<span style="
                    background-color:${color.bg};
                    color:${color.text};
                    padding:2px 6px;
                    border-radius:4px;
                    margin-right:4px;
                    display:inline-block;
                ">${cardName}</span>`;
            })
            .join("");

        const skillUps = [
            ["Kicking", combo.Kicking],
            ["Speed", combo.Speed],
            ["Stamina", combo.Stamina],
            ["Technique", combo.Technique],
            ["Toughness", combo.Toughness],
            ["Jumping", combo.Jumping],
            ["Willpower", combo.Willpower]
        ].filter(([name, val]) => val && val !== "");

        div.innerHTML = `
            <strong>${combo["Combo Name"]}${count > 1 ? ` ×${count}` : ""}</strong> 
            (${combo.Category})<br>
            Cards: ${cardElements}<br>
            Total Skill Up: ${combo["Total skill up"]}<br>
            ${skillUps.map(([name, val]) => `${name}: +${val}`).join(", ")}
        `;
        resultsDiv.appendChild(div);
    });

    // --- Totals ---
    const total = {
        Kicking: 0, Speed: 0, Stamina: 0, Technique: 0,
        Toughness: 0, Jumping: 0, Willpower: 0
    };
    bestCombos.forEach(c => {
        for (let key in total) {
            const val = parseFloat(c[key]) || 0;
            total[key] += val;
        }
    });

    const totalSkillsText = Object.entries(total)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${k}: +${v}`)
        .join(", ");

    const summary = document.createElement("p");
    const modeText = mode === "skills"
        ? `Best combo set gives a total of ${totalSkillPoints(bestCombos)} skill points across ${bestCombos.length} combos.`
        : `Best combo set uses ${totalCardsUsed(bestCombos)} cards across ${bestCombos.length} combos.`;

    summary.innerHTML = `<strong>${modeText}</strong><br><em>Total skill increases:</em> ${totalSkillsText}`;
    resultsDiv.appendChild(summary);
}
