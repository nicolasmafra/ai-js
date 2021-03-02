var aiInput = {
	layerQt: [7, 7, 2],
	maxMutationFactor: 2,
	minRandomFactor: 0.5,
	deathPercent: 0.5,
	betterPercent: 0.01,
	
	players: [],
	betters: null,
	startWeights: null,
	generation: null,
	generationData: [],
	
	isRobot: function(player) {
		return player.type == "ai";
	},
	findRobots: function(players) {
		var robots = [];
		for (var i = 0; i < players.length; i++) {
			if (this.isRobot(players[i])) {
				robots.push(players[i]);
			}
		}
		return robots;
	},
	createPlayers: function(qt) {
		this.players = [];
		for (var i = 0; i < qt; i++) {
			var color = 'hsl(' + 15 * 345*Math.random() +',100%,50%)';
			var player = game.createPlayer("robot " + i, color);
			player.type = "ai";
			player.ai = i;
			player.neurons = this.createNeurons();
			if (i == 0 && this.startWeights != null) {
				player.weights = this.startWeights;
			} else {
				player.weights = this.createWeights();
			}
			this.players.push(player);
		}
		this.generation = 1;
		this.generationData = [];
		this.betters = [];
		this.betters.push(this.players[0]);
		return this.players;
	},
	onStart: function() {
		if (this.generationData.length < this.generation) {
			this.generationData.push({
				duration: 0
			});
		}
	},
	updatePlayer: function(player) {
		if (!this.isRobot(player)) {
			return;
		}
		var obj = this.objInfo(player, game.objects.length <= 0 ? null : game.objects[0]);
		var obj2 = this.objInfo(player, game.objects.length <= 1 ? null : game.objects[1]);
		player.neurons[0][1] = 2 * (player.position.y / game.canvasHeight) - 1;
		player.neurons[0][2] = game.speed / 50;
		player.neurons[0][3] = obj.x;
		player.neurons[0][4] = obj.y;
		player.neurons[0][5] = obj2.x;
		player.neurons[0][6] = obj2.y;
		this.updateNet(player.neurons, player.weights);
		player.input.up = player.neurons[2][0] > 0;
		player.input.down = player.neurons[2][1] > 0;
	},
	objInfo: function(player, obj) {
		var nearDistance = game.canvasWidth;
		var deltaX = obj == null ? 1000 * nearDistance : obj.position.x - player.position.x;
		var deltaXAbs = Math.abs(deltaX);
		var d = 1 - deltaXAbs / (deltaXAbs + nearDistance);
		var x = deltaX > 0 ? d : -d;
		var y = obj == null ? 0 : x * (obj.position.y - player.position.y) / (3 * game.playerHeight);
		return {d: d, x: x, y: y};
	},
	update: function() {
		var robots = this.findRobots(game.activePlayers);
		if (robots.length == 0) return;
		var robot = robots[0];
		
		this.generationData[this.generationData.length - 1].duration = robot.duration;
		
		for (var k = 0; k < this.layerQt.length; k++) {
			var qt = this.layerQt[k];
			for (var i = 0; i < qt; i++) {
				var neuron = robot.neurons[k][i];
				var position = this.neuronPosition(k, i);
				var value = this.norm(neuron, 1, 255);
				
				if (k < this.layerQt.length - 1) {
					var qt2 = this.layerQt[k + 1];
					for (var j = 0; j < qt2; j++) {
						var position2 = this.neuronPosition(k + 1, j);
						var weigth = robot.weights[k][i * qt + j];
						var wvalue = this.norm(weigth * (45 + value) / 300, 1, 1);
						var rn = wvalue < 0 ? 255 : 0;
						var gn = wvalue > 0 ? 255 : 0;
						var bn = 255 * (1 - Math.abs(wvalue));
						var an = Math.abs(wvalue);
						game.context.strokeStyle = "rgba(" + rn + "," + gn + ",0," + an + ")";
						game.context.beginPath();
						game.context.moveTo(position.x, position.y);
						game.context.lineTo(position2.x, position2.y);
						game.context.stroke();
					}
				}
				
				var r = value < 0 ? -(value + 10) : 0;
				var g = value > 0 ? (value + 10) : 0;
				var b = (255 - Math.abs(value));
				game.context.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
				game.context.beginPath();
				game.context.arc(position.x, position.y, 5, 0, 2 * Math.PI);
				game.context.fill();
			}
		}
		game.context.fillStyle = "white";
		game.context.strokeStyle = "blue";
		// draw generation progress
		game.context.fillRect(20, 20, 300, 100);
		var durations = this.generationData.map(d => d.duration);
		var maxduration = Math.max.apply(null, durations);
		game.context.beginPath();
		game.context.moveTo(20, 120);
		var width = Math.max(1, durations.length - 1);
		for (var i = 0; i < durations.length; i++) {
			game.context.lineTo(30 + 280 * i / width, 120 - 90 * (durations[i] / maxduration));
		}
		game.context.stroke();
		// draw data
		game.context.font = "15px Arial";
		var textY = 120;
		var textHeight = 17;
		game.context.fillText("Generation: " + this.generationData.length, 20, textY += textHeight);
		game.context.fillText("Max duration: " + Math.floor(maxduration * 10) / 10, 20, textY += textHeight);
		game.context.fillText("Current duration: " + Math.floor(durations[durations.length - 1] * 10) / 10, 20, textY += textHeight);
		game.context.fillText("Total robots: " + this.players.length, 20, textY += textHeight);
		game.context.fillText("Current alive: " + this.findRobots(game.activePlayers).length, 20, textY += textHeight);
	},
	neuronPosition: function(k, i) {
		return {x: game.canvasWidth / 2 + 50 * i, y: 30 + 80 * k};
	},
	relu: function(value) {
		return value < 0 ? 0 : value;
	},
	norm: function(value, maxOld, maxNew) {
		return value < -maxOld ? -maxNew : value > maxOld ? maxNew : (maxNew * value / maxOld);
	},
	nextGeneration: function() {
		var robots = this.findRobots(game.diedPlayers);
		
		var dieds = Math.floor(this.deathPercent * robots.length);
		var betterCount = Math.ceil(this.betterPercent * (robots.length - dieds))
		this.betters = [];
		var bettersWeights = [];
		var b = 1;
		for (var i = 0; i < betterCount; i++) {
			var better = robots[robots.length - (b++)];
			this.betters.push(better);
			bettersWeights.push(JSON.parse(JSON.stringify(better.weights)));
		}
		
		b = 0;
		for (var i = 0; i < dieds; i++) {
			var p = robots[i];
			var weights = JSON.parse(JSON.stringify(bettersWeights[b++ % betterCount]));
			if (i == 0) {
				p.weights = weights;
				continue;
			};
			
			var ratio = i / (dieds - 1);
			var randomFactor = this.minRandomFactor + (1 - this.minRandomFactor) * ratio;
			var mutationFactor = this.maxMutationFactor * ratio;
			p.weights = this.mutateWeights(weights, randomFactor, mutationFactor);
		}
		this.generationData[this.generationData.length -1].duration = this.betters[0].duration;
		this.generation++;
		game.restart();
	},
	createNeurons: function() {
		var neurons = [];
		for (var k = 0; k < this.layerQt.length; k++) {
			var kNeurons = [];
			var qt = this.layerQt[k];
			for (var i = 0; i < qt; i++) {
				kNeurons.push(0);
			}
			neurons.push(kNeurons);
		}
		return neurons;
	},
	createWeights: function() {
		var weights = [];
		for (var k = 0; k < this.layerQt.length - 1; k++) {
			var kWeights = [];
			var qt = this.layerQt[k] * this.layerQt[k + 1];
			for (var i = 0; i < qt; i++) {
				kWeights.push(this.randomWeight());
			}
			weights.push(kWeights);
		}
		return weights;
	},
	updateNet: function(neurons, weights) {
		neurons[0][0] = 1; // bias
		for (var k = 1; k < this.layerQt.length; k++) {
			var qtInput = this.layerQt[k - 1];
			var qtOutput = this.layerQt[k];
			for (var o = 0; o < qtOutput; o++) {
				if (o == 0 && k < this.layerQt.length - 1) {
					neurons[k][0] = 1; // bias
					continue;
				}
				var sum = 0;
				for (var i = 0; i < qtInput; i++) {
					sum += neurons[k - 1][i] * weights[k - 1][o * qtInput + i];
				}
				// activation function = ReLU
				neurons[k][o] = this.relu(sum);
			}
		}
	},
	mutateWeights: function(weights, randomFactor, mutationFactor) {
		for (var n = 0; n < mutationFactor; n++) {
			var k = Math.floor((this.layerQt.length - 1) * Math.random());
			var kWeights = weights[k];
			var qt = this.layerQt[k] * this.layerQt[k + 1];
			var i = Math.floor(qt * Math.random());
			kWeights[i] = (1 - randomFactor) * kWeights[i] + randomFactor * this.randomWeight();
		}
		return weights;
	},
	randomWeight: function() {
		return 2 * Math.random() - 1;
	},
	save: function() {
		localStorage.setItem('weights', this.betters[0].weights);
	},
	load: function() {
		this.startWeights = localStorage.getItem('weights');
		if (this.betters != null) {
			this.betters[0].weights = this.startWeights;
		}
	}
};
