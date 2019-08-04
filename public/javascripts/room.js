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

const w_popup = 40;
const h_popup = 20;
const x_ron = 580;
const y_ron = 550;
const x_pass = x_ron + w_popup + 10;
const y_pass = y_ron;
const x_reach = x_pass;
const y_reach = y_pass - h_popup - 10;
const x_tsumo = x_ron;
const y_tsumo = x_reach;

const popup_back_color = "rgb(200, 200, 200)";
const popup_text_color = "rgb(0, 0, 0)";

const pai_yoko = 28;
const pai_tate = 38;


let tehai;
let tsumopai;
let jikaze;

let pos_kaimen;
let yama;
let num_normal_tsumo;
let num_rinshan_tsumo;
let dora;
let turn;

let ho;
let sarashi;
let is_reach;
let len_tehai;


const eventListenerMap = new Map();


socket.on('haipai', (tehai_, jikaze_, dora_, dice1, dice2) => {
    console.log('haipai: haipai=' + tehai_ + ' jikaze=' + jikaze_);
    jikaze = jikaze_;
    dora = [dora_];
    const oya = (jikaze + 2) % 4;
    const dice = (4 - (dice1 + dice2 - 1) % 4) % 4;
    pos_kaimen = 34 * ((oya + dice) % 4) + 2 * (dice1 + dice2);
    yama = Array(136);
    yama.fill(true);
    for (let i=0; i<52; ++i) {
        yama[(pos_kaimen + i) % 136] = false;
    }
    tsumopai = -1;
    turn = -1;
    num_normal_tsumo = 0;
    num_rinshan_tsumo = 0;
    len_tehai = [13, 13, 13, 13];
    ho = [[], [], [], []];
    sarashi = [[], [], [], []];
    tehai = tehai_;
    tehai.sort((a, b) => a - b);
    drawAll();
    is_reach = [false, false, false, false];
});

socket.on('tsumo', function (tsumo) {
    console.log(tsumo);
    turn = (turn + 1) % 4;
    ++len_tehai[turn];
    yama[(pos_kaimen + 52 + num_normal_tsumo) % 136] = false;
    ++num_normal_tsumo;
    if (turn === jikaze) {
        tsumopai = tsumo.pai;
        createOneTimeListener(canvas, 'click', onClickDahai);
    }
    drawAll();
    drawTsumoPai();
});

socket.on('can_reach', () => {
    console.log("can reach");
    //todo リーチするかしないかきく
    ctx.fillStyle = popup_back_color;
    ctx.fillRect(x_reach, y_reach, w_popup, h_popup);
    ctx.fillStyle = popup_text_color;
    ctx.fillText("リーチ", x_reach, y_reach);
    canvas.addEventListener('click', function(e) {
        console.log('リーチした');
        const rect = e.target.getBoundingClientRect();
        const x	= e.clientX - Math.floor(rect.left);
        const y	= e.clientY - Math.floor(rect.top);
        if (x >= x_reach && x <= x_reach + w_popup && y >= y_reach && y <= y_reach + h_popup) {
            socket.emit('reach');
            canvas.removeEventListener('click', arguments.callee);
        }
    });
});

socket.on('reach', (player) => {
    // TODO 誰かがリーチした通知の処理
    console.log("reach : player=" + player);
});

socket.on('ron', ron => {
    // TODO 誰かがロンした通知の処理
    console.log("ron!");
    console.log(ron);
});

socket.on('naki', naki => {//from使わない
    console.log("naki!");
    console.log(naki);
    ho[turn].pop();
    const naita = new Map([
        ["from", turn],
        ["pai", naki.pai],
        ["show", naki.show]
    ]);
    turn = naki.who;
    len_tehai[turn] -= naki.show.length;
    sarashi[turn].push(naita);
    if (turn === jikaze) {
        for (p of naki.show) {
            tehai.splice(tehai.indexOf(p), 1);
            createOneTimeListener(canvas, 'click', onClickDahai);
        }
    }
    drawAll();
});


socket.on('dahai', (_, pai) => {
    console.log('dahai: pai=' + pai);
    ho[turn].push(pai);
    --len_tehai;
    if (jikaze === turn) {
        if (tsumopai !== -1) tehai.push(tsumopai);
        tehai.splice(tehai.indexOf(pai), 1);
        tehai.sort((a, b) => a - b);
    }
    drawAll();
    tsumopai = -1;
});

socket.on('naki_select',(naki) => {
    console.log(naki);
    ctx.fillStyle = popup_back_color;
    ctx.fillRect(x_pass, y_pass, w_popup, h_popup);
    ctx.fillStyle = popup_text_color;
    ctx.fillText("パス", x_pass, y_pass);
    naki.forEach(na => {
        switch (na.type) {
            case "ron":
                ctx.fillStyle = popup_back_color;
                ctx.fillRect(x_ron, y_ron, w_popup, h_popup);
                ctx.fillStyle = popup_text_color;
                ctx.fillText("ロン", x_ron, y_ron);
                break;
        }
    });
    createOneTimeListener(canvas, 'click', (e) => {
        const rect = e.target.getBoundingClientRect();
        const x	= e.clientX - Math.floor(rect.left);
        const y	= e.clientY - Math.floor(rect.top);
        if (x >= x_pass && x <= x_pass + w_popup && y >= y_pass && y <= y_pass + h_popup) {
            console.log("pass clicked");
            socket.emit('naki', {type: "pass"});
            return true;
        }
        for (let i=0; i<naki.length; ++i) {
            if (naki[i].type === 'ron') {
                if (x >= x_ron && x <= x_ron + w_popup && y >= y_ron && y <= y_ron + h_popup) {
                    console.log("ron clicked");
                    socket.emit('naki', naki[i]);
                    return true;
                }
                continue;
            }
            const tmp = new Map([['chi', 0], ['pon', 1], ['kan', 2]]);
            const ind = tehai.indexOf(naki[i].show[tmp.get(naki[i].type)]);
            const le_x = left + tehai_img[0].width * ind;
            const le_y = canvas.height - tehai_img[0].height;
            if (x >= le_x && x <= le_x + tehai_img[0].width && y >= le_y && y <= le_y + tehai_img[0].height) {
                console.log("naki clicked");
                socket.emit('naki', naki[i]);
                return true;
            }
        }
        return false;
    });
});

document.getElementById('restart-button').addEventListener("click", ()=>{
    console.log("restart");
    socket.emit('restart');
});

function onClickDahai(e) {
    var rect = e.target.getBoundingClientRect();
    const x	= e.clientX - Math.floor(rect.left);
    const y	= e.clientY - Math.floor(rect.top);
    if (x < left || y > canvas.height || y < canvas.height - tehai_img[0].height) return false;
    for (let i=0; i<tehai.length; ++i) {
        if (x < left + (i+1) * tehai_img[0].width) {
            socket.emit('dahai', tehai[i]);
            return true;
        }
    }
    if (tsumopai !== -1 && x >= tsumo_left && x < tsumo_left + tehai_img[0].width) {
        socket.emit('dahai', tsumopai);
        return true;
    }
}

function drawMe() {
    let le = left;
    for (let i = 0; i < tehai.length; i++) {
        ctx.drawImage(tehai_img[Math.floor(tehai[i] / 4)], le, canvas.height - tehai_img[0].height);
        le += tehai_img[0].width;
    }
}

function drawMyHo(mag) {
    let lx = (canvas.width - 6 * ho_img[0][0].width * mag) / 2;
    let ly = (canvas.height + 6 * pai_yoko) / 2;
    for (let i=0; i<ho[jikaze].length; ++i) {
        const img = ho_img[0][Math.floor(ho[jikaze][i] / 4)];
        ctx.drawImage(img, lx, ly, img.width * mag, img.height * mag);
        lx += ho_img[0][0].width * mag;
        if (i % 6 === 5) {
            lx = (canvas.width - 6 * ho_img[0][0].width * mag) / 2;
            ly += pai_tate;
        }
    }
}

function drawShimoHo(mag) {
    let p = (jikaze+1)%4;
    const llx = (canvas.width + 6 * ho_img[0][0].width * mag) / 2;
    const lly = (canvas.height + 6 * pai_yoko) / 2 - pai_yoko;
    let lx = llx + ho_img[1][0].width * mag * Math.floor((ho[p].length - 1) / 6);
    let ly = lly - pai_yoko * ((ho[p].length - 1) % 6);
    for (let i=ho[p].length - 1; i >= 0; --i) {
        const img = ho_img[1][Math.floor(ho[p][i] / 4)];
        ctx.drawImage(img, lx, ly, img.width * mag, img.height * mag);
        ly += pai_yoko;
        if (i % 6 == 0) {
            lx -= img.width * mag;
            ly = lly - 5 * pai_yoko;
        }
    }
}

function drawKamiHo(mag) {
    const p = (jikaze + 3) % 4;
    let lx = (canvas.width - 6 * ho_img[0][0].width * mag) / 2 - ho_img[3][0].width;
    const lly = (canvas.height - 6 * pai_yoko) / 2;
    let ly = lly;
    for (let i=0; i < ho[p].length; -++i) {
        const img = ho_img[3][Math.floor(ho[p][i] / 4)];
        ctx.drawImage(img, lx, ly, img.width * mag, img.height * mag);
        ly += pai_yoko;
        if (i % 6 == 5) {
            lx -= img.width * mag;
            ly = lly;
        }
    }
}

function drawToimenHo(mag) {
    const p = (jikaze + 2) % 4;
    const llx = (canvas.width + 6 * ho_img[2][0].width * mag) / 2 - ho_img[2][0].width * mag;
    const lly = (canvas.height - 6 * pai_yoko) / 2 - ho_img[2][0].height * mag;
    let ly = lly - pai_tate * Math.floor((ho[p].length - 1) / 6);
    let lx = llx - ho_img[2][0].width * mag * ((ho[p].length - 1) % 6);
    for (let i=ho[p].length - 1; i >= 0; --i) {
        const img = ho_img[2][Math.floor(ho[p][i] / 4)];
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

function drawTsumoPai() {
    if (turn === jikaze) {
        ctx.drawImage(tehai_img[Math.floor(tsumopai / 4)], tsumo_left, canvas.height - tehai_img[0].height)
    }
}

function drawShimo() {

}

function drawToimen() {
    let toi = (jikaze + 2) % 4;
    let right = (canvas.width + 13 * ura_img[0].width) / 2 - ura_img[0].width;
    for (let i = 0; i < len_tehai[toi]; i++) {
        ctx.drawImage(ura_img[0], right, 0);
        right -= ura_img[0].width;
    }
}

function drawKami() {

}

function drawYama() {
    const oya = (jikaze + 2) % 4;
    const mag_tate = 0.85;
    const mag_yoko = 0.73;
    const pai_tate = 12;
    const pai_yoko = 25;
    const ini_x = 64;
    const ini_y = [62, 62 + pai_tate];
    for (let b=1; b>=0; --b) {//toimen
        let lx = ini_x;
        const wid = yama_img[0].width * mag_tate;
        const hei = yama_img[0].height * mag_tate;
        for (let i=b; i<34; i+=2) {
            if ((i + 6) % 136 == pos_kaimen) ctx.drawImage(ho_img[2][Math.floor(dora[0]/4)], lx, ini_y[b], wid, hei);
            else if (yama[i]) ctx.drawImage(yama_img[0], lx, ini_y[b], wid ,hei);
            lx += wid;
        }
    }
    for (let b=1; b>=0; --b) {//shimo
        const lx = ini_x + yama_img[0].width * mag_tate * 17;
        let ly = ini_y[b];
        const wid = yama_img[1].width;
        const hei = yama_img[1].height * mag_yoko;
        for (let i=34+b; i<68; i+=2) {
            if ((i + 6) % 136 == pos_kaimen) ctx.drawImage(ho_img[1][Math.floor(dora[0]/4)], lx, ly, wid, hei);
            else if (yama[i]) ctx.drawImage(yama_img[1], lx, ly, wid ,hei);
            ly += pai_yoko;
        }
    }
    for (let b=1; b>=0; --b) {//kami
        let lx = ini_x;
        let ly = ini_y[b] - pai_tate + ura_img[0].height * mag_tate;
        const wid = yama_img[1].width;
        const hei = yama_img[1].height * mag_yoko;
        for (let i=134+b; i>=102; i-=2) {
            if ((i + 6) % 136 == pos_kaimen) ctx.drawImage(ho_img[3][Math.floor(dora[0]/4)], lx, ly, wid, hei);
            else if (yama[i]) ctx.drawImage(yama_img[1], lx, ly, wid ,hei);
            ly += pai_yoko;
        }
    }
    for (let b=1; b>=0; --b) {//me
        let lx = ini_x + yama_img[1].width;
        const ly = ini_y[b] + 17 * pai_yoko;
        const wid = yama_img[0].width * mag_tate;
        const hei = yama_img[0].height * mag_tate;
        for (let i=100+b; i>=68; i-=2) {
            if ((i + 6) % 136 == pos_kaimen) ctx.drawImage(ho_img[0][Math.floor(dora[0]/4)], lx, ly, wid, hei);
            else if (yama[i]) ctx.drawImage(yama_img[0], lx, ly, wid ,hei);
            lx += wid;
        }
    }
}

function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMe();
    drawHo();
    drawShimo();
    drawToimen();
    drawKami();
    drawYama();
    console.log(sarashi);
}

function drawNakiPrompt(naki_type, ...nakeru_pai) {
    
}


function createOneTimeListener(element, event, listener) {
	element.addEventListener(event, function(e) {
        if (listener(e)) {
            element.removeEventListener(event, arguments.callee);
        }
	});
}