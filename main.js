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

function start() {
	game.players = aiInput.createPlayers(300).slice();
	game.onPlayerUpdateCallback = p => aiInput.updatePlayer(p);
	game.onUpdateCallback = () => aiInput.update();
	game.onStopCallback = p => aiInput.nextGeneration(p);
	
	humanInput.config();
	humanInput.createPlayer();
	game.players.push(humanInput.obj);
	
	//game.start();
}
