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
    fuuro = [];
    is_menzen = true;
    is_reach_try = false;
    is_reach = false;
    current_tsumo;
    shanten;

    constructor(socket, room, kaze) {
        this.socket = socket;
        this.id = socket.id;
        this.room = room;
        this.kaze = kaze;
    }

    tehaiAdd(pai) {
        if(this.tehai.includes(pai)) {
            console.log("tehaiAdd error : tehai=" + this.tehai + " pai=" + pai);
        }
        this.tehai.push(pai);
        this.tehai.sort();

        const pai34 = Math.floor(pai/4);
        if(this.tehai34[pai34] >= 4) {
            console.log("tehaiAdd error : tehai34=" + this.tehai34 + " pai=" + pai);
        }
        this.tehai34[pai34]++;
        this.shanten = getShanten(this.tehai);
    }

    tehaiRemove(pai) {
        if(!this.tehai.includes(pai)) {
            console.log("tehaiRemove error : tehai=" + this.tehai + " pai=" + pai);
        }
        this.tehai = this.tehai.filter(it => it !== pai);

        const pai34 = Math.floor(pai/4);
        if(this.tehai34[pai34] <= 0) {
            console.log("tehaiRemove error : tehai34=" + this.tehai34 + " pai=" + pai);
        }
        this.tehai34[pai34]--;
        this.shanten = getShanten(this.tehai);
    }

    naki(naki) {
        console.log("naki : type=" + naki.type);
        this.fuuro.push(naki);
        naki.show.forEach(it => this.tehaiRemove(it));
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
            player.tehaiRemove(pai);

            // リーチをかけたがテンパイしない打牌を弾く
            if(player.is_reach_try && player.shanten !== 0) {
                player.tehaiAdd(pai);
                console.log("dahai error : reach & tehai=" + player.tehai);
                return;
            }
            // クライアントに通知 + 確認
            console.log('dahai : player=' + this.turn + ' pai=' + pai);
            // this.io.in(this.room).emit('dahai', this.turn, pai);
            this.io.in(this.room).emit('dahai', this.turn, 17);

            //鳴けるorロンできるかをクライアントに通知
            _.forEach(this.player.filter(it => it !== player), p => {
                const naki_list = [];

                // ロンチェック
                if(getShanten(p.tehai.concat(pai)) === -1) {
                    naki_list.push({type: "ron", pai: pai})
                }

                // カンチェック
                if(p.tehai34[pai34] === 3) {
                    const show = p.tehai.filter(it => Math.floor(it/4) === pai34);
                    naki_list.push({type: "kan", pai: pai, show: show});
                }

                // ポンチェック
                if(p.tehai34[pai34] >= 2) {
                    const show = _.take(p.tehai.filter(it => Math.floor(it/4) === pai34), 2);
                    naki_list.push({type: "pon", pai: pai, show: show});
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
                        naki_list.push({type: "chi", pai: pai, show: show});
                    }
                    // 中チー(4[5]6)チェック
                    if(num !== 0 && num!== 8 && p.tehai34[pai34-1] && p.tehai34[pai34+1]) {
                        const show = [
                            _.find(p.tehai, it => Math.floor(it/4) === pai34-1),
                            _.find(p.tehai, it => Math.floor(it/4) === pai34+1)
                        ];
                        naki_list.push({type: "chi", pai: pai, show: show});
                    }
                    // 下チー([5]67)チェック
                    if(num !== 7 && num!== 8 && p.tehai34[pai34+1] && p.tehai34[pai34+2]) {
                        const show = [
                            _.find(p.tehai, it => Math.floor(it/4) === pai34+1),
                            _.find(p.tehai, it => Math.floor(it/4) === pai34+2)
                        ];
                        naki_list.push({type: "chi", pai: pai, show: show});
                    }
                }

                // クライアントに鳴けることを通知
                p.naki_candidate = naki_list;
                if(naki_list.length) {
                    this.current_naki_wait.push(p.kaze);
                    this.io.to(p.id).emit('naki_select', naki_list);
                }
            });

            // 打牌の更新
            this.current_dahai = pai;

            // 鳴き待ちが発生したら抜けて、鳴き通知を待つ。
            if(this.current_naki_wait) {
                console.log("naki waiting");
                return;
            }

            this.turnUpdate((this.turn+1)%4);
            this.tsumo(true);
        });

        socket.on('naki', naki_selected => {
            console.log(naki_selected);
            const who = _.find(this.player, p => p.id === socket.id);

            // todo naki_candidate にないものを返してきたらエラー
            // if(!who.naki_candidate.toString(JSON.stringify(naki).toString()) {
            //     console.log("naki error : candidate=" + who.naki_candidate + " naki=" + naki);
            //     return;
            // }

            // 選択された鳴き方を記録
            if(naki_selected.type !== "pass") {
                naki_selected.who = who.kaze;
                naki_selected.from = this.turn;
                who.naki_selected = naki_selected;
            }

            this.current_naki_wait = this.current_naki_wait.filter(it => it !== who.kaze);
            if(this.current_naki_wait.length) {
                console.log("current naki wait = player" + this.current_naki_wait);
                return;
            }

            _.forEach(this.player, p => {
                if(p.naki_selected) {
                    this.current_naki_selected.push(p.naki_selected);
                }
            });
            console.log(this.current_naki_selected);
            const ron = this.current_naki_selected.filter(it => it.type === "ron");
            const kan = this.current_naki_selected.filter(it => it.type === "kan");
            const pon = this.current_naki_selected.filter(it => it.type === "pon");
            const chi = this.current_naki_selected.filter(it => it.type === "chi");

            if(ron.length) {
                console.log(ron);
                _.forEach(ron, r => {
                    this.io.in(this.room).emit('ron', {
                        who: r.who,
                        from: this.turn,
                        pai: this.current_dahai,
                        tehai: this.player[r.who].tehai.concat(this.current_dahai),
                    });
                });
                return;
            }

            if(kan.length) {
                this.io.in(this.room).emit('naki', kan[0]);
                this.player[kan[0].who].naki(kan[0]);
                this.turnUpdate(kan[0].who);
                this.tsumo(true);
                return;
            }

            if(pon.length) {
                this.io.in(this.room).emit('naki', pon[0]);
                this.player[pon[0].who].naki(pon[0]);
                this.turnUpdate(pon[0].who);
                return;
            }

            if(chi.length) {
                this.io.in(this.room).emit('naki', chi[0]);
                this.player[chi[0].who].naki(chi[0]);
                this.turnUpdate(chi[0].who);
                return;
            }

            this.turnUpdate((this.turn+1)%4);
            this.tsumo(true);
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

    turnUpdate(nextTurn) {
        // リーチ成立
        if(this.player[this.turn].is_reach_try) {
            this.player[this.turn].is_reach_try = false;
            this.player[this.turn].is_reach = true;
        }

        // 次の番に移る
        this.turn = nextTurn;
        this.current_naki_wait = [];
        this.current_naki_selected = [];
        _.forEach(this.player, p => p.naki_candidate = null);
        _.forEach(this.player, p => p.naki_selected = null);
    }
    // ツモ時の処理
    tsumo(is_rinshan) {
        const player = this.player[this.turn];
        // const pai = this.yama.pop();
        const pai = 17;
        player.current_tsumo = pai;
        this.player[this.turn].tehaiAdd(pai);
        console.log('tsumo : player=' + this.turn + ' pai=' + pai + ' shanten=' + player.shanten);

        const ankan_candidate = [...Array(34).keys()].filter(it => player.tehai34[it] === 4).map(it => it*4);
        const kakan_candidate = player.fuuro.filter(it => it.type === "pon")
            .map(it => 6 + 4 * Math.floor(it.pai/4) - _.sum(it.show.concat(it.pai)))
            .filter(it => player.tehai.includes(it));

        // クライアントに通知(番の人にだけパラメータ送信)
        _.forEach(this.player, p => {
            this.io.to(p.id).emit('tsumo', this.turn !== p.kaze ? { who: this.turn, is_rinshan: is_rinshan } : {
                who: this.turn,
                pai: pai,
                can_reach: player.shanten <= 0 && p.is_reach,
                ankan_candidate: ankan_candidate,
                kakan_candidate: kakan_candidate,
                can_hora: player.shanten === -1,
                can_kyushu: false,
                is_rinshan: is_rinshan,
            });
        });
    }

    gameStart() {
        console.log("GAME START " + this.room);
        this.yama = _.shuffle([...Array(136).keys()]);
        this.haipai();
        this.tsumo();
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
