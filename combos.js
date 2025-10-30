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

    // Save current input values before rebuilding
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

    // Add category headings and cards
    const addCategoryHeading = (title) => {
        const heading = document.createElement("div");
        heading.textContent = title;
        heading.className = "categoryHeading";
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

    // Filter combos that are fully makeable with current inventory
    const makeableCombos = combos.filter(combo => {
        const cardsNeeded = [combo.card1, combo.card2, combo.card3].filter(c => c && c.trim() !== "");
        return cardsNeeded.every(c => cardCounts[c.trim()] && cardCounts[c.trim()] > 0);
    });

    // Optimize based on mode
    const gkLimitValue = document.getElementById("gkLimitSelect").value;
    const bestSet = maximizeUsage(makeableCombos, cardCounts, mode, gkLimitValue);

    displayResults(bestSet, mode);
}

// mode = "cards" or "skills"
function maximizeUsage(comboList, available, mode = "cards", gkLimit = "none") {
    // Build expanded list with metadata (pre-trim card names)
    const expanded = [];
    comboList.forEach(combo => {
        const required = [combo.card1, combo.card2, combo.card3]
            .filter(c => c && c.trim() !== "")
            .map(c => c.trim());

        if (required.length === 0) return;

        const maxCopies = Math.min(...required.map(c => Math.floor((available[c] || 0) / 1)));

        for (let i = 0; i < maxCopies; i++) {
            expanded.push({
                orig: combo,
                needed: required,
                isGK: ((combo.Category || "").toUpperCase().includes("GK")),
            });
        }
    });

    if (expanded.length === 0) return [];

    // Robust combo value computation
    function comboValue(entry) {
        const c = entry.orig;
        if (mode === "skills") {
            let total = 0;
            const skip = new Set([
                "card1", "card2", "card3",
                "Category", "category",
                "Name", "name",
                "ComboId", "comboId", "ID", "id"
            ]);
            for (const k in c) {
                if (skip.has(k)) continue;
                const v = c[k];
                if (v == null) continue;
                const matches = String(v).match(/[-+]?\d+/g);
                if (matches) {
                    for (const m of matches) {
                        const num = parseInt(m, 10);
                        if (!isNaN(num)) total += num;
                    }
                }
            }
            return Math.max(0, total);
        } else {
            return entry.needed.length;
        }
    }

    expanded.forEach(e => e._value = comboValue(e));
    expanded.sort((a, b) => b._value - a._value);

    const suffixUpper = new Array(expanded.length + 1).fill(0);
    for (let i = expanded.length - 1; i >= 0; i--) {
        suffixUpper[i] = suffixUpper[i + 1] + expanded[i]._value;
    }

    const bestSet = [];
    let bestScore = -Infinity;
    const currentSet = [];
    const counts = {};
    Object.keys(available).forEach(k => counts[k] = available[k]);

    // 🟢 GREEDY SEEDING STEP
    (function greedySeed() {
        const tempCounts = { ...counts };
        let gkUsed = 0;
        const greedySet = [];
        let greedyScore = 0;

        // Sort by value-per-card ratio descending
        const sortedByRatio = [...expanded].sort(
            (a, b) => (b._value / b.needed.length) - (a._value / a.needed.length)
        );

        for (const entry of sortedByRatio) {
            if (gkLimit !== "none" && entry.isGK) {
                const limit = parseInt(gkLimit, 10);
                if (gkUsed >= limit) continue;
            }

            // check if can make with available cards
            let canMake = true;
            for (const card of entry.needed) {
                if (!tempCounts[card] || tempCounts[card] <= 0) {
                    canMake = false;
                    break;
                }
            }
            if (!canMake) continue;

            // use combo
            for (const card of entry.needed) tempCounts[card]--;
            greedySet.push(entry.orig);
            greedyScore += entry._value;
            if (entry.isGK) gkUsed++;
        }

        if (greedyScore > 0) {
            bestScore = greedyScore;
            bestSet.length = 0;
            bestSet.push(...greedySet);
        }
    })();

    // 🔵 BACKTRACKING WITH PRUNING
    function backtrack(idx, currentScore, currentGKCount) {
        if (currentScore + (suffixUpper[idx] || 0) <= bestScore) return;

        if (currentScore > bestScore) {
            bestScore = currentScore;
            bestSet.length = 0;
            for (let i = 0; i < currentSet.length; i++) bestSet.push(currentSet[i].orig);
        }

        for (let i = idx; i < expanded.length; i++) {
            const entry = expanded[i];
            if (currentScore + suffixUpper[i] <= bestScore) break;

            if (gkLimit !== "none" && entry.isGK) {
                const limit = parseInt(gkLimit, 10);
                if (currentGKCount >= limit) continue;
            }

            let canMake = true;
            for (const card of entry.needed) {
                if (!counts[card] || counts[card] <= 0) {
                    canMake = false;
                    break;
                }
            }
            if (!canMake) continue;

            for (const card of entry.needed) counts[card]--;
            currentSet.push(entry);

            const nextGK = currentGKCount + (entry.isGK ? 1 : 0);
            backtrack(i + 1, currentScore + entry._value, nextGK);

            currentSet.pop();
            for (const card of entry.needed) counts[card]++;
        }
    }

    backtrack(0, 0, 0);
    return bestSet;
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

    // Group duplicates
    const comboCounts = {};
    bestCombos.forEach(c => {
        const key = c["Combo Name"];
        comboCounts[key] = comboCounts[key] || { combo: c, count: 0 };
        comboCounts[key].count++;
    });

    Object.values(comboCounts).forEach(({ combo, count }) => {
        const comboName = combo["Combo Name"];
        const div = document.createElement("div");
        div.className = "comboResult";
        div.style.marginBottom = "10px";
        div.style.padding = "8px";
        div.style.borderBottom = "1px solid #ccc";
        div.dataset.comboName = comboName;

        // Remove button
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.className = "removeBtn";
        removeBtn.addEventListener("click", () => {
            div.style.transition = "opacity 0.3s ease";
            div.style.opacity = "0";
            setTimeout(() => div.remove(), 300);
        });

        // Color each card individually
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
            <strong>${comboName}${count > 1 ? ` ×${count}` : ""}</strong> 
            (${combo.Category})<br>
            Cards: ${cardElements}<br>
            Total Skill Up: ${combo["Total skill up"]}<br>
            ${skillUps.map(([name, val]) => `${name}: +${val}`).join(", ")}
        `;

        div.appendChild(removeBtn);
        resultsDiv.appendChild(div);
    });

    // Totals
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
