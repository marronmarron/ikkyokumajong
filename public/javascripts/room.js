const socket = io();

socket.emit('dahai', 3);

socket.on('tsumo', function(tsumoPai) {
    console.log(tsumoPai);
});