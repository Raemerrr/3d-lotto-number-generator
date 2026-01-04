// Three.js and Cannon.js Premium Lotto 6/45 Simulation
// Focus: Ultra-Powerful persistent airflow + Spline-inspired Neon UI + Realistic Physics Tracking

import * as CANNON from 'cannon-es';
import * as THREE from 'three';

class Lotto645 {
    constructor() {
        this.container = document.querySelector('#scene-container');
        if (!this.container) return;

        // --- Config ---
        this.chamberRadius = 8;
        this.ballRadius = 0.65;
        this.gateWidth = 0.85; // Narrowed to prevent multiple balls (Ball diam is ~1.3)
        
        // --- State ---
        this.state = 'IDLE'; 
        this.balls = [];
        this.capturedNumbers = [];
        this.isGateOpen = false; // Lower Gate
        this.isGate2Open = false; // Upper Gate
        this.activeTargetBall = null;
        this.trappedBall = null; // Ball in buffer zone
        this.airflowIntensity = 0;
        this.isTurbo = false;
        this.activeTimers = new Set();

        this.lang = navigator.language.startsWith('ko') ? 'ko' : 'en';
        this.i18n = {
            ko: {
                start: '추출 시작',
                stop: '추출 중지',
                drawing: '번호 추출 중...',
                selected: '번 당첨!',
                jackpot: '추출 완료!',
                reset: '초기화',
                results: '로또 6/45 결과',
                newGen: '새로 뽑기'
            },
            en: {
                start: 'START BLOWING',
                stop: 'STOP STORM',
                drawing: 'GATE OPENING...',
                selected: ' SELECTED!',
                jackpot: 'DRAW COMPLETE!',
                reset: 'Reset All',
                results: 'Lotto 6/45 Results',
                newGen: 'New Generation'
            }
        };
        
        this.initScene();
        this.initPhysics();
        this.addLights();
        this.createChamber();
        this.createVisuals();
        this.createBalls();
        
        this.setupUI();
        this.animate();
        this.handleResize();
    }

    // Helper to manage timeouts and prevent ghosts after reset
    delay(fn, ms) {
        const id = setTimeout(() => {
            this.activeTimers.delete(id);
            fn();
        }, ms);
        this.activeTimers.add(id);
        return id;
    }

    clearAllTimers() {
        this.activeTimers.forEach(id => clearTimeout(id));
        this.activeTimers.clear();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x010103); 
        this.scene.fog = new THREE.FogExp2(0x010103, 0.0001); // Almost zero fog

