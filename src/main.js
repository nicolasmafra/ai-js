var humanInput = {
	obj: null,
	map: {
		"38": "up",
		"40": "down"
	},
	config: function() {
		window.addEventListener('keydown', (e) => this.update('keydown', e), false);
		window.addEventListener('keyup', (e) => this.update('keyup', e), false);
	},
	update: function(type, e) {
		if (type == 'keydown' && e.keyCode == 32 /*spacebar*/) {
			game.restart();
			return;
		}
		if (this.obj != null && this.map.hasOwnProperty(e.keyCode.toString())) {
			e.preventDefault();
			this.obj.input[this.map[e.keyCode.toString()]] = type == 'keydown';
		}
	},
	createPlayer: function() {
		this.obj = game.createPlayer("human", "red");
		this.obj.type = "human";
	}
};

function reconfig() {
	game.stop();
	
	var totalRobots = parseInt(document.getElementsByName("totalRobots")[0].value);
	var deathPercent = parseInt(document.getElementsByName("deathPercent")[0].value);
	var betterPercent = parseInt(document.getElementsByName("betterPercent")[0].value);
	
	game.players = totalRobots ? aiInput.createPlayers(totalRobots).slice() : [];
	game.deathPercent = deathPercent ? deathPercent : 0.7;
	game.betterPercent = betterPercent ? betterPercent : 0.07;
	
	if (game.players.length > 0) {
		game.onStartCallback = () => aiInput.onStart();
		game.onPlayerUpdateCallback = p => aiInput.updatePlayer(p);
		game.onUpdateCallback = () => aiInput.update();
		game.onStopCallback = p => aiInput.nextGeneration(p);
	} else {
		game.onStartCallback = null;
		game.onPlayerUpdateCallback = null;
		game.onUpdateCallback = null;
		game.onStopCallback = null;
	}
	
	humanInput.config();
	humanInput.createPlayer();
	game.players.push(humanInput.obj);
	
	game.start();
}
