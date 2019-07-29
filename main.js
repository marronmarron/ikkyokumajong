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
    current_dahai = -1;

    constructor(io, room) {
        this.io = io;
        this.room = room;
        this.player = [];
        this.yama = [];
    }

    // プレイヤー追加 + socketの構成をする
    addPlayer(socket) {
        // 部屋に参加
        socket.join(this.room);
        this.player.push(new Player(socket, this.room, this.player.length));

        // ４人揃ったらゲーム開始する
        if(this.player.length === 4) {
            setTimeout(() => this.gameStart(), 1000);
            currentGameState = new GameState(this.io, 'room_' + ++current_room_id);
        }

        // 打牌時の処理
        socket.on('dahai', pai => {
            const player = this.player[this.turn];
            // 番じゃないdahaiを弾く
            if(socket.id !== player.id) {
                console.log("dahai error : turn=" + this.turn);
                return;
            }
            // リーチ中にツモ切りでない打牌を弾く
            if(player.is_reach && pai !== player.current_tsumo) {
                console.log("dahai error : reach & current_tsumo=" + player.current_tsumo);
                return;
            }
            // 持ってない牌の打牌を弾く
            if(!player.tehai.includes(pai)) {
                console.log("dahai error : tehai=" + player.tehai + " & pai=" + pai);
                return;
            }
            // 手牌から切られた牌を除く
            player.tehai = player.tehai.filter(it => it !== pai);

            // リーチをかけたがテンパイしない打牌を弾く
            if(player.is_reach_try && getShanten(player.tehai) !== 0) {
                player.tehai.push(pai);
                console.log("dahai error : reach & tehai=" + player.tehai);
                return;
            }
            // クライアントに通知 + 確認
            console.log('dahai : player=' + this.turn + ' pai=' + pai);
            this.io.in(this.room).emit('dahai', this.turn, pai);

            //TODO ロン/鳴きチェック
            this.current_dahai = pai;
            if(player.is_reach_try) {
                player.is_reach = true;
            }

            // 次の番に移る
            this.turn = ++this.turn%4;
            this.tsumo(this.turn);
        });

        // アガリ時の処理
        socket.on('agari', () => {
            // アガリ情報を変数化
            const who = _.find(this.player, p => p.id === socket.id);
            const from = this.player[this.turn];
            const type = (who === from) ? "tsumo" : "ron";
            const pai = (type === "tsumo") ? who.current_tsumo : this.current_dahai;

            // ロンなら手牌にアガリ牌を入れてshanten = -1にしておく
            if(type === "ron") {
                who.tehai.push(pai);
            }
            // アガれていない手牌を弾く
            if(getShanten(who.tehai) !== -1) {
                console.log("agari error : tehai = " + who.tehai);
                if(type === "ron") who.tehai = _.filter(who.tehai, p !== pai);
                return;
            }
            // TODO 符計算/役計算/点数計算
            const fu = 40;
            const yaku = {"reach": 1, "tanyao": 1};
            const ten = [-2600, 0, 0, 2600];

            // クライアントに通知
            socket.emit('agari', {
                who: who,
                from: from,
                type: type,
                pai: pai,
                fu: fu,
                yaku: yaku,
                ten: ten,
            })
        });

        // リーチ時の処理
        socket.on('reach', () => {
            const player = this.player[this.turn];
            // 番じゃない人のリーチを弾く
            if(socket.id !== player.id) {
                console.log("reach error : turn=" + this.turn);
                return;
            }
            // テンパイじゃない人のリーチを弾く
            if(getShanten(player.tehai) > 0) {
                console.log("reach error : shanten=" + getShanten(player.tehai));
                return;
            }
            // リーチ宣言状態にする(打牌が通った時にリーチ成立)
            player.is_reach_try = true;

            // クライアントに通知
            console.log("reach : player=" + this.turn);
            this.io.in(this.room).emit('reach', this.turn);
        });

        // 再配牌ボタン（デバッグ用）
        socket.on('restart', () => {
            if(this.player.length === 4) {
                this.gameStart();
            }
        });
    }

    // 接続が切れたプレイヤーを部屋から出す
    removePlayerById(id) {
        this.player = this.player.filter(p => p.id !== id);
    }

    // ツモ時の処理
    tsumo(turn) {
        const player = this.player[this.turn];
        const pai = this.yama.pop();
        player.current_tsumo = pai;
        this.player[turn].tehai.push(pai);
        const shanten = getShanten(this.player[turn].tehai);
        console.log('tsumo : player=' + turn + ' pai=' + pai + ' shanten=' + shanten);

        // クライアントに通知(番の人にだけ牌とシャンテン情報を送信)
        _.forEach(this.player, p => {
            this.io.to(p.id).emit('tsumo',
                turn,
                turn === p.kaze ? pai : -1,
                turn === p.kaze ? (shanten > 0 ? 1 : shanten) : 6
            );
        });

        // リーチ可能なら通知
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

    // 配牌
    haipai() {
        _.forEach(this.player, p => {
            const tehai = [];
            _.times(13, () => tehai.push(this.yama.pop()));
            p.tehai = tehai.sort((a, b) => a - b);
            this.io.to(p.id).emit('haipai', p.tehai, p.kaze);
        });
    }
}

let currentGameState;
let current_room_id = 0;

// サーバー側処理のエントリポイント
module.exports = io => {
    currentGameState = new GameState(io, 'room_' + current_room_id);
    io.on('connection', async socket => {
        currentGameState.addPlayer(socket);
        socket.on('disconnect', () => {
            currentGameState.removePlayerById(socket.id);
        });
    });
};