        this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 12, 35);
        this.camera.lookAt(0, 4, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.container.appendChild(this.renderer.domElement);
        this.updateCamera(); // Initial camera setup
        console.log("Scene initialized");
    }

    initPhysics() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -35, 0); 
        this.world.solver.iterations = 40;
        this.world.allowSleep = false; // Never let balls stop!
        
        this.ballMat = new CANNON.Material();
        const ballContact = new CANNON.ContactMaterial(this.ballMat, this.ballMat, {
            friction: 0.05, restitution: 0.8 // Bouncier balls
        });
        this.world.addContactMaterial(ballContact);
    }

    addLights() {
        const h = new THREE.HemisphereLight(0xffffff, 0x000000, 0.8); // Brighter ambient
        this.scene.add(h);

        // Strong Neon Accents
        this.neonCyan = new THREE.PointLight(0x00f2ff, 15, 150);
        this.neonCyan.position.set(-20, 20, 15);
        this.scene.add(this.neonCyan);

        this.neonMagenta = new THREE.PointLight(0xff00ea, 12, 120);
        this.neonMagenta.position.set(20, 15, -10);
        this.scene.add(this.neonMagenta);
        
        // Backlighting for separation
        const backLight = new THREE.PointLight(0xffffff, 5, 100);
        backLight.position.set(0, 5, -20);
        this.scene.add(backLight);

        const topLight = new THREE.DirectionalLight(0xffffff, 2);
        topLight.position.set(10, 30, 10);
        this.scene.add(topLight);

        const spotLower = new THREE.SpotLight(0xffffff, 3);
        spotLower.position.set(0, -20, 10);
        this.scene.add(spotLower);

        // Aesthetic Rim Light (Blue-ish backlight)
        const rimLight = new THREE.SpotLight(0x00f2ff, 10);
        rimLight.position.set(0, 5, -20);
        rimLight.lookAt(0, 0, 0);
        this.scene.add(rimLight);
    }

    createChamber() {
        // Main Globe (Plastic material for better visibility)
        const globeGeo = new THREE.SphereGeometry(this.chamberRadius, 64, 32, 0, Math.PI*2, 0.2, Math.PI-0.2);
        const globeMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transmission: 0.95, // Crystal clear
            thickness: 0.2, // Thinner glass
            roughness: 0, // Perfectly smooth
            metalness: 0,
            transparent: true,
            opacity: 0.1, // Barely visible base
            side: THREE.DoubleSide,
            clearcoat: 1.0, // High polish
            clearcoatRoughness: 0,
            ior: 1.5, // Glass IOR
            attenuationColor: 0xffffff,
            attenuationDistance: 10
        });
        const globe = new THREE.Mesh(globeGeo, globeMat);
        this.scene.add(globe);

        // Visual & Physical Chimney (Neck between gates)
        const chimneyGeo = new THREE.CylinderGeometry(this.gateWidth + 0.1, this.gateWidth + 0.1, 1.5, 32, 1, true);
        const chimney = new THREE.Mesh(chimneyGeo, globeMat);
        chimney.position.set(0, this.chamberRadius + 0.75, 0);
        this.scene.add(chimney);

        // Physics Gate 1 (Lower Gate)
        this.gateBody = new CANNON.Body({ mass: 0 });
        this.gateBody.addShape(new CANNON.Cylinder(this.gateWidth + 0.1, this.gateWidth + 0.1, 0.1, 32));
        this.gateBody.position.set(0, this.chamberRadius, 0);
        this.world.addBody(this.gateBody);

        this.gateMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(this.gateWidth + 0.1, this.gateWidth + 0.1, 0.1, 32),
            new THREE.MeshStandardMaterial({ 
                color: 0x00f2ff, 
                emissive: 0x00f2ff, 
                emissiveIntensity: 2 
            })
        );
        this.scene.add(this.gateMesh);

        // Physics Gate 2 (Upper Gate)
        this.gateBody2 = new CANNON.Body({ mass: 0 });
        this.gateBody2.addShape(new CANNON.Cylinder(this.gateWidth + 0.1, this.gateWidth + 0.1, 0.1, 32));
        this.gateBody2.position.set(0, this.chamberRadius + 1.5, 0);
        this.world.addBody(this.gateBody2);

        this.gateMesh2 = new THREE.Mesh(
            new THREE.CylinderGeometry(this.gateWidth + 0.1, this.gateWidth + 0.1, 0.1, 32),
            new THREE.MeshStandardMaterial({ 
                color: 0xff00ea, 
                emissive: 0xff00ea, 
                emissiveIntensity: 2 
            })
        );
        this.scene.add(this.gateMesh2);

        // Floor
        const floor = new CANNON.Body({ mass: 0 });
        floor.addShape(new CANNON.Plane());
        floor.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2);
        floor.position.y = -this.chamberRadius;
        this.world.addBody(floor);
    }

    createVisuals() {
        // Vertical Steel Stack Rack (Further left for separation)
        const tubeGeo = new THREE.CylinderGeometry(1.4, 1.4, 15, 32, 1, true);
        const steelMat = new THREE.MeshStandardMaterial({
            color: 0x888888, metalness: 1.0, roughness: 0.2
        });
        this.stackTube = new THREE.Mesh(tubeGeo, steelMat);
        this.stackTube.position.set(-25, 5, 0);
        this.scene.add(this.stackTube);
        
        // Steel Rail (U-shape flow) - Aligned to (0,8,0)
        this.railCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 8, 0),    // Start at exit
            new THREE.Vector3(0, 11, 0),   // Lift up
            new THREE.Vector3(-12, 13, 1), // Curve out
            new THREE.Vector3(-25, 5, 0)   // To stack
        ]);
        const railGeo = new THREE.TubeGeometry(this.railCurve, 64, 0.1, 8, false);
        const railMesh = new THREE.Mesh(railGeo, steelMat);
        this.scene.add(railMesh);
        
        // Visual rail guides (Sleeve)
        const guideGeo = new THREE.TubeGeometry(this.railCurve, 64, 1.3, 16, false);
        const guideMat = new THREE.MeshPhysicalMaterial({
            color: 0x00f2ff, transmission: 0.9, transparent: true, opacity: 0.1, emissive: 0x00f2ff, emissiveIntensity: 0.5
        });
        this.scene.add(new THREE.Mesh(guideGeo, guideMat));

        
        // Base Glow
        const ringGeo = new THREE.TorusGeometry(8.5, 0.05, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = -8;
        ring.rotation.x = Math.PI/2;
        this.scene.add(ring);
    }

    createBalls() {
        const ballGeo = new THREE.SphereGeometry(this.ballRadius, 32, 32);
        // Spline-inspired Pastel Colors
        const colors = [
            0xff99cc, // Candy Pink
            0x99f2ff, // Cyan/Ice Blue
            0xccff99, // Lime Green
            0xccccff, // Soft Purple
            0xffcc99  // Peachy Orange
        ];

        for (let i = 1; i <= 45; i++) {
            const color = colors[Math.floor((i - 1) / 10)] || colors[4];
            const canvas = document.createElement('canvas');
            canvas.width = 128; canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Premium ball texture
            ctx.fillStyle = '#' + color.toString(16).padStart(6, '0'); ctx.fillRect(0,0,128,128);
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(64,64,45,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = 'black'; ctx.font = 'bold 50px NanumHuman'; ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(i, 64, 64);
            
            const texture = new THREE.CanvasTexture(canvas);
            const mat = new THREE.MeshStandardMaterial({ 
                map: texture, 
                metalness: 0.3, 
                roughness: 0.1,
                envMapIntensity: 1
            });
            const mesh = new THREE.Mesh(ballGeo, mat);
            this.scene.add(mesh);

            const body = new CANNON.Body({
                mass: 1.5, shape: new CANNON.Sphere(this.ballRadius),
                position: new CANNON.Vec3((Math.random()-0.5)*12, -6+Math.random()*2, (Math.random()-0.5)*12),
                material: this.ballMat,
                linearDamping: 0.005, // Ultra low damping for heavy feel
                angularDamping: 0.01
            });
            this.world.addBody(body);
            this.balls.push({ mesh, body, id: i, extracted: false });
        }
        console.log("45 output balls created");
    }

    setupUI() {
        document.getElementById('spin-button').onclick = () => {
            if (this.state === 'IDLE') {
                this.state = 'STORM';
                this.updateUILabels();
                
                // Automatic start sequence
                this.delay(() => {
                    if (this.state === 'STORM') this.openGate();
                }, 1500);
            } else {
                this.reset();
            }
        };

        document.getElementById('reset-button').onclick = () => this.reset();
        document.getElementById('restart-gen').onclick = () => {
             document.getElementById('results-overlay').classList.add('hidden');
             this.reset();
        };
        document.getElementById('close-results').onclick = () => {
             document.getElementById('results-overlay').classList.add('hidden');
             this.reset();
        };
        this.updateUILabels();
    }

    updateUILabels() {
        const t = this.i18n[this.lang];
        document.getElementById('spin-button').innerText = (this.state === 'IDLE') ? t.start : t.stop;
        document.getElementById('reset-button').innerText = t.reset;
        document.querySelector('#results-overlay h2').innerText = t.results;
        document.getElementById('restart-gen').innerText = t.newGen;
    }

    openGate() {
        if (this.state === 'STORM' && this.capturedNumbers.length < 6 && !this.activeTargetBall && !this.trappedBall && !this.isGateOpen && !this.isGate2Open) {
            this.isGateOpen = true;
            this.showMessage(this.i18n[this.lang].drawing);
        }
    }

    reset() {
        this.state = 'IDLE';
        this.clearAllTimers();
        this.capturedNumbers = [];
        this.isGateOpen = false;
        this.isGate2Open = false;
        this.activeTargetBall = null;
        this.trappedBall = null;
        this.balls.forEach(b => {
            b.extracted = false; b.body.mass = 1.5; b.body.updateMassProperties();
            b.body.position.set((Math.random()-0.5)*12, -6+Math.random()*2, (Math.random()-0.5)*12);
            b.body.velocity.set(0,0,0);
        });
        this.updateHUD(); // Clear UI list
        document.getElementById('results-container').innerHTML = ''; // Clear results page
        this.updateUILabels();
        document.getElementById('winner-modal').classList.add('hidden');
    }

    showMessage(t) {
        document.getElementById('winner-title').innerText = t;
        document.getElementById('winner-modal').classList.remove('hidden');
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.world.step(1/60);
        
        // Gate 1 visual sync
        const targetX1 = this.isGateOpen ? 3 : 0;
        this.gateBody.position.x += (targetX1 - this.gateBody.position.x) * 0.15;
        this.gateMesh.position.copy(this.gateBody.position);

        // Gate 2 visual sync
        const targetX2 = this.isGate2Open ? 3 : 0;
        this.gateBody2.position.x += (targetX2 - this.gateBody2.position.x) * 0.15;
        this.gateMesh2.position.copy(this.gateBody2.position);

        this.applyPhysics();
        this.balls.forEach(b => {
            b.mesh.position.copy(b.body.position);
            b.mesh.quaternion.copy(b.body.quaternion);
        });
        this.renderer.render(this.scene, this.camera);
        
        // Dynamic Lighting based on wind
        if (this.state === 'STORM') {
            const intensity = 2 + this.airflowIntensity * 4;
            this.scene.children.forEach(child => {
                if (child.isPointLight) {
                    child.intensity = intensity;
                }
            });
        } else {
            this.scene.children.forEach(child => {
                if (child.isPointLight) {
                    child.intensity = child === this.scene.children.find(c => c.isPointLight && c.color.getHex() === 0x00f2ff) ? 3 : 2;
                }
            });
        }
    }

    applyPhysics() {
        const maxR = this.chamberRadius - this.ballRadius;
        
        // 0. STOP ALL FORCES IN IDLE & CLOSE GATES
        if (this.state === 'IDLE') {
            this.isGateOpen = false;
            this.isGate2Open = false;
            this.balls.forEach(b => {
                b.body.velocity.set(0,0,0);
                b.body.angularVelocity.set(0,0,0);
                b.body.force.set(0,0,0);
                b.body.torque.set(0,0,0);
                
                const pos = b.body.position;
                const dist = pos.length();
                if (dist > maxR) {
                    const scale = maxR / dist;
                    b.body.position.set(pos.x * scale, pos.y * scale, pos.z * scale);
                }
            });
            this.airflowIntensity = 0;
            return;
        }

        // 1. AUTOMATED AIRFLOW INTENSITY (Min 8% to Max 35%)
        if (this.state === 'STORM') {
            const time = performance.now() * 0.001;
            this.airflowIntensity = 0.08 + ((Math.sin(time) + 1) / 2) * 0.27;
            
            // Update lighting based on intensity
            const glow = 5 + this.airflowIntensity * 40;
            if (this.neonCyan) this.neonCyan.intensity = glow;
            if (this.neonMagenta) this.neonMagenta.intensity = glow * 0.8;
        }

        this.balls.forEach(b => {
            if (b.extracted) return;
            const pos = b.body.position;

            // --- DUAL GATE LOGIC ---
            
            // A. Rail Path Animation (After passing G2)
            if (b === this.activeTargetBall) {
                b.railProgress += 0.01;
                if (b.railProgress > 1) b.railProgress = 1;

                const tPos = this.railCurve.getPoint(b.railProgress);
                b.body.position.set(tPos.x, tPos.y, tPos.z);
                b.body.velocity.set(0,0,0);
                b.body.angularVelocity.set(0,0,0);

                if (b.railProgress >= 1) {
                    this.finalCapture(b);
                }
                return;
            }

            // B. Trapped Ball (Between G1 and G2)
            if (b === this.trappedBall) {
                // Suction ONLY when G2 is open
                if (this.isGate2Open) {
                    // Spiral Ascent Force
                    const spiralStrength = 500;
                    const upForce = 1800; // Stronger uplift
                    
                    // Spiral logic: Tangential force
                    const tanX = -pos.z;
                    const tanZ = pos.x;
                    
                    b.body.applyForce(new CANNON.Vec3(tanX * spiralStrength, upForce, tanZ * spiralStrength), pos);
                    
                    // Neon Pulse Effect
                    if (this.neonMagenta) {
                       this.neonMagenta.intensity = 50 + Math.random() * 50; // Flicker
                    }
                } else {
                    // Hold in middle of buffer zone (no gravity/floating)
                    b.body.velocity.set(0, 0, 0);
                    b.body.position.set(0, this.chamberRadius + 0.75, 0);
                }
                
                // If it passed G2, transition to activeTargetBall
                if (pos.y > this.chamberRadius + 2.0) {
                    this.activeTargetBall = b;
                    this.trappedBall = null;
                    this.isGate2Open = false;
                    b.railProgress = 0;
                    const msg = this.lang === 'ko' ? `${b.id}${this.i18n.ko.selected}` : `NUMBER #${b.id}${this.i18n.en.selected}`;
                    this.showMessage(msg);
                }
                return;
            }

            // C. Detection for G1 (Lower Gate)
            if (this.isGateOpen && !this.trappedBall && !this.activeTargetBall) {
                // Extremely tight detection for narrow gate
                const distH = Math.sqrt(pos.x**2 + pos.z**2);
                if (pos.y > this.chamberRadius - 0.5 && distH < this.gateWidth) {
                    this.trappedBall = b;
                    this.isGateOpen = false; 
                    
                    this.delay(() => {
                        if (this.state === 'STORM') this.isGate2Open = true;
                    }, 800);
                }
            }

            // 4. CHAMBER WALLS (More robust spherical containment)
            const dist = pos.length();
            
            // Exit area margin
            const isNearExit = (pos.y > this.chamberRadius - 1.5 && Math.sqrt(pos.x**2 + pos.z**2) < this.gateWidth + 0.5);
            const marginY = (this.isGateOpen && isNearExit) ? 2.5 : 0;

            if (dist > maxR && pos.y < this.chamberRadius - marginY) {
                const nx = pos.x / dist;
                const ny = pos.y / dist;
                const nz = pos.z / dist;
                
                // Push back to boundary
                b.body.position.set(nx * maxR, ny * maxR, nz * maxR);
                
                // Reflect velocity
                const vDotN = b.body.velocity.x * nx + b.body.velocity.y * ny + b.body.velocity.z * nz;
                if (vDotN > 0) {
                    b.body.velocity.x -= vDotN * nx * 1.5;
                    b.body.velocity.y -= vDotN * ny * 1.5;
                    b.body.velocity.z -= vDotN * nz * 1.5;
                }
            }

            // 1. DYNAMIC AIRFLOW
            if (this.state === 'STORM') {
                const intensity = this.airflowIntensity;
                const time = performance.now() * 0.002;
                
                // Bottom Blast
                if (pos.y < -3) {
                    const baseForce = 2200 * intensity; 
                    const angle = time + (pos.x * 0.2);
                    const fx = Math.cos(angle) * baseForce * 0.4;
                    const fz = Math.sin(angle) * baseForce * 0.4;
                    const fy = baseForce * (1 + Math.random() * 0.5);
                    b.body.applyForce(new CANNON.Vec3(fx, fy, fz), pos);
                }
                
                // Upper Gravity Drop
                if (pos.y > 2) {
                    b.body.applyForce(new CANNON.Vec3(0, -10 * intensity, 0), pos);
                }
                
                // Anti-Stagnation Jitter
                const jitter = 300 * intensity;
                b.body.applyForce(new CANNON.Vec3(
                    (Math.random() - 0.5) * jitter,
                    (Math.random() - 0.5) * jitter * 0.3, 
                    (Math.random() - 0.5) * jitter
                ), pos);

                // Constant nudge
                b.body.velocity.x += (Math.random() - 0.5) * 0.2;
                b.body.velocity.z += (Math.random() - 0.5) * 0.2;

                // Repulsive burst
                this.world.contacts.forEach(contact => {
                    if (contact.bi === b.body || contact.bj === b.body) {
                        const repulsion = 200 * intensity;
                        b.body.applyForce(new CANNON.Vec3(
                            (Math.random() - 0.5) * repulsion,
                            (Math.random() - 0.5) * repulsion,
                            (Math.random() - 0.5) * repulsion
                        ), pos);
                    }
                });
            }

            // 2. EXTRACTION AREA SUCTION (Pull towards G1)
            if (this.isGateOpen && !this.activeTargetBall && !this.trappedBall) {
                const pulse = 200 * Math.max(0, Math.sin(performance.now() * 0.01));
                b.body.applyForce(new CANNON.Vec3(0, 100 + pulse, 0), pos);

                if (pos.y > 1) {
                    const toExit = new CANNON.Vec3(-pos.x, this.chamberRadius - pos.y, -pos.z);
                    toExit.normalize();
                    toExit.scale(800, toExit); 
                    b.body.applyForce(toExit, pos);

                    if (Math.abs(pos.x) < this.gateWidth && Math.abs(pos.z) < this.gateWidth && pos.y > this.chamberRadius - 1.5) {
                        b.body.applyForce(new CANNON.Vec3(0, 2000, 0), pos); 
                    }
                }
            }
        });
    }

    finalCapture(ball) {
        ball.extracted = true;
        this.capturedNumbers.push(ball.id);
        this.updateHUD();

        // Stacking positions
        const stackX = -25;
        const stackBottomY = -2;
        
        this.capturedNumbers.forEach((id, idx) => {
            const b = this.balls.find(ballObj => ballObj.id === id);
            if (b) {
                b.body.mass = 0; 
                b.body.updateMassProperties();
                b.body.velocity.set(0,0,0);
                b.body.angularVelocity.set(0,0,0);
                
                const posInStack = this.capturedNumbers.length - 1 - idx;
                const targetY = stackBottomY + posInStack * 1.5;
                b.body.position.set(stackX, targetY, 0);
            }
        });

        this.activeTargetBall = null; // Clear state AFTER stacking

        if (this.capturedNumbers.length < 6) {
            this.delay(() => {
                if (this.state === 'STORM' && this.capturedNumbers.length < 6 && !this.activeTargetBall) {
                    this.openGate();
                }
            }, 1000); // Always 1s delay for sequential auto-draw
        } else {
            this.finish();
        }
    }

    updateHUD() {
        const seq = document.getElementById('pick-sequence');
        seq.innerHTML = this.capturedNumbers.map(n => {
            const c = ['yellow', 'blue', 'red', 'grey', 'green'][Math.floor((n-1)/10)] || 'green';
            return `<div class="ball-num ${c}">${n}</div>`;
        }).join('');
    }

    finish() {
        this.state = 'IDLE';
        this.showMessage(this.i18n[this.lang].jackpot);
        this.updateUILabels(); // Update button label back to "Start"
        this.delay(() => {
            if (this.state !== 'IDLE') return; // Double check state
            const overlay = document.getElementById('results-overlay');
            const container = document.getElementById('results-container');
            container.innerHTML = `
                <div class="lotto-set">
                    <div class="ball-row">
                        ${this.capturedNumbers.sort((a,b)=>a-b).map(n => {
                            const c = ['yellow', 'blue', 'red', 'grey', 'green'][Math.floor((n-1)/10)] || 'green';
                            return `<div class="ball-num ${c}">${n}</div>`;
                        }).join('')}
                    </div>
                </div>`;
            overlay.classList.remove('hidden');
        }, 1500);
    }

    updateCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        if (aspect < 1) {
            // Portrait Mode (Mobile)
            this.camera.fov = 60; // Wider FOV for vertical
            this.camera.position.set(0, 10, 45); // Move further back
        } else {
            // Landscape Mode (Desktop)
            this.camera.fov = 40;
            this.camera.position.set(0, 12, 35);
        }
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
    }

    handleResize() {
        window.addEventListener('resize', () => {
            this.updateCamera();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
}

window.addEventListener('load', () => new Lotto645());
