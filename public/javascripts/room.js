const socket = io();

socket.emit('dahai', 3);



socket.on('haipai', haipai => {
    console.log(haipai);
});

socket.on('tsumo', function(tsumoPai) {
    console.log(tsumoPai);
});