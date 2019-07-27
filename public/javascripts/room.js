const socket = io();

pai_img = [];
for (let i = 0; i < 34; i++) {
    var img = new Image();
    img.src = "./images/pai/" + i + ".gif";
    pai_img[i] = img;
}

socket.on('haipai', haipai => {
    console.log('haipai : ' + haipai);
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    let left = 0;
    const pai_wid = pai_img[0].width;
    for (let i = 0; i < 13; i++) {
        ctx.drawImage(pai_img[Math.floor(haipai[i] / 4)], left, 10);
        left += pai_wid;
    }
});

socket.on('tsumo', function (tsumoPai) {
    console.log('tsumo : ' + tsumoPai);
});

document.getElementById('restart-button').addEventListener("click", ()=>{
    socket.emit('restart');
});