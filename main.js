const _ = require('lodash');

class Player {
    socket;
    id;
    room;
    kaze;
    tehai;

    constructor(socket, room, kaze) {
        this.socket = socket;
        this.id = socket.id;
        this.room = room;
        this.kaze = kaze;
    }
}

class GameState {
    io;
    room;
    player;
    turn = 0;
    yama;

    constructor(io, room) {
        this.io = io;
        this.room = room;
        this.player = [];
        this.yama = createYama();
    }

    addPlayer(socket) {
        socket.join(this.room);
        this.player.push(new Player(socket, this.room, this.player.length));
        if(this.player.length === 4) {
            this.gameStart();
            currentGameState = new GameState(this.io, 'room_' + ++current_room_id);
        }

        socket.on('dahai', pai => {
            if(socket.id !== this.player[this.turn]) {
                return;
            }
            this.dahai(pai);
        });

        socket.on('restart', () => {
            if(this.player.length === 4) {
                this.gameStart();
            }
        });
    }

    removePlayerById(id) {
        this.player = this.player.filter(p => p.id !== id);
    }

    dahai(pai) {
        console.log('dahai : player=' + this.turn + 'pai=' + pai);
        if(!this.player[this.turn].tehai.includes(pai)) {
            return;
        }
        this.turn = ++this.turn%4;
        this.tsumo(this.turn);
    }

    tsumo(turn) {
        const pai = this.yama.pop();
        console.log('tsumo : player=' + turn + ' pai=' + pai);
        this.io.to(this.player[turn]).emit('tsumo', pai);
    }

    gameStart() {
        console.log("GAME START " + this.room);
        this.yama = createYama();
        _.forEach(this.player, (p => {
            p.tehai = this.haipai();
            this.io.to(p.id).emit('haipai', p.tehai);
        }));
        this.tsumo(0);
    }

    haipai() {
        const tehai = [];
        _.times(13, () => {tehai.push(this.yama.pop())});
        return tehai;
    }
}

let currentGameState;
let current_room_id = 0;

module.exports = io => {
    // サーバー側処理のエントリポイント
    currentGameState = new GameState(io, 'room_' + current_room_id);
    io.on('connection', async socket => {
        currentGameState.addPlayer(socket);
        socket.on('disconnect', () => {
            currentGameState.removePlayerById(socket.id);
        });
    });
};

function createYama() {
    return _.shuffle([...Array(136).keys()]);
}