const _ = require('lodash');

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
        this.player.push(socket.id);
        if(this.player.length === 1) {
            setTimeout(() => this.gameStart(), 1000);
            currentGameState = new GameState(this.io, 'room_' + ++current_room_id);
        }

        socket.on('dahai', pai => {
            if(socket.id !== this.player[this.turn]) {
                return;
            }
            console.log('dahai : player=' + this.turn + 'pai=' + pai);
            // this.turn = ++this.turn%4;
            this.tsumo(this.turn);
        });

        socket.on('restart', () => {
            if(this.player.length === 1) {
                this.gameStart();
            }
        });
    }

    removePlayer(id) {
        this.player = this.player.filter(p => p !== id);
    }

    tsumo(turn) {
        const pai = this.yama.pop();
        console.log('tsumo : player=' + turn + 'pai=' + pai);
        this.io.to(this.player[turn]).emit('tsumo', pai);
    }

    gameStart() {
        console.log("GAME START " + this.room);
        this.yama = createYama();
        _.forEach(this.player, (id => this.io.to(id).emit('haipai', this.haipai())));

        console.log("tsumo : " + this.player[this.turn]);
        this.io.to(this.player[this.turn]).emit('tsumo', this.yama.pop());
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
            currentGameState.removePlayer(socket.id);
        });
    });
};

function createYama() {
    return _.shuffle([...Array(136).keys()]);
}