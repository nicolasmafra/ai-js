var humanController = {
	map: {
		"38": 0, // up, walk
		"39": 1, // right, turn right
		"37": 2, // left, turn left
		"32": 3, // space, shoot
		"40": 4, // down, eat
	},
	obj: null,
	config: function() {
		window.addEventListener('keydown', (e) => this.update('keydown', e), false);
		window.addEventListener('keyup', (e) => this.update('keyup', e), false);
	},
	update: function(type, e) {
		if (this.obj != null && this.map.hasOwnProperty(e.keyCode.toString())) {
			e.preventDefault();
			var value = type == 'keydown' ? 1 : 0;
			this.obj.input[this.map[e.keyCode.toString()]] = value;
		}
	}
};

humanController.config();

function start() {
	game.cleanPlayers();
	humanController.obj = game.createPlayer("Human");
	game.createPlayer("AI");
	game.start();
}

