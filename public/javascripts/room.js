const socket = io();

// socket.emit('dahai', 3);

let pai_img = [];
for (let i = 0; i < 34; i++) {
    var img = new Image();
    img.src = "./images/pai/" + i + ".gif";
    pai_img[i] = img;
}

socket.on('haipai', haipai => {
    console.log(haipai);
    haipai.sort((a, b) => a - b);
    console.log(haipai);
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    const pai_wid = pai_img[0].width;
    const pai_hei = pai_img[0].height;
    let left = (canvas.width - 13 * pai_wid) / 2
    for (let i = 0; i < 13; i++) {
        console.log(left);
        ctx.drawImage(pai_img[Math.floor(haipai[i] / 4)], left, canvas.height - pai_hei);
        left += pai_wid;
    }
});

socket.on('tsumo', function (tsumoPai) {
    console.log(tsumoPai);
});