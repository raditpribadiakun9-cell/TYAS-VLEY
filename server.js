const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

let players = {};
let enemies = [
    {id:'e1', x:10, z:10, hp:50},
    {id:'e2', x:30, z:-20, hp:50}
];

io.on('connection', socket=>{
    console.log('Player connected:', socket.id);

    players[socket.id] = {x:0,y:0,z:0,rotY:0,hp:100,xp:0,level:1,inventory:[]};

    socket.emit('currentPlayers', players);
    socket.emit('enemies', enemies);
    socket.broadcast.emit('newPlayer',{id:socket.id, player:players[socket.id]});

    socket.on('move', data=>{
        if(players[socket.id]){
            players[socket.id] = {...players[socket.id], ...data};
            io.emit('updatePlayers', players);
        }
    });

    socket.on('attackNPC', data=>{
        let enemy = enemies.find(e=>e.id===data.enemyId);
        if(enemy){
            enemy.hp -=10;
            if(enemy.hp<=0){
                enemy.hp=50;
                enemy.x = Math.random()*40-20;
                enemy.z = Math.random()*40-20;
                // Loot
                players[socket.id].xp +=20;
                players[socket.id].inventory.push('Potion');
            }
            io.emit('enemies', enemies);
            io.emit('updatePlayers', players);
        }
    });

    socket.on('disconnect', ()=>{
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});

http.listen(3000, ()=>console.log('Server running on http://localhost:3000'));
