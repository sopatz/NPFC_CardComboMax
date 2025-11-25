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
    input.max = "9";
    input.value = savedValue;
    input.id = `card-${card.replace(/\s+/g, "_")}`;

    input.addEventListener("input", () => {
        if (input.value > 9) input.value = 9;
        if (input.value < 0) input.value = 0;
    });

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
function maximizeUsage(comboList, available, mode = "combos", gkLimit = "none") {
    // Normalize GK limit
    const GK_LIMIT = (gkLimit === "none") ? Infinity : parseInt(gkLimit, 10);

    // Prepare a list of combos as objects { orig, neededArray, isGK, value, neededCountsMap, maxCopies }
    // Also collect all relevant card names
    const cardIndexMap = {}; // maps card name -> index
    let cardIdxCounter = 0;

    const combosPrepared = [];
    comboList.forEach(combo => {
        const req = [combo.card1, combo.card2, combo.card3]
            .filter(c => c && c.trim() !== "")
            .map(c => c.trim());
        if (req.length === 0) return;

        // count needed per card for this combo (most combos are 1 each, but keep generic)
        const needCounts = {};
        for (const c of req) needCounts[c] = (needCounts[c] || 0) + 1;

        // fill card index map
        for (const c of Object.keys(needCounts)) {
            if (!(c in cardIndexMap)) {
                cardIndexMap[c] = cardIdxCounter++;
            }
        }

        const isGK = ((combo.Category || "").toUpperCase().includes("GK"));

        combosPrepared.push({
            orig: combo,
            needed: Object.keys(needCounts),
            needCounts,
            isGK,
            _value: 0, // compute below based on mode
        });
    });

    if (combosPrepared.length === 0) return [];

    // compute _value for each prepared combo
    combosPrepared.forEach(entry => {
        // sum numeric fields for skill increase print out
        if (mode === "skills") {
            const c = entry.orig;
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
            entry._value = Math.max(0, total);
        } else {
            entry._value = 1;
        }
    });

    // Precompute starting available counts array only for cards that are used in combos
    const Ncards = Object.keys(cardIndexMap).length;
    const startCounts = new Array(Ncards).fill(0);
    for (const [card, idx] of Object.entries(cardIndexMap)) {
        startCounts[idx] = available[card] || 0;
    }

    // Precompute maxCopies per combo based on initial available (upper bound)
    combosPrepared.forEach(entry => {
        let maxCopies = Infinity;
        for (const card of entry.needed) {
            const need = entry.needCounts[card] || 1;
            const avail = startCounts[cardIndexMap[card]] || 0;
            maxCopies = Math.min(maxCopies, Math.floor(avail / need));
        }
    });

    // Sort combos by value-per-card (descending) to get better pruning and fractional upper bound calculations
    combosPrepared.sort((a, b) => {
        const aCost = a.needed.length;
        const bCost = b.needed.length;

        const aRatio = (a._value / aCost) || 0;
        const bRatio = (b._value / bCost) || 0;

        const diffRatio = bRatio - aRatio;
        if (diffRatio !== 0) return diffRatio;

        const diffValue = b._value - a._value;
        if (diffValue !== 0) return diffValue;

        // tie → random
        return Math.random() < 0.5 ? -1 : 1;
    });


    // helper: compute optimistic fractional upper bound from given idx and current counts
    function fractionalUpperBound(idx, countsArr, currentGK) {
        let bound = 0;
        const tempCounts = countsArr.slice();
        let gkRemaining = GK_LIMIT - currentGK;
        for (let i = idx; i < combosPrepared.length; i++) {
            const e = combosPrepared[i];
            // how many full copies can we still make given tempCounts
            let possibleCopies = Infinity;
            for (const card of e.needed) {
                const need = e.needCounts[card] || 1;
                const avail = tempCounts[cardIndexMap[card]] || 0;
                possibleCopies = Math.min(possibleCopies, Math.floor(avail / need));
            }
            if (!isFinite(possibleCopies) || possibleCopies <= 0) {
                // can't make a full copy now: skip
                continue;
            }
            if (e.isGK) {
                // only up to gkRemaining full copies allowed
                possibleCopies = Math.min(possibleCopies, gkRemaining);
            }
            // greedily take as many full copies as possible
            if (possibleCopies > 0) {
                bound += possibleCopies * e._value;
                for (const card of e.needed) {
                    const need = e.needCounts[card] || 1;
                    tempCounts[cardIndexMap[card]] -= possibleCopies * need;
                }
                if (e.isGK) gkRemaining -= possibleCopies;
            }
        }
        // Fractional relaxation: try to add a fractional piece from the remaining sorted items
        // Tends to help pruning slightly
        for (let i = idx; i < combosPrepared.length; i++) {
            const e = combosPrepared[i];
            // compute a small fractional availability (sum minimal remaining fraction across its needed cards)
            let minFrac = Infinity;
            for (const card of e.needed) {
                const need = e.needCounts[card] || 1;
                const avail = tempCounts[cardIndexMap[card]] || 0;
                minFrac = Math.min(minFrac, avail / need);
            }
            if (minFrac > 0 && minFrac < 1) {
                // contribution is ratio * minFrac
                const cost = e.needed.reduce((s, c) => s + (e.needCounts[c] || 1), 0);
                const ratio = (e._value / cost) || 0;
                bound += ratio * cost * minFrac;
                break;
            }
        }
        return bound;
    }

    // Memoization map: key -> bestAdditionalScore (store best total score achieved from this state)
    const memo = new Map();

    // DFS that branches on counts of each combo (0..maxCopiesPossible)
    const bestSetRes = { score: -Infinity, set: [] };
    const currentChoiceStack = [];

    function countsKey(idx, countsArr, gkCount) {
        // create compact key using only counts for cards involved
        return idx + '|' + gkCount + '|' + countsArr.join(',');
    }

    function dfs(idx, countsArr, currentScore, gkCount) {
        // compute memo key
        const key = countsKey(idx, countsArr, gkCount);
        if (memo.has(key) && memo.get(key) >= currentScore) {
            // been here with at least this score already
            return;
        }
        memo.set(key, currentScore);

        // update best
        if (currentScore > bestSetRes.score) {
            bestSetRes.score = currentScore;
            bestSetRes.set = currentChoiceStack.slice();
        }

        if (idx >= combosPrepared.length) return;

        // optimistic upper bound (currentScore + fractional bound)
        const ub = currentScore + fractionalUpperBound(idx, countsArr, gkCount);
        if (ub <= bestSetRes.score) {
            return; // prune
        }

        const e = combosPrepared[idx];

        // compute maximum possible copies of e given countsArr and GK limit
        let maxPossible = Infinity;
        for (const card of e.needed) {
            const need = e.needCounts[card] || 1;
            const avail = countsArr[cardIndexMap[card]] || 0;
            maxPossible = Math.min(maxPossible, Math.floor(avail / need));
        }
        if (!isFinite(maxPossible) || maxPossible <= 0) {
            // can't take any, skip to next
            dfs(idx + 1, countsArr, currentScore, gkCount);
            return;
        }
        if (e.isGK) {
            maxPossible = Math.min(maxPossible, GK_LIMIT - gkCount);
            if (maxPossible <= 0) {
                dfs(idx + 1, countsArr, currentScore, gkCount);
                return;
            }
        }

        // iterate choices in descending order (try to take as many as possible first to find good solutions quickly)
        for (let take = maxPossible; take >= 0; take--) {
            if (take > 0) {
                // apply the choice: decrement counts
                for (const card of e.needed) {
                    const need = e.needCounts[card] || 1;
                    countsArr[cardIndexMap[card]] -= need * take;
                }
                if (e.isGK) gkCount += take;
                currentChoiceStack.push({ combo: e.orig, copies: take });
                const addedScore = take * e._value;
                dfs(idx + 1, countsArr, currentScore + addedScore, gkCount);
                // undo
                currentChoiceStack.pop();
                if (e.isGK) gkCount -= take;
                for (const card of e.needed) {
                    const need = e.needCounts[card] || 1;
                    countsArr[cardIndexMap[card]] += need * take;
                }
            } else {
                // take === 0, skip this combo
                dfs(idx + 1, countsArr, currentScore, gkCount);
            }

            // small micro-optimization: if best is already >= currentScore + maxPossible*value, break early
            if (bestSetRes.score >= currentScore + maxPossible * e._value) {
                // already found as-good-or-better solution without exploring smaller take values
                break;
            }
        }
    }

    // start search
    dfs(0, startCounts.slice(), 0, 0);

    const finalList = [];
    for (const item of bestSetRes.set) {
        for (let i = 0; i < item.copies; i++) finalList.push(item.combo);
    }
    return finalList;
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

    // Helper to read numeric "Total skill up" (supports several possible field names)
    function getComboTotalSkillUp(combo) {
        const raw = combo["Total skill up"] ?? combo.TotalSkillUp ?? combo["Total Skill Up"] ?? 0;
        const n = parseFloat(raw);
        return isNaN(n) ? 0 : n;
    }

    // Convert grouped object to array and sort by total skill up (descending),
    // tie-break by count (descending), then combo name (asc)
    const grouped = Object.values(comboCounts);
    grouped.sort((a, b) => {
        const aVal = getComboTotalSkillUp(a.combo);
        const bVal = getComboTotalSkillUp(b.combo);
        if (bVal !== aVal) return bVal - aVal;
        if (b.count !== a.count) return b.count - a.count;
        const aName = (a.combo["Combo Name"] || "").toString();
        const bName = (b.combo["Combo Name"] || "").toString();
        return aName.localeCompare(bName);
    });

    grouped.forEach(({ combo, count }) => {
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
        ].filter(([name, val]) => val != null && val !== "")
            .map(([name, val]) => [name, Number(val)]);

        div.innerHTML = `
            <strong>${comboName}${count > 1 ? ` ×${count}` : ""}</strong> 
            (${combo.Category})<br>
            Cards: ${cardElements}<br>
            Total Skill Up: ${combo["Total skill up"]}<br>
            ${skillUps.map(([name, val]) => `${name}: ${val > 0 ? '+' + val : val}`).join(", ")}
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
        .filter(([_, v]) => v !== 0)
        .map(([k, v]) => `${k}: ${v > 0 ? '+' + v : v}`)
        .join(", ");

    const summary = document.createElement("p");
    const modeText = `Best combo set gives a total of ${totalSkillPoints(bestCombos)} skill points across ${bestCombos.length} combos and ${totalCardsUsed(bestCombos)} cards.`

    summary.innerHTML = `<strong>${modeText}</strong><br><em>Total skill increases:</em> ${totalSkillsText}`;
    resultsDiv.appendChild(summary);
}
