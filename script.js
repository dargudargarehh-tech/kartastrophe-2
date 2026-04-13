const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
const bgOverlay = document.getElementById('bg-overlay'), gameOver = document.getElementById('game-over'), ui = document.getElementById('ui-layer');
const startBtn = document.getElementById('start-btn'), retryBtn = document.getElementById('retry-btn'), titleBtn = document.getElementById('title-btn');

let gameActive = false, width, height, distance = 0, maxDist = 0, camX = 0;
let player, rivals, platforms, bolts, boss, mission, keys = {};

function resize() { 
    width = canvas.width = window.innerWidth; 
    height = canvas.height = window.innerHeight; 
}
window.addEventListener("resize", resize); resize();

function createMission() {
    const types = [
        { text: "Air Time x10", goal: 10, count: 0, type: "jump" }, 
        { text: "Reach 1500m", goal: 1500, type: "dist" }
    ];
    mission = { ...types[Math.floor(Math.random() * types.length)] };
}

function init() {
    player = { x: 100, y: 200, w: 70, h: 22, vx: 0, vy: 0, accel: 0.22, friction: 0.96, jump: -15, alive: true, jumps: 0, color: '#00ffcc' };
    rivals = ['#ffcc00', '#ff3366', '#a033ff', '#33ff57'].map((c, i) => ({
        x: -150 * i, y: 200, w: 70, h: 22, vx: Math.random() * 2 + 6, vy: 0, color: c, grounded: false, jumps: 0
    }));
    boss = { x: 0, y: 0, w: 120, h: 120, hp: 150, maxHp: 150, alive: false, t: 0 };
    platforms = []; bolts = []; distance = 0; camX = 0;
    for (let i = 0; i < 15; i++) platforms.push({ x: i * 600, y: 350 + Math.random() * 150, w: 450, h: 15 });
    createMission();
}

startBtn.onclick = () => { gameActive = true; bgOverlay.style.display = 'none'; ui.style.display = 'block'; init(); loop(); };
retryBtn.onclick = () => { gameOver.style.display = 'none'; init(); };
titleBtn.onclick = () => { gameOver.style.display = 'none'; ui.style.display = 'none'; bgOverlay.style.display = 'flex'; gameActive = false; };

window.onkeydown = e => { 
    keys[e.code] = true; 
    if((e.code==='Space'||e.code==='ArrowUp') && player.alive && player.jumps < 2){ 
        player.vy=player.jump; player.jumps++; 
        if(mission.type==='jump') mission.count++; 
    } 
};
window.onkeyup = e => keys[e.code] = false;

function drawKart(k) {
    ctx.save();
    ctx.translate(k.x + k.w/2, k.y + k.h/2);
    ctx.rotate(k.vy * 0.04 + (k.vx * 0.02));
    ctx.translate(-k.w/2, -k.h/2);
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath(); ctx.moveTo(0, 22); ctx.lineTo(15, 4); ctx.lineTo(55, 4); ctx.lineTo(70, 22); ctx.fill();
    ctx.strokeStyle = k.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
}

function update() {
    if (!gameActive) return;
    
    if (player.alive) {
        if (keys["KeyA"] || keys["ArrowLeft"]) player.vx -= player.accel;
        if (keys["KeyD"] || keys["ArrowRight"]) player.vx += player.accel;
        player.vx *= player.friction; player.x += player.vx; player.y += player.vy; player.vy += 0.7;
        camX = player.x - width / 4;
        distance = Math.floor(player.x / 10);
        if (distance > maxDist) { maxDist = distance; document.getElementById('best-dist').innerText = maxDist + 'm'; }
        if (player.y > height + 400) { player.alive = false; gameOver.style.display = 'flex'; }
        
        // Mission logic
        if (mission.type === "dist" && distance >= mission.goal) createMission();
        if (mission.type === "jump" && mission.count >= mission.goal) createMission();

        // Boss spawn
        if (!boss.alive && distance > 0 && distance % 1200 === 0) {
            boss.alive = true; boss.hp = 150; boss.x = player.x + 1000; boss.y = 100;
        }
    }

    // AI Jump Logic
    rivals.forEach(r => {
        let pAhead = platforms.find(p => p.x > r.x && p.x < r.x + 250);
        if (r.grounded && !pAhead) { r.vy = player.jump; r.grounded = false; }
        r.x += r.vx; r.y += r.vy; r.vy += 0.7;
    });

    // Collision
    [player, ...rivals].forEach(k => {
        k.grounded = false;
        platforms.forEach(p => {
            if (k.x < p.x + p.w && k.x + k.w > p.x && k.y + k.h > p.y && k.y + k.h < p.y + k.vy + 10) {
                if (k.vy > 0) { k.y = p.y - k.h; k.vy = 0; k.jumps = 0; k.grounded = true; }
            }
        });
    });

    // Boss motion
    if (boss.alive) {
        boss.t = (boss.t || 0) + 0.05;
        boss.x = player.x + 600 + Math.sin(boss.t) * 150;
        boss.y = 200 + Math.cos(boss.t * 0.5) * 100;
        bolts.forEach((b, i) => {
            if (b.x > boss.x && b.x < boss.x + 120 && b.y > boss.y && b.y < boss.y + 120) {
                boss.hp -= 15; bolts.splice(i, 1);
                if (boss.hp <= 0) boss.alive = false;
            }
        });
    }

    let last = platforms[platforms.length - 1];
    if (last.x < player.x + width + 1000) platforms.push({ x: last.x + 600, y: 350 + Math.random() * 150, w: 450, h: 15 });

    // HUD Update
    const all = [player, ...rivals].sort((a,b)=>b.x-a.x);
    document.getElementById('pos-display').innerText = `${all.indexOf(player)+1}/5`;
    document.getElementById('stats').innerText = `${Math.floor(Math.abs(player.vx)*30)} KM/H`;
    document.getElementById('main-task').innerText = boss.alive ? "TARGET: GUARDIAN BEE" : "SECTOR ASCENT";
    document.getElementById('side-task').innerText = `${mission.text} (${mission.type === 'jump' ? mission.count : distance}/${mission.goal})`;
}

function draw() {
    ctx.clearRect(0,0,width,height);
    ctx.save(); ctx.translate(-camX, 0);
    platforms.forEach(p => { ctx.fillStyle="#111"; ctx.fillRect(p.x,p.y,p.w,p.h); ctx.fillStyle="#ff3366"; ctx.fillRect(p.x,p.y,p.w,4); });
    
    if (boss.alive) {
        ctx.font = "80px Arial"; ctx.fillText("🐝", boss.x, boss.y + 80);
        ctx.fillStyle = "#00ffcc"; ctx.fillRect(boss.x, boss.y - 20, 120 * (boss.hp/150), 8);
    }

    rivals.forEach(r => drawKart(r));
    if (player.alive) drawKart(player);
    
    bolts.forEach((b,i) => { b.x+=b.vx; b.y+=b.vy; ctx.fillStyle="#00ffcc"; ctx.fillRect(b.x,b.y,10,4); });
    ctx.restore();

    // Minimap
    const map = document.getElementById('minimap');
    map.innerHTML = '';
    [player, ...rivals].forEach(k => {
        const dot = document.createElement('div');
        dot.style.cssText = `position:absolute; width:5px; height:5px; border-radius:50%; background:${k.color}; left:${((k.x - camX) / width) * 220}px; top:23px;`;
        map.appendChild(dot);
    });
}

function loop() {
    update();
    draw();
    if(gameActive) requestAnimationFrame(loop);
}