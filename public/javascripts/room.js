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

tehai_img[0].addEventListener('load', function() {
    console.log("load complete");
    left = (canvas.width - 13 * tehai_img[0].width) / 2;
    tsumo_left = (canvas.width + 13 * tehai_img[0].width) / 2 + 8;
})
const pai_yoko = 10;
const pai_tate = 44;

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

//TODO 引数にdoraを入れる、yamaの枚数
socket.on('haipai', (haipai, jikaze) => {
    console.log('haipai: haipai=' + haipai + ' jikaze=' + jikaze);
    g_jikaze = jikaze;
    g_turn = -1;
    g_yama = 100;
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
    socket.emit('reach');
});

//turn === g_jikaze になることもある
socket.on('dahai', (turn, pai) => {
    console.log('dahai: turn=' + turn +' pai=' + pai);
    g_players[turn].ho.push(pai);
    g_turn = -1;
    drawAll();
});

function self_dahai(te_num) {
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
    const x = e.clientX - canvas.offsetLeft;
    const y = e.clientY - canvas.offsetTop;
    if (x < left || y > canvas.height || y < canvas.height - tehai_img[0].height) return;
    for (let i=0; i<13; ++i) {
        if (x < left + (i+1) * tehai_img[0].width) {
            self_dahai(i);
            return;
        }
    }
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

function drawHo() {
    let lx = (canvas.width - 6 * ho_img[0][0].width) / 2;
    let ly = (canvas.height + 6 * pai_yoko) / 2;
    for (let i=0; i<g_players[g_jikaze].ho.length; ++i) {
        ctx.drawImage(ho_img[0][Math.floor(g_players[g_jikaze].ho[i] / 4)], lx, ly);
        lx += ho_img[0][0].width;
        if (i % 6 === 5) {
            lx = (canvas.width - 6 * ho_img[0][0].width) / 2;
            ly += pai_tate;
        }
    }
}

function drawShimo() {

}

function drawToimen() {

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