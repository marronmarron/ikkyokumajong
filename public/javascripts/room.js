const socket = io();

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');


function load_imgs(dir) {
    let imgs = [];
    for (let i=0; i<34; ++i) {
        let img = new Image();
        img.src = "./images/" + dir + "/" + i + ".gif"
        imgs.push(img);
    }
    return imgs;
}

const tehai_img = load_imgs("pai");
let ho_img = [];
for (let i=0; i<4; ++i) {
    ho_img.push(load_imgs("pai_" + i));
}
let ura_img = []
let img = new Image();
img.src = "./images/ura/" + 0 + ".gif"
ura_img.push(img);
let yama_img = []
for (let i=0; i<2; ++i) {
    let img = new Image();
    img.src = "./images/ura/yama_" + i + ".gif"
    yama_img.push(img);
}

tehai_img[0].addEventListener('load', function() {
    console.log("load complete");
    left = (canvas.width - 13 * tehai_img[0].width) / 2;
    tsumo_left = (canvas.width + 13 * tehai_img[0].width) / 2 + 8;
})
const pai_yoko = 28;
const pai_tate = 38;

class Player {
    constructor() {
        this.num_tehai = 13;//ツモ牌は含めない
        this.ho = [];
    }
}

let g_tehai = []
let g_jikaze;

let g_yama;
let g_dora;
let g_turn;
let g_players = []

//TODO 引数にdoraを入れる
socket.on('haipai', (haipai, jikaze) => {
    console.log('haipai: haipai=' + haipai + ' jikaze=' + jikaze);
    g_jikaze = jikaze;
    g_turn = -1;
    g_yama = 84;
    for (let i=0; i<4; ++i) {
        g_players[i] = new Player();
    }
    g_tehai = haipai;
    g_tehai.sort((a, b) => a - b);
    drawAll();
});

socket.on('tsumo', function (turn, tsumoPai) {
    console.log('tsumo: turn=' + turn + ' pai=' + tsumoPai);
    g_turn = turn;
    --g_yama;
    if (g_turn === g_jikaze) {
        g_tehai.push(tsumoPai);
    }
    drawAll();
});

socket.on('can_reach', () => {
    console.log("can reach");
    //todo リーチするかしないかきく
    socket.emit('reach');
});

socket.on('reach', (player) => {
    // TODO 誰かがリーチした通知の処理
    console.log("reach : player=" + player);
});


//turn === g_jikaze になることもある
socket.on('dahai', (turn, pai) => {
    console.log('dahai: turn=' + turn +' pai=' + pai);
    g_players[turn].ho.push(pai);
    g_turn = -1;
    drawAll();
});

function self_dahai(te_num) {
    console.log("self_dahai" + te_num);
    const da_pai = g_tehai[te_num];
    socket.emit('dahai', da_pai);
    g_tehai[te_num] = g_tehai[13];
    g_tehai.pop();
    g_tehai.sort((a, b) => a - b);
    // g_players[g_jikaze].ho.push(da_pai);
    // g_turn = -1;
    // drawAll();
}

document.getElementById('restart-button').addEventListener("click", ()=>{
    console.log("restart");
    socket.emit('restart');
});

function onClick(e) {
    if (g_turn !== g_jikaze) return;
    var rect	= e.target.getBoundingClientRect();
    const x	= e.clientX - Math.floor(rect.left);
    const y	= e.clientY - Math.floor(rect.top);
    // const x = e.clientX - canvas.offsetLeft;
    // const y = e.clientY - canvas.offsetTop;
    if (x < left || y > canvas.height || y < canvas.height - tehai_img[0].height) return;
    for (let i=0; i<13; ++i) {
        if (x < left + (i+1) * tehai_img[0].width) {
            self_dahai(i);
            return;
        }
    }
        console.log(-1);
    if (x >= tsumo_left && x < tsumo_left + tehai_img[0].width) {
        self_dahai(13);
    }
}

function drawMe() {
    let le = left;
    for (let i = 0; i < 13; i++) {
        ctx.drawImage(tehai_img[Math.floor(g_tehai[i] / 4)], le, canvas.height - tehai_img[0].height);
        le += tehai_img[0].width;
    }
    if (g_turn === g_jikaze) {
        ctx.drawImage(tehai_img[Math.floor(g_tehai[13] / 4)], tsumo_left, canvas.height - tehai_img[0].height)
    }
}

function drawMyHo(mag) {
    let lx = (canvas.width - 6 * ho_img[0][0].width * mag) / 2;
    let ly = (canvas.height + 6 * pai_yoko) / 2;
    for (let i=0; i<g_players[g_jikaze].ho.length; ++i) {
        const img = ho_img[0][Math.floor(g_players[g_jikaze].ho[i] / 4)];
        ctx.drawImage(img, lx, ly, img.width * mag, img.height * mag);
        lx += ho_img[0][0].width * mag;
        if (i % 6 === 5) {
            lx = (canvas.width - 6 * ho_img[0][0].width * mag) / 2;
            ly += pai_tate;
        }
    }
}

function drawShimoHo(mag) {
    const ho = g_players[(g_jikaze+1)%4].ho;
    const llx = (canvas.width + 6 * ho_img[0][0].width * mag) / 2;
    const lly = (canvas.height + 6 * pai_yoko) / 2 - pai_yoko;
    let lx = llx + ho_img[1][0].width * mag * Math.floor((ho.length - 1) / 6);
    let ly = lly - pai_yoko * ((ho.length - 1) % 6);
    for (let i=ho.length - 1; i >= 0; --i) {
        const img = ho_img[1][Math.floor(ho[i] / 4)];
        ctx.drawImage(img, lx, ly, img.width * mag, img.height * mag);
        ly += pai_yoko;
        if (i % 6 == 0) {
            lx -= img.width * mag;
            ly = lly - 5 * pai_yoko;
        }
    }
}

function drawKamiHo(mag) {
    const ho = g_players[(g_jikaze+3)%4].ho;
    let lx = (canvas.width - 6 * ho_img[0][0].width * mag) / 2 - ho_img[3][0].width;
    const lly = (canvas.height - 6 * pai_yoko) / 2;
    let ly = lly;
    for (let i=0; i < ho.length; -++i) {
        const img = ho_img[3][Math.floor(ho[i] / 4)];
        ctx.drawImage(img, lx, ly, img.width * mag, img.height * mag);
        ly += pai_yoko;
        if (i % 6 == 5) {
            lx -= img.width * mag;
            ly = lly;
        }
    }
}

function drawToimenHo(mag) {
    const ho = g_players[(g_jikaze+2)%4].ho;
    const llx = (canvas.width + 6 * ho_img[2][0].width * mag) / 2 - ho_img[2][0].width * mag;
    const lly = (canvas.height - 6 * pai_yoko) / 2 - ho_img[2][0].height * mag;
    let ly = lly - pai_tate * Math.floor((ho.length - 1) / 6);
    let lx = llx - ho_img[2][0].width * mag * ((ho.length - 1) % 6);
    for (let i=ho.length - 1; i >= 0; --i) {
        const img = ho_img[2][Math.floor(ho[i] / 4)];
        ctx.drawImage(img, lx, ly, img.width * mag, img.height * mag);
        lx += img.width * mag;
        if (i % 6 == 0) {
            lx = llx - 5 * img.width * mag;
            ly += pai_tate;
        }
    }
}

function drawHo() {
    const mag = 0.85
    drawMyHo(mag);
    drawShimoHo(mag);
    drawToimenHo(mag);
    drawKamiHo(mag);
}

function drawShimo() {

}

function drawToimen() {
    let toi = g_players[(g_jikaze + 2) % 4];
    let right = (canvas.width + 13 * ura_img[0].width) / 2 - ura_img[0].width;
    for (let i = 0; i < toi.num_tehai; i++) {
        ctx.drawImage(ura_img[0], right, 0);
        right -= ura_img[0].width;
    }
    if (g_turn === (g_jikaze + 2) % 4) {
        ctx.drawImage(ura_img[0], right - 8, 0)
    }
}

function drawKami() {

}

function drawYama() {

}

function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMe();
    drawHo();
    drawShimo();
    drawToimen();
    drawKami();
    drawYama();
}

canvas.addEventListener('click', onClick, false);