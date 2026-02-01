/**
 * STUDY DISCIPLINE SYSTEM CORE LOGIC
 * Manages Master Pool and Category Timers
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // If using Auth
import { getFirestore } from "firebase/firestore"; // If using Firestore

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "study-system-29.firebaseapp.com",
  databaseURL: "https://study-system-29-default-rtdb.firebaseio.com",
  projectId: "study-system-29",
  storageBucket: "study-system-29.firebasestorage.app",
  messagingSenderId: "407118949554",
  appId: "1:407118949554:web:17eeecc4c20db90da22dab"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services to use them in other files
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

const CONFIG = {
    masterInitial: 210 * 60, // 3.5 hours in seconds
    categories: [
        { id: 'bath', name: 'Bath', limit: 30 * 60, overflow: true },
        { id: 'food', name: 'Food', limit: 15 * 60, sessions: 3, overflow: true },
        { id: 'wash', name: 'Washroom', limit: 15 * 60, sessions: 2, overflow: true },
        { id: 'sleep', name: 'Sleep', limit: 7 * 3600, overflow: false },
        { id: 'buffer', name: 'Buffer', limit: 20 * 60, overflow: true }
    ]
};

class DisciplineSystem {
    constructor() {
        this.isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';
        this.state = this.loadState();
        this.activeTimer = null;
        this.init();
    }

    /** Initialize UI and Permissions */
    init() {
        if (this.isAdmin) document.body.classList.add('is-admin');
        this.renderTimers();
        this.renderCoupons();
        this.updateMasterDisplay();
        this.startHeartbeat();
    }

    /** Load data from LocalStorage or Default */
    loadState() {
        const saved = localStorage.getItem('studySystemState');
        if (saved) return JSON.parse(saved);
        
        return {
            masterSeconds: CONFIG.masterInitial,
            timers: CONFIG.categories.reduce((acc, cat) => {
                acc[cat.id] = { elapsed: 0, sessionsLeft: cat.sessions || 999 };
                return acc;
            }, {}),
            coupons: [],
            logs: []
        };
    }

    save() {
        localStorage.setItem('studySystemState', JSON.stringify(this.state));
    }

    /** Centralized Clock Runner */
    startHeartbeat() {
        setInterval(() => {
            if (this.activeTimer) {
                const cat = CONFIG.categories.find(c => c.id === this.activeTimer);
                const timerData = this.state.timers[this.activeTimer];
                
                timerData.elapsed++;

                // Overflow Logic: If exceeds limit, deduct from master
                if (cat.overflow && timerData.elapsed > cat.limit) {
                    this.state.masterSeconds--;
                }

                this.updateUI(this.activeTimer);
                this.updateMasterDisplay();
                this.save();
            }
        }, 1000);
    }

    /** Render Timer Blocks Dynamically */
    renderTimers() {
        const container = document.getElementById('timer-container');
        container.innerHTML = CONFIG.categories.map(cat => `
            <div class="glass-card timer-block" id="block-${cat.id}">
                <h3>${cat.name}</h3>
                <div class="progress-ring">
                    <svg width="120" height="120">
                        <circle class="circle-bg" cx="60" cy="60" r="54"/>
                        <circle id="ring-${cat.id}" class="circle-proc" cx="60" cy="60" r="54" 
                            stroke-dasharray="339.29" stroke-dashoffset="339.29"/>
                    </svg>
                    <div class="time-display" id="display-${cat.id}">00:00</div>
                </div>
                <div class="controls">
                    <button class="btn btn-primary" onclick="system.toggleTimer('${cat.id}')" id="btn-${cat.id}">Start</button>
                    <div class="admin-only">
                        <input type="number" id="inject-${cat.id}" placeholder="+Min">
                        <button class="btn" onclick="system.injectTime('${cat.id}')">Add</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /** Logic for Start/Pause */
    toggleTimer(id) {
        if (this.activeTimer === id) {
            this.activeTimer = null;
            document.getElementById(`btn-${id}`).innerText = 'Start';
            this.log(`Paused ${id}`);
        } else {
            if (this.activeTimer) {
                document.getElementById(`btn-${this.activeTimer}`).innerText = 'Start';
            }
            this.activeTimer = id;
            document.getElementById(`btn-${id}`).innerText = 'Pause';
            this.log(`Started ${id}`);
        }
    }

    /** Admin Time Injection */
    injectTime(id) {
        const mins = parseInt(document.getElementById(`inject-${id}`).value);
        if (isNaN(mins)) return;
        this.state.timers[id].elapsed += (mins * 60);
        this.updateUI(id);
        this.save();
    }

    /** Visual Update per Timer */
    updateUI(id) {
        const cat = CONFIG.categories.find(c => c.id === id);
        const elapsed = this.state.timers[id].elapsed;
        const display = document.getElementById(`display-${id}`);
        const ring = document.getElementById(`ring-${id}`);

        // Format Time
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        display.innerText = `${m}:${s.toString().padStart(2, '0')}`;

        // Ring Progress (based on limit)
        const percent = Math.min(elapsed / cat.limit, 1);
        const offset = 339.29 - (percent * 339.29);
        ring.style.strokeDashoffset = offset;
        
        // Color Change on Overflow
        ring.style.stroke = (elapsed > cat.limit && cat.overflow) ? 'var(--danger)' : 'var(--accent)';
    }

    updateMasterDisplay() {
        const m = Math.floor(this.state.masterSeconds / 60);
        const s = Math.abs(this.state.masterSeconds % 60);
        document.getElementById('master-clock').innerText = `${m}:${s.toString().padStart(2, '0')}`;
        if (this.state.masterSeconds < 0) document.getElementById('master-clock').style.color = 'var(--danger)';
    }

    /** Coupon Logic */
    createCoupon() {
        const name = document.getElementById('cpn-name').value;
        const val = parseInt(document.getElementById('cpn-value').value);
        if (!name || isNaN(val)) return;

        this.state.coupons.push({ name, val, redeemed: false });
        this.save();
        this.renderCoupons();
    }

    redeem(index) {
        const cpn = this.state.coupons[index];
        if (cpn.redeemed) return;

        this.state.masterSeconds += (cpn.val * 60);
        cpn.redeemed = true;
        this.log(`Redeemed ${cpn.name}`);
        this.save();
        this.renderCoupons();
        this.updateMasterDisplay();
    }

    renderCoupons() {
        const list = document.getElementById('coupon-list');
        list.innerHTML = this.state.coupons.map((c, i) => `
            <div class="glass-card" style="border-color: ${c.redeemed ? 'transparent' : 'var(--success)'}">
                <h4>${c.name}</h4>
                <p>+${c.val} Minutes</p>
                <button class="btn btn-primary" ${c.redeemed ? 'disabled' : ''} 
                    onclick="system.redeem(${i})">${c.redeemed ? 'Used' : 'Redeem'}</button>
            </div>
        `).join('');
    }

    log(msg) {
        const entry = `${new Date().toLocaleTimeString()}: ${msg}`;
        this.state.logs.unshift(entry);
        const logDiv = document.getElementById('activity-log');
        logDiv.innerHTML = this.state.logs.map(l => `<div>${l}</div>`).join('');
    }

    resetDay() {
        if (!confirm("Are you sure? This clears all progress.")) return;
        localStorage.removeItem('studySystemState');
        window.location.reload();
    }
}

const system = new DisciplineSystem();

import { ref, onValue } from "firebase/database";
import { db } from "./firebase"; // your config file

const dataRef = ref(db, 'path/to/data');
onValue(dataRef, (snapshot) => {
  const data = snapshot.val();
  updateUI(data); // This runs EVERY time the admin changes data
});
