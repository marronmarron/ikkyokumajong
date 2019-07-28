const socket = io();

let pai_img = [];
for (let i = 0; i < 34; i++) {
    var img = new Image();
    img.src = "./images/pai/" + i + ".gif";
    pai_img[i] = img;
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let tehai = []
pai_img[0].addEventListener('load', function() {
    console.log("load complete");
    pai_wid = pai_img[0].width;
    pai_hei = pai_img[0].height;
    left = (canvas.width - 13 * pai_wid) / 2;
    tsumo_left = (canvas.width + 13 * pai_wid) / 2 + 8;
})


socket.on('haipai', haipai => {
    console.log(haipai);
    haipai.sort((a, b) => a - b);
    tehai = haipai;
    drawTehai();
});

socket.on('tsumo', function (tsumoPai) {
    console.log('tsumo : ' + tsumoPai);
    ctx.drawImage(pai_img[Math.floor(tsumoPai / 4)], tsumo_left, canvas.height - pai_hei);
    tehai.push(tsumoPai)//一時的に手牌１４枚になる
});

function dahai(te_num) {
    const da_pai = tehai[te_num];
    console.log('dahai : ' + da_pai);
    socket.emit('dahai', da_pai);
    tehai[te_num] = tehai[13];
    tehai.pop();
    tehai.sort((a, b) => a - b);
    drawTehai();
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

function drawTehai() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let le = left;
    for (let i = 0; i < 13; i++) {
        ctx.drawImage(pai_img[Math.floor(tehai[i] / 4)], le, canvas.height - pai_hei);
        le += pai_wid;
    }
}

canvas.addEventListener('click', onClick, false);