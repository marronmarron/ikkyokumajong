const _ = require('lodash');
const getShanten = require('./shanten');

class Player {
    socket;
    id;
    room;
    kaze;
    tehai;
    tehai34;
    naki_candidate;
    naki_selected;
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
    current_naki_wait = [];
    current_naki_selected = [];

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
            const pai34 = Math.floor(pai/4);
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
            player.tehai34[pai34]--;

            // リーチをかけたがテンパイしない打牌を弾く
            if(player.is_reach_try && getShanten(player.tehai) !== 0) {
                player.tehai.push(pai);
                player.tehai34[pai34]++;
                console.log("dahai error : reach & tehai=" + player.tehai);
                return;
            }
            // クライアントに通知 + 確認
            console.log('dahai : player=' + this.turn + ' pai=' + pai);
            // this.io.in(this.room).emit('dahai', this.turn, pai);
            this.io.in(this.room).emit('dahai', this.turn, 17);

            //鳴けるorロンできるかをクライアントに通知
            _.forEach(this.player.filter(it => it !== player), p => {
                const naki = [];

                // ロンチェック
                p.tehai.push(pai);
                if(getShanten(p.tehai) === -1) {
                    naki.push({type: "ron", pai: pai})
                }
                p.tehai = p.tehai.filter(it => it !== pai);

                // カンチェック
                if(p.tehai34[pai34] === 3) {
                    const show = p.tehai.filter(it => Math.floor(it/4) === pai34);
                    naki.push({type: "kan", pai: pai, show: show});
                }

                // ポンチェック
                if(p.tehai34[pai34] >= 2) {
                    const show = _.take(p.tehai.filter(it => Math.floor(it/4) === pai34), 2);
                    naki.push({type: "pon", pai: pai, show: show});
                }

                // チーチェック
                if(p.kaze === (this.turn+1)%4 && pai34 < 27) {
                    const num = pai34%9;
                    // 上チー(34[5])チェック
                    if(num !== 0 && num!== 1 && p.tehai34[pai34-2] && p.tehai34[pai34-1]) {
                        const show = [
                            _.find(p.tehai, it => Math.floor(it/4) === pai34-2),
                            _.find(p.tehai, it => Math.floor(it/4) === pai34-1)
                        ];
                        naki.push({type: "chi", pai: pai, show: show});
                    }
                    // 中チー(4[5]6)チェック
                    if(num !== 0 && num!== 8 && p.tehai34[pai34-1] && p.tehai34[pai34+1]) {
                        const show = [
                            _.find(p.tehai, it => Math.floor(it/4) === pai34-1),
                            _.find(p.tehai, it => Math.floor(it/4) === pai34+1)
                        ];
                        naki.push({type: "chi", pai: pai, show: show});
                    }
                    // 下チー([5]67)チェック
                    if(num !== 7 && num!== 8 && p.tehai34[pai34+1] && p.tehai34[pai34+2]) {
                        const show = [
                            _.find(p.tehai, it => Math.floor(it/4) === pai34+1),
                            _.find(p.tehai, it => Math.floor(it/4) === pai34+2)
                        ];
                        naki.push({type: "chi", pai: pai, show: show});
                    }
                }

                // クライアントに鳴けることを通知
                p.naki_candidate = naki;
                if(naki) {
                    this.current_naki_wait.push(p.kaze);
                    this.io.to(p.id).emit('naki',naki);
                }
            });

            // 打牌の更新
            this.current_dahai = pai;

            // 鳴き待ちが発生したら抜けて、鳴き通知を待つ。
            if(this.current_naki_wait) {
                return;
            }

            // リーチ成立
            if(player.is_reach_try) {
                player.is_reach = true;
            }

            // 次の番に移る
            this.turn = ++this.turn%4;
            this.current_naki_wait = [];
            _.forEach(this.player, p => p.naki_candidate = []);
            this.tsumo(this.turn);
        });

        socket.on('naki', naki => {
            const who = _.find(this.player, p => p.id === socket.id);
            const from = this.player[this.turn];

            // naki_candidate にないものを返してきたらエラー
            if(!who.naki_candidate.includes(naki)) {
                console.log("naki error : candidate=" + who.naki_candidate + " naki=" + naki);
                return;
            }

            // 選択された鳴き方を記録
            if(naki.type !== "pass") {
                naki.who = who.kaze;
                naki.from = this.turn;
                who.naki_selected = naki;
            }

            this.current_naki_wait = this.current_naki_wait.filter(it => it !== who.kaze);
            if(this.current_naki_wait) {
                return;
            }
            _.forEach(this.player, p => {
                if(p.naki_selected) {
                    this.current_naki_selected.push(p.naki_selected);
                }
            });
            const ron = this.current_naki_selected.filter(it => it.type === "ron");
            const kan = this.current_naki_selected.filter(it => it.type === "kan");
            const pon = this.current_naki_selected.filter(it => it.type === "pon");
            const chi = this.current_naki_selected.filter(it => it.type === "chi");

            if(ron) {
                _.forEach(ron, r => {
                    this.io.in(this.room).emit('ron', {
                        who: r.who.kaze,
                        from: this.turn,
                        pai: this.current_dahai,
                        tehai: this.player[r.who].tehai,
                    });
                });
                return;
            }

            if(kan) {
                this.io.in(this.room).emit('naki_notice', kan[0]);
                return;
            }

            if(pon) {
                this.io.in(this.room).emit('naki_notice', pon[0]);
                return;
            }

            if(chi) {
                this.io.in(this.room).emit('naki_notice', chi[0]);
                return;
            }
        });

        // アガリ時の処理(古い)
        socket.on('agari', () => {
            // アガリ情報を変数化
            const who = _.find(this.player, p => p.id === socket.id);
            const from = this.player[this.turn];
            const type = (who === from) ? "tsumo" : "ron";
            const pai = (type === "tsumo") ? who.current_tsumo : this.current_dahai;

            // ロンなら手牌にアガリ牌を入れてshanten = -1にしておく
            if(type === "ron") {
                who.tehai.push(pai);
                who.tehai34[pai]++;
            }
            // アガれていない手牌を弾く
            if(getShanten(who.tehai) !== -1) {
                console.log("agari error : tehai = " + who.tehai);
                if(type === "ron") {
                    who.tehai = _.filter(who.tehai, p !== pai);
                }
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
            });
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
        // const pai = this.yama.pop();
        const pai = 17;
        const pai34 = Math.floor(pai/4);
        player.current_tsumo = pai;
        this.player[turn].tehai.push(pai);
        this.player[turn].tehai34[pai34]++;
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
        const dora = this.yama[0];
        const dice1 = 1 + Math.floor(Math.random()*6);
        const dice2 = 1 + Math.floor(Math.random()*6);
        _.forEach(this.player, p => {
            const tehai = [];
            _.times(13, () => tehai.push(this.yama.pop()));
            // p.tehai = tehai.sort((a, b) => a - b);
            p.tehai = [8,12,16,18,19,20,24,129,130,131,133,134,135];
            p.tehai34 = Array(34).fill(0);
            _.forEach(p.tehai, pai => p.tehai34[Math.floor(pai/4)]++);
            this.io.to(p.id).emit('haipai', p.tehai, p.kaze, dora, dice1, dice2);
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
