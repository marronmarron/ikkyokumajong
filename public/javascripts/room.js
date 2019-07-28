const socket = io();

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let pai_img = [];
for (let i = 0; i < 34; i++) {
    var img = new Image();
    img.src = "./images/pai/" + i + ".gif";
    pai_img[i] = img;
}
pai_img[0].addEventListener('load', function() {
    console.log("load complete");
    pai_wid = pai_img[0].width;
    pai_hei = pai_img[0].height;
    left = (canvas.width - 13 * pai_wid) / 2;
    tsumo_left = (canvas.width + 13 * pai_wid) / 2 + 8;
})

class Player {
    constructer() {
        num_tehai = 13;//ツモ牌は含めない
        ho = [];
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
    console.log('tsumo: player=' + turn + ' pai=' + tsumoPai);
    g_turn = turn;
    --g_yama;
    if (g_turn == g_jikaze) {
        g_tehai.push(tsumoPai);
    }
    drawAll();
});

//turn !== g_jikaze
socket.on('dahai', (turn, pai) => {
    console.log('dahai: player=' + turn +' pai=' + pai);
    g_players[turn].ho.push(pai);
});

function dahai(te_num) {
    const da_pai = g_tehai[te_num];
    socket.emit('dahai', da_pai);
    g_tehai[te_num] = g_tehai[13];
    g_tehai.pop();
    g_tehai.sort((a, b) => a - b);
    g_players[g_jikaze].ho.push(da_pai);
    g_turn = -1;
    drawAll();
}

document.getElementById('restart-button').addEventListener("click", ()=>{
    console.log("restart");
    socket.emit('restart');
});

function onClick(e) {
    if (tehai.length < 14) return;
    const x = e.clientX - canvas.offsetLeft;
    const y = e.clientY - canvas.offsetTop;
    if (x < left || y > canvas.height || y < canvas.height - pai_hei) return;
    for (let i=0; i<13; ++i) {
        if (x < left + (i+1) * pai_wid) {
            dahai(i);
            return;
        }
    }
    if (x >= tsumo_left && x < tsumo_left + pai_wid) {
        dahai(13);
    }
}

function drawMyTehai() {
    let le = left;
    for (let i = 0; i < 13; i++) {
        ctx.drawImage(pai_img[Math.floor(g_tehai[i] / 4)], le, canvas.height - pai_hei);
        le += pai_wid;
    }
}

function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMyTehai();
}

canvas.addEventListener('click', onClick, false);