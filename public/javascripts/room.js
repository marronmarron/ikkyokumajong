const socket = io();

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function load_imgs(dir) {
    let imgs = [];
    for (let i=0; i<34; ++i) {
        const img = new Image();
        img.src = "./images/" + dir + "/" + i + ".gif"
        imgs.push(img);
    }
    return imgs;
}

const tehai_img = load_imgs("pai");
const ho_img = [];
for (let i=0; i<4; ++i) {
    ho_img.push(load_imgs("pai_" + i));
}
const rebou_img = [];
for (let i=0; i<2; ++i) {
    const img = new Image();
    img.src = "./images/rebou" + i + ".gif";
    rebou_img.push(img);
}

document.getElementById('restart-button').addEventListener("click", ()=>{
    console.log("restart");
    socket.emit('restart');
});

const pai_yoko = 28;
const pai_tate = 38;

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
const x_tehaileft = 60;
const y_tehaileft = canvas.height - 50;

let tehai;
let jikaze;

let pos_kaimen;
let yama;
let num_normal_tsumo;
let num_rinshan_tsumo;
let dora;
let tsumo_or_naki;

let ho;
let sarashi;
let is_reach;
let len_tehai;

let listener;

socket.on('haipai', (tehai_, jikaze_, dora_, dice1, dice2) => {
    console.log(tehai_);
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
    num_normal_tsumo = 0;
    num_rinshan_tsumo = 0;
    len_tehai = [13, 13, 13, 13];
    ho = [[], [], [], []];
    sarashi = [[], [], [], []];
    tehai = tehai_;
    tehai.sort((a, b) => a - b);
    is_reach = [false, false, false, false];
    drawAll();
    listener = new Map();
});

socket.on('tsumo', function (tsumo) {
    console.log("tsumo");
    console.log(tsumo);
    tsumo_or_naki = "tsumo";
    if (tsumo.is_rinshan) {
        ++num_rinshan_tsumo;
        yama[(136 + pos_kaimen - num_rinshan_tsumo) % 136] = false;
    } else {
        yama[(pos_kaimen + 52 + num_normal_tsumo) % 136] = false;
        ++num_normal_tsumo;
    }
    ++len_tehai[tsumo.who];
    if (tsumo.who === jikaze) {
        tehai.push(tsumo.pai);
    }
    drawAll();
    if (tsumo.who !== jikaze) return;
    if (tsumo.can_hora) {
        ctx.fillStyle = popup_back_color;
        ctx.fillRect(x_tsumo, y_tsumo, w_popup, h_popup);
        ctx.fillStyle = popup_text_color;
        ctx.fillText("ツモ", x_tsumo, y_tsumo);
    }
    if (tsumo.can_reach) {
        ctx.fillStyle = popup_back_color;
        ctx.fillRect(x_reach, y_reach, w_popup, h_popup);
        ctx.fillStyle = popup_text_color;
        ctx.fillText("リーチ", x_reach, y_reach);
    }
    let reach_clicked = false;
    registerListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();
        const x	= e.clientX - Math.floor(rect.left);
        const y	= e.clientY - Math.floor(rect.top);
        if (!reach_clicked && tsumo.can_reach && x >= x_reach && x <= x_reach + w_popup && y >= y_reach && y <= y_reach + h_popup) {
            reach_clicked = true;
            socket.emit("reach");
            ctx.clearRect(x_reach, y_reach, w_popup, h_popup);
            ctx.clearRect(x_tsumo, y_tsumo, w_popup, h_popup);
            return;
        }
        if (!reach_clicked && tsumo.can_hora && x >= x_tsumo && x <= x_tsumo + w_popup && y >= y_tsumo && y <= y_tsumo + h_popup) {
            socket.emit("tsumo");
            return;
        }
        onClickDahai(x, y);
    });
});

socket.on('reach', (player) => {
    console.log("reach : player=" + player);
    is_reach[player] = true;
    drawReach(player);
});

socket.on('ron', ron => {
    console.log("ron!");
    console.log(ron);
    removeListener();
});

socket.on('tsumo', tsumo => {
    console.log("tsumo!");
    console.log(tsumo);
    removeListener();
});

socket.on('naki', naki => {
    console.log("naki!");
    console.log(naki);
    removeListener();
    ho[naki.from].pop();
    const naita = new Map([
        ["from", naki.from],
        ["pai", naki.pai],
        ["show", naki.show]
    ]);
    tsumo_or_naki = "naki";
    len_tehai[naki.who] -= naki.show.length;
    sarashi[naki.who].push(naita);
    if (naki.who === jikaze) {
        for (p of naki.show) {
            tehai.splice(tehai.indexOf(p), 1);
        }
        registerListener('click', (e) => {
            const rect = e.target.getBoundingClientRect();
            const x	= e.clientX - Math.floor(rect.left);
            const y	= e.clientY - Math.floor(rect.top);
            onClickDahai(x, y);
        });
    }
    drawAll();
});

socket.on('dahai', (who, pai) => {
    console.log('dahai: pai=' + pai);
    removeListener();
    ho[who].push(pai);
    --len_tehai;
    if (jikaze === who) {
        tehai.splice(tehai.indexOf(pai), 1);
        tehai.sort((a, b) => a - b);
    }
    drawAll();
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
    registerListener("click", (e) => {
        const rect = e.target.getBoundingClientRect();
        const x	= e.clientX - Math.floor(rect.left);
        const y	= e.clientY - Math.floor(rect.top);
        if (x >= x_pass && x <= x_pass + w_popup && y >= y_pass && y <= y_pass + h_popup) {
            console.log("pass clicked");
            socket.emit('naki', {type: "pass"});
            ctx.clearRect(x_pass, y_pass, w_popup, h_popup);
            ctx.clearRect(x_ron, y_ron, w_popup, h_popup);
            return;
        }
        for (let i=0; i<naki.length; ++i) {
            if (naki[i].type === 'ron') {
                if (x >= x_ron && x <= x_ron + w_popup && y >= y_ron && y <= y_ron + h_popup) {
                    console.log("ron clicked");
                    socket.emit('naki', naki[i]);
                    ctx.clearRect(x_pass, y_pass, w_popup, h_popup);
                    ctx.clearRect(x_ron, y_ron, w_popup, h_popup);
                    return;
                }
                continue;
            }
            const tmp = new Map([['chi', 0], ['pon', 1], ['kan', 2]]);
            const ind = tehai.indexOf(naki[i].show[tmp.get(naki[i].type)]);
            const le_x = x_tehaileft + tehai_img[0].width * ind;
            if (x >= le_x && x <= le_x + tehai_img[0].width && y >= y_tehaileft && y <= y_tehaileft + tehai_img[0].height) {
                console.log("naki clicked");
                socket.emit('naki', naki[i]);
                return;
            }
        }
    });
});

function onClickDahai(x, y) {
    if (x < x_tehaileft || y > y_tehaileft + tehai_img[0].height || y < y_tehaileft) return false;
    let left = x_tehaileft;
    for (let i=0; i<tehai.length; ++i) {
        if (i === tehai.length - 1 && tsumo_or_naki === "tsumo") {
            left += 8;
        }
        if (x > left && x < left + tehai_img[0].width) {
            socket.emit('dahai', tehai[i]);
            return;
        }
        left += tehai_img[0].width;
    }
}

function registerListener(event, fun) {
    listener.set("event", event);
    listener.set("name", fun);
    canvas.addEventListener(event, fun);
}

function removeListener() {
    canvas.removeEventListener(listener.get("event"), listener.get("name"));
}

////////////////////////////////////////////////////////////////////////
//以下描画//以下描画//以下描画//以下描画//以下描画//以下描画//以下描画//
////////////////////////////////////////////////////////////////////////
function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMe();
    drawHo();
    for (let i=0; i<4; ++i) {
        if (is_reach[i]) drawReach(i);
    }
    console.log(sarashi);
}

function drawMe() {
    let left = x_tehaileft;
    for (let i = 0; i < tehai.length; ++i) {
        if (i === tehai.length - 1 && tehai.length % 3 === 2 && tsumo_or_naki === 'tsumo') {
            left += 8;
        }
        ctx.drawImage(tehai_img[Math.floor(tehai[i] / 4)], left, y_tehaileft);
        left += tehai_img[0].width;
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

function drawReach(player) {
    let cx = canvas.width / 2;
    let cy = canvas.height / 2;
    if (player % 2 == 0) {
        cy += (player - 1) * 60;
    } else {
        cx += (2 - player) * 60;
    }
    ctx.drawImage(rebou_img[player % 2], cx, cy);
}

function drawSarashi(player) {

}