var interval = null;
var players = [];

function start() {
    var canvas = document.getElementsByTagName("canvas")[0];
    canvas.width = 1000;
    canvas.height = 500;

    players = [];
    for (let i = 0; i < 3; i++) {
        players.push({
            id: i,
            inputs: [], // from environment to neural network
            outputs: [] // from neural network to environment
        });
    }

    game.canvas = canvas;
    game.players = players;
    game.start();

    ai.players = players;
    ai.start();

    interval = setInterval(() => {
        game.update();
        ai.update();
    }, 20);
}

function stop() {
    cancelInterval(interval);
}
