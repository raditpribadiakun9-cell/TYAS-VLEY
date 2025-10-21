const socket = io();

// Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0a0a0);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight,0.1,1000);
camera.position.set(0,10,20);

const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('gameCanvas')});
renderer.setSize(window.innerWidth, window.innerHeight);

const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(0,50,50);
scene.add(light);

// Cannon.js physics
const world = new CANNON.World();
world.gravity.set(0,-9.82,0);

// Ground
const groundBody = new CANNON.Body({mass:0, shape:new CANNON.Plane()});
groundBody.quaternion.setFromEuler(-Math.PI/2,0,0);
world.addBody(groundBody);

// Players & enemies
let players={}, enemies=[];
let playerId=null;
const playerMeshes={}, enemyMeshes={};

// Player physics
const playerBody = new CANNON.Body({mass:1, shape:new CANNON.Box(new CANNON.Vec3(0.5,1,0.5))});
playerBody.position.set(0,1,0);
world.addBody(playerBody);

// Movement
const keys={};
document.addEventListener('keydown', e=>keys[e.key]=true);
document.addEventListener('keyup', e=>keys[e.key]=false);

// Joystick
const joystickBase = document.getElementById('joystick-base');
const joystickThumb = document.getElementById('joystick-thumb');
let joystickActive=false;
let moveVector={x:0,z:0};

joystickBase.addEventListener('touchstart',()=>{ joystickActive=true; });
joystickBase.addEventListener('touchmove', e=>{
    if(!joystickActive) return;
    const touch = e.touches[0];
    const rect = joystickBase.getBoundingClientRect();
    let dx = touch.clientX-(rect.left+rect.width/2);
    let dz = touch.clientY-(rect.top+rect.height/2);
    dx=Math.max(-50,Math.min(50,dx));
    dz=Math.max(-50,Math.min(50,dz));
    joystickThumb.style.left=`${25+dx}px`;
    joystickThumb.style.top=`${25+dz}px`;
    moveVector.x = dx/50;
    moveVector.z = dz/50;
});
joystickBase.addEventListener('touchend',()=>{
    joystickActive=false;
    joystickThumb.style.left='25px';
    joystickThumb.style.top='25px';
    moveVector={x:0,z:0};
});

// Socket.io
socket.on('currentPlayers', data=>{ players=data; playerId=socket.id; });
socket.on('newPlayer', data=>{ players[data.id]=data.player; });
socket.on('updatePlayers', data=>{ players=data; });
socket.on('removePlayer', id=>{ delete players[id]; });
socket.on('enemies', data=>{ enemies=data; });

// Game loop
function animate(){
    requestAnimationFrame(animate);
    world.step(1/60);

    if(players[playerId]){
        let p = players[playerId];
        const speed=0.2;
        p.x += moveVector.x*speed;
        p.z += moveVector.z*speed;
        playerBody.position.set(p.x,1,p.z);
        socket.emit('move',{x:p.x,y:p.y,z:p.z,rotY:p.rotY});
    }

    renderer.render(scene,camera);
    updateUI();
}
animate();

// UI update
function updateUI(){
    if(players[playerId]){
        const p=players[playerId];
        document.getElementById('hpBar').value=p.hp;
        document.getElementById('xpBar').value=p.xp;
        document.getElementById('level').innerText=p.level;
        document.getElementById('inventory').innerText=p.inventory.join(', ');
    }
}

// Skills
const skillCooldowns={1:false,2:false,3:false};
document.querySelectorAll('.skillBtn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
        const skill = btn.dataset.skill;
        if(skillCooldowns[skill]) return;
        skillCooldowns[skill] = true;

        if(skill==='1'){ attackMelee(); }
        if(skill==='2'){ attackMagic(); }
        if(skill==='3'){ attackArea(); }

        setTimeout(()=>{
            skillCooldowns[skill] = false;
        }, skill==='1'?2000 : skill==='2'?5000 : 10000);
    });
});

// Skill animations
function attackMelee(){
    const p = players[playerId];
    enemies.forEach(e=>{
        if(Math.abs(p.x-e.x)<2 && Math.abs(p.z-e.z)<2){
            socket.emit('attackNPC',{enemyId:e.id});
        }
    });
}

function attackMagic(){
    const p = players[playerId];
    if(enemies.length===0) return;
    const e = enemies[0];
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8), new THREE.MeshStandardMaterial({color:0x00ffff}));
    ball.position.set(p.x,1,p.z);
    scene.add(ball);

    const targetVec = new THREE.Vector3(e.x,1,e.z);
    const interval = setInterval(()=>{
        ball.position.lerp(targetVec,0.1);
        if(ball.position.distanceTo(targetVec)<0.5){
            scene.remove(ball);
            clearInterval(interval);
            socket.emit('attackNPC',{enemyId:e.id});
        }
    },50);
}

function attackArea(){
    const p = players[playerId];
    enemies.forEach(e=>{
        if(Math.abs(p.x-e.x)<3 && Math.abs(p.z-e.z)<3){
            socket.emit('attackNPC',{enemyId:e.id});
        }
    });
}
