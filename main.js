const _ = require('lodash');
const getShanten = require('./shanten');

class Player {
    socket;
    id;
    room;
    kaze;
    tehai;
    is_reach_try = false;
    is_reach = false;
    current_tsumo;

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
        this.yama = [];
    }

    addPlayer(socket) {
        socket.join(this.room);
        this.player.push(new Player(socket, this.room, this.player.length));
        if(this.player.length === 1) {
            setTimeout(() => this.gameStart(), 1000);
            currentGameState = new GameState(this.io, 'room_' + ++current_room_id);
        }

        socket.on('dahai', pai => {
            const player = this.player[this.turn];
            if(socket.id !== player.id) {
                console.log("dahai error : turn=" + this.turn);
                return;
            }
            if(player.is_reach && pai !== player.current_tsumo) {
                console.log("dahai error : reach & current_tsumo=" + player.current_tsumo);
                return;
            }
            if(!player.tehai.includes(pai)) {
                console.log("dahai error : tehai=" + player.tehai + " & pai=" + pai);
                return;
            }

            player.tehai = player.tehai.filter(it => it !== pai);
            if(player.is_reach_try && getShanten(player.tehai) !== 0) {
                player.tehai.push(pai);
                console.log("dahai error : reach & tehai=" + player.tehai);
                return;
            }

            console.log('dahai : player=' + this.turn + ' pai=' + pai);
            this.io.in(this.room).emit('dahai', this.turn, pai);

            //TODO ロン/鳴きチェック

            if(player.is_reach_try) {
                player.is_reach = true;
            }
            // this.turn = ++this.turn%4;
            this.tsumo(this.turn);
        });

        socket.on('reach', () => {
            const player = this.player[this.turn];
            if(socket.id !== player.id) {
                console.log("reach error : turn=" + this.turn);
                return;
            }
            if(getShanten(player.tehai) > 0) {
                console.log("reach error : shanten=" + getShanten(player.tehai));
                return;
            }
            player.is_reach_try = true;
            console.log("reach : player=" + this.turn);
            this.io.in(this.room).emit('reach', this.turn);
        });

        socket.on('restart', () => {
            if(this.player.length === 1) {
                this.gameStart();
            }
        });
    }

    removePlayerById(id) {
        this.player = this.player.filter(p => p.id !== id);
    }

    tsumo(turn) {
        const player = this.player[this.turn];
        const pai = this.yama.pop();
        player.current_tsumo = pai;
        this.player[turn].tehai.push(pai);
        const shanten = getShanten(this.player[turn].tehai);
        console.log('tsumo : player=' + turn + ' pai=' + pai + ' shanten=' + shanten);
        _.forEach(this.player, p => {
            this.io.to(p.id).emit('tsumo',
                turn,
                turn === p.kaze ? pai : -1,
                turn === p.kaze ? (shanten > 0 ? 1 : shanten) : 6
            );
        });

        if(shanten <= 0) {
            this.io.to(player.id).emit('can_reach');
        }
    }

    gameStart() {
        console.log("GAME START " + this.room);
        this.yama = _.shuffle([...Array(136).keys()]);
        this.haipai();
        this.tsumo(0);
    }

    haipai() {
        _.forEach(this.player, (p => {
            const tehai = [];
            _.times(13, () => {tehai.push(this.yama.pop())});

            p.tehai = tehai.sort((a, b) => a - b);
            this.io.to(p.id).emit('haipai', p.tehai, p.kaze);
        }));
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
