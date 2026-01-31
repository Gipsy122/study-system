/**
 * TIMESTRUCTURE AND STATE
 */
let isAdmin = true;
let globalBreakMinutes = 210; // 3.5 Hours
let coupons = [];

const activities = [
    { id: 'bath', name: 'Bath', limit: 30, current: 30, running: false },
    { id: 'food', name: 'Food', limit: 15, current: 15, running: false },
    { id: 'wash', name: 'Washroom', limit: 15, current: 15, running: false },
    { id: 'sleep', name: 'Sleep', limit: 420, current: 420, running: false }, // 7 hours
    { id: 'buffer', name: 'Study Buffer', limit: 20, current: 20, running: false },
    { id: 'fun', name: 'Weekly Fun', limit: 60, current: 60, running: false }
];

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    setupRoleToggle();
    renderActivities();
    startMasterClock();
});

function setupRoleToggle() {
    const switcher = document.getElementById('roleSwitch');
    const label = document.getElementById('modeLabel');
    
    switcher.addEventListener('change', (e) => {
        isAdmin = e.target.checked;
        label.innerText = isAdmin ? "Admin Mode" : "User Mode";
        document.body.className = isAdmin ? "admin-mode" : "user-mode";
        renderActivities(); // Re-render to hide/show buttons
    });
    // Default
    document.body.className = "admin-mode";
}

/**
 * CORE TIMER LOGIC
 */
function startMasterClock() {
    setInterval(() => {
        activities.forEach(act => {
            if (act.running && act.current > -10000) { // arbitrary lower limit
                act.current -= (1 / 60); // Subtract 1 second in minute units
                
                // If we exceed the limit (current goes below 0), deduct from global
                if (act.current < 0) {
                    globalBreakMinutes -= (1 / 60);
                }
            }
        });
        updateUI();
    }, 1000);
}

function updateUI() {
    // Update Global Timer
    const globalDisplay = document.getElementById('globalTimer');
    globalDisplay.innerText = formatTime(globalBreakMinutes);
    if (globalBreakMinutes < 0) globalDisplay.style.color = "var(--danger)";

    // Update Activity Rings
    activities.forEach(act => {
        const ring = document.getElementById(`ring-${act.id}`);
        const text = document.getElementById(`text-${act.id}`);
        if (ring && text) {
            text.innerText = formatTime(act.current);
            
            // Calculate SVG Offset
            // (Offset 339.29 is circumference for r=54)
            const circumference = 339.29;
            const progress = Math.max(0, act.current) / act.limit;
            const offset = circumference - (progress * circumference);
            ring.style.strokeDashoffset = offset;

            // Change color if overtime
            if (act.current < 0) {
                ring.classList.add('overtime');
                text.style.color = "var(--danger)";
            } else {
                ring.classList.remove('overtime');
                text.style.color = "var(--text)";
            }
        }
    });
}

function formatTime(minutes) {
    const isNeg = minutes < 0;
    const absMin = Math.abs(minutes);
    const m = Math.floor(absMin);
    const s = Math.floor((absMin % 1) * 60);
    return `${isNeg ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * ACTIVITY ACTIONS
 */
function renderActivities() {
    const grid = document.getElementById('activitiesGrid');
    grid.innerHTML = '';

    activities.forEach(act => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${act.name}</h3>
            <div style="position:relative; display:flex; justify-content:center;">
                <svg class="timer-svg">
                    <circle class="bg-circle" cx="60" cy="60" r="54"></circle>
                    <circle id="ring-${act.id}" class="progress-circle" cx="60" cy="60" r="54" 
                        stroke-dasharray="339.29" stroke-dashoffset="0"></circle>
                </svg>
                <div id="text-${act.id}" class="card-timer-text">00:00</div>
            </div>
            
            <div class="controls admin-controls">
                <button class="btn-start" onclick="toggleTimer('${act.id}')">${act.running ? 'Pause' : 'Start'}</button>
                <button class="btn-reset" onclick="resetTimer('${act.id}')">Reset</button>
            </div>

            <div class="manual-input admin-controls">
                <input type="number" id="input-${act.id}" placeholder="Min">
                <button onclick="addManualTime('${act.id}')">Add</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function toggleTimer(id) {
    const act = activities.find(a => a.id === id);
    act.running = !act.running;
    renderActivities();
}

function resetTimer(id) {
    const act = activities.find(a => a.id === id);
    act.current = act.limit;
    act.running = false;
    renderActivities();
}

function addManualTime(id) {
    const act = activities.find(a => a.id === id);
    const val = parseFloat(document.getElementById(`input-${id}`).value);
    if (!isNaN(val)) {
        // Adding time in this context means fast-forwarding the countdown
        act.current -= val;
        // If the jump causes immediate overtime
        if (act.current < 0) {
            const overflow = Math.abs(act.current);
            // In a real scenario, we'd decide if previous overflow was already deducted
            // For this logic, we just let the master clock handle the live deduction
        }
    }
}

/**
 * COUPON SYSTEM
 */
function createCoupon() {
    const name = document.getElementById('cpnName').value;
    const val = parseInt(document.getElementById('cpnValue').value);
    
    if (name && val) {
        const coupon = {
            id: Date.now(),
            name: name,
            value: val,
            used: false
        };
        coupons.push(coupon);
        renderCoupons();
    }
}

function renderCoupons() {
    const list = document.getElementById('couponList');
    list.innerHTML = '';
    
    coupons.forEach(cpn => {
        if (cpn.used) return;
        const div = document.createElement('div');
        div.className = 'coupon-card';
        div.innerHTML = `
            <h4>${cpn.name}</h4>
            <p>+${cpn.value} Minutes</p>
            <button class="btn-start" onclick="redeemCoupon(${cpn.id})">Redeem</button>
        `;
        list.appendChild(div);
    });
}

function redeemCoupon(id) {
    const cpn = coupons.find(c => c.id === id);
    if (cpn && !cpn.used) {
        globalBreakMinutes += cpn.value;
        cpn.used = true;
        renderCoupons();
        updateUI();
        alert(`Redeemed: ${cpn.name}. Global time increased by ${cpn.value} mins.`);
    }
}
