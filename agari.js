const sh = require('./shanten');

function createAgari(agari, game_state) {
    const player = game_state.player[agari.who];
    const head_candidate = [...Array(34).keys()].filter(it => player.tehai34[it] >= 2);
    const agari_candidate = [];

    if(sh.shantenKokushi(player.tehai34) === -1) {
        agari.is_kokushi = true;
    } else if(sh.shantenChitoi(player.tehai34, head_candidate) === -1 &&
        sh.shantenNormal(player.tehai34, head_candidate, player.fuuro.length) !== -1) {
        agari.is_chitoi = true;
    }

    head_candidate.forEach(head => {
        agari_candidate.push(computeAgariCandidate(agari, game_state, head));
    });

    return agari_candidate.sort((a,b) => b.ten-a.ten)[0];
}

const MACHI = {
    RYAMMEN: 1,
    KANCHAN: 2,
    PENCHAN: 3,
    SHAMPON: 4,
    TANKI: 5
};

const MENTU = {
    SHUNTU:1,
    MINSHUN:2,
    ANKO:3,
    MINKO:4,
    ANKAN:5,
    MINKAN:6,
};

function computeAgariCandidate(agari_origin, game_state, head) {
    const player = game_state.player[agari_origin.who];
    const agari = Object.assign({}, agari_origin);
    let machi_candidate = [];
    const tehai34 = Array(34).fill(0);
    player.tehai.forEach(it => tehai34[Math.floor(it/4)]++);
    tehai34[head] -= 2;
    if(agari.pai === head) {
        machi_candidate.push(MACHI.TANKI);
    }
    let is_pinfu = !player.is_menzen && ![player.kaze, 27, 31, 32 ,33].includes(head);

    const mentu = [];
    for (let i = 0; i < 34; i++) {
        if(tehai34[i] >= 3) {
            mentu.push({type: MENTU.ANKO, pai: [i, i, i]});
            tehai34[i] -= 3;
            is_pinfu = false;
            if(i === agari.pai) {
                machi_candidate.push(MACHI.SHAMPON);
            }
        }

        if(i >= 27) {
            continue;
        }

        while (tehai34[i]) {
            if(i%9>=7 || !tehai34[i+1] || !tehai34[i+2]) {
                break;
            }
            const pai = [i, i+1, i+2];
            mentu.push({type:MENTU.SHUNTU, pai: pai});
            pai.forEach(it => tehai34[it]--);
            if(agari.pai === i && i%9 === 6 || agari.pai === i+2 && i%9 === 0) {
                machi_candidate.push(MACHI.PENCHAN);
            }
            if(agari.pai === i && i%9 !== 6 || agari.pai === i+2 && i%9 !== 0) {
                machi_candidate.push(MACHI.RYAMMEN);
            }
            if(agari.pai === i+1) {
                machi_candidate.push(MACHI.KANCHAN);
            }
        }
    }

    if(mentu.length + player.fuuro.length === 4) {
        if(machi_candidate >= 2) {
            machi_candidate = machi_candidate.filter(it => it !== MACHI.SHAMPON);
        }
        if(machi_candidate >= 2) {
            if(machi_candidate.includes(MACHI.RYAMMEN) && is_pinfu) {
                machi_candidate = machi_candidate.filter(it => it === MACHI.RYAMMEN);
            } else {
                machi_candidate = machi_candidate.filter(it => it !== MACHI.RYAMMEN);
            }
        }
    }


    tehai34[head] += 2;
    return agari;
}

function computeYaku(agari, gs) {
    // agari = {type, who, from, pai, tehai, fuuro}

    const yaku = [];
    const yakuman = [];

    if(player.is_first_turn){
        if(agari.type === "ron") {
            yaku.push({name: "人和", han: 4})
        } else if(player.kaze === 0) {
            yakuman.push({name: "天和", han: 1});
        } else {
            yakuman.push({name: "地和", han: 1});
        }
    }

    if(sh.shantenKokushi(player.tehai34) === -1) {
        if(player.tehai34[Math.floor(agari.pai/4)] === 2) {
            yakuman.push({name: "国士無双１３面", han: 2});
        } else {
            yakuman.push({name: "国士無双", han: 1});
        }
        return yakuman;
    }

    const head_candidate = [...Array(34).keys()].filter(it => player.tehai34[it] >= 2);

    if (player.is_menzen && agari.type === "tsumo") {
        yaku.push({name: "門前清自摸和", han: 1});
    }
    if (player.is_double_reach ) {
        yaku.push({name: "両立直", han: 2});
    } else if (player.is_reach) {
        yaku.push({name: "立直", han: 1});
    }
    if (player.is_ippatu) {
        yaku.push({name: "一発", han: 1});
    }
    if(gs.is_kan_turn && agari.type === "ron") {
        yaku.push({name: "槍槓", han: 1});
    } else if(gs.is_kan_turn && agari.type === "tsumo") {
        yaku.push({name: "嶺上開花", han: 1});
    }
    if (gs.yama.length === 14 && agari.type === "tsumo") {
        yaku.push({name: "海底摸月", han: 1});
    } else if (gs.yama.length === 14 && agari.type === "ron") {
        yaku.push({name: "河底撈魚", han: 1});
    }

    if(sh.shantenChitoi(player.tehai34, head_candidate) === -1 &&
        sh.shantenNormal(player.tehai34, head_candidate, player.fuuro.length) !== -1) {
        agari.is_chitoi = true;
        yaku.push({name: "七対子", han: 2});
        return yaku;
    }





}

module.exports = createAgari;

var YAKU=[
    //// 一飜
    /*  0~ 4 */"門前清自摸和","立直","一発","槍槓","嶺上開花",
    /*  5~ 9 */"海底摸月","河底撈魚","平和","断幺九","一盃口",
    /* 10~13 */"自風 東","自風 南","自風 西","自風 北",
    /* 14~17 */"場風 東","場風 南","場風 西","場風 北",
    /* 18~20 */"役牌 白","役牌 發","役牌 中",
    //// 二飜
    /* 21~25 */"両立直","七対子","混全帯幺九","一気通貫","三色同順",
    /* 26~31 */"三色同刻","三槓子","対々和","三暗刻","小三元","混老頭",
    //// 三飜
    /* 32~34 */"二盃口","純全帯幺九","混一色",
    //// 六飜
    /* 35 */"清一色",
    //// 満貫
    /* 36 */"人和",
    //// 役満
    /* 37~42 */"天和","地和","大三元","四暗刻","四暗刻単騎","字一色",
    /* 43~47 */"緑一色","清老頭","九蓮宝燈","純正九蓮宝燈","国士無双",
    /* 48~51 */"国士無双１３面","大四喜","小四喜","四槓子",
    //// 懸賞役
    /* 52~54 */"ドラ","裏ドラ","赤ドラ"
];