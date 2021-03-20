
var canvasWidth = 1000;
var canvasHeight = 500;
var totalNeuronsQt = 50;
var aisQuantity = 1;

function createConfiguredAi() {
	var ai = createAi();
	ai.inputNeuronsQt = 16;
	ai.badNeurons = 3;
	ai.goodNeurons = 3;
	ai.outputNeuronsQt = 8;
	ai.totalNeuronsQt = totalNeuronsQt;
	ai.maxEnergy = 2;
	ai.config();

	ai.setOutputBias(5, 0.03);
	ai.setOutputThreshold(5, 1);

	ai.setOutputBias(6, 0.04);
	ai.setOutputThreshold(6, 1);

	ai.setOutputBias(7, 0.05);
	ai.setOutputThreshold(7, 1);

	return ai;
}

var canvas = null;
var canvasCtx = null;
function loadCanvas() {
	canvas = document.getElementsByTagName("canvas")[0];
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;
	canvasCtx = canvas.getContext("2d");
}

var humanController = {
	map: {
		"38": 0, // up, walk
		"39": 1, // right, turn right
		"37": 2, // left, turn left
		"32": 3, // space, shoot
		"40": 4, // down, eat
		"48": 0, // 0, walk
		"49": 1, // 1, turn right
		"50": 2, // 2, turn left
		"51": 3, // 3, shoot
		"52": 4, // 4, eat
		"53": 5, // 5, object size to see (large ou small)
		"54": 6, // 6, object type to see (player vs foodSpot, bullet vs food)
		"55": 7, // 7, object index to see (-1 to n)
	},
	shift: false,
	obj: null,
	config: function() {
		window.addEventListener('keydown', (e) => this.update('keydown', e), false);
		window.addEventListener('keyup', (e) => this.update('keyup', e), false);
	},
	update: function(type, e) {
		if (e.keyCode.toString() == "16") {
			e.preventDefault();
			this.shift = (type == 'keydown');
		}
		if (this.obj != null && this.map.hasOwnProperty(e.keyCode.toString())) {
			e.preventDefault();
			var value = type == 'keydown' ? (this.shift ? 0.5 : 1) : 0;
			this.obj.input[this.map[e.keyCode.toString()]] = value;
		}
	}
};

humanController.config();
var ais = [];

function start() {
	game.stop();
	ais.forEach(ai => {
		ai.stop();
	})

	game.cleanPlayers();
	humanController.obj = game.createPlayer("Human");
	for (var i = 0; i < aisQuantity; i++) {
		var ai = createConfiguredAi();
		ai.obj = game.createPlayer("AI " + i);
		ai.start();
		ais.push(ai);
	}

	game.onUpdateCallback = () => drawAi();
	game.start();
}

var networkCenterX = 750;
var networkCenterY = 250;
var networkRadius = 200;
function drawAi() {
	var ai = ais[0];
	var nSize = 2 * networkRadius / ai.totalNeuronsQt;
	for (var i = 0; i < ai.totalNeuronsQt; i++) {
		var angle = 2 * Math.PI * i / ai.totalNeuronsQt;
		var x = networkCenterX + networkRadius * Math.cos(angle);
		var y = networkCenterY + networkRadius * Math.sin(angle);
		var energy = ai.neurons[ai.getNeuronEnergyIndex(i)];
		var r = getEnergyColor(-energy, ai.maxEnergy);
		var g = getEnergyColor(energy, ai.maxEnergy);
		var b = 255 - Math.max(r, g);
		canvasCtx.fillStyle = "rgba(" + r + "," + g + "," + b + ",1)";
		canvasCtx.beginPath();
		canvasCtx.arc(x, y, nSize, 0, 2 * Math.PI);
		canvasCtx.fill();
	}
	for (var i = 0; i < ai.totalNeuronsQt; i++) {
		var angle1 = 2 * Math.PI * i / ai.totalNeuronsQt;
		var x1 = networkCenterX + networkRadius * Math.cos(angle1);
		var y1 = networkCenterY + networkRadius * Math.sin(angle1);
		for (var j = 0; j < ai.totalNeuronsQt; j++) {
			var angle2 = 2 * Math.PI * j / ai.totalNeuronsQt;
			var x2 = networkCenterX + networkRadius * Math.cos(angle2);
			var y2 = networkCenterY + networkRadius * Math.sin(angle2);
			var energy = ai.synapses[ai.getSynapseEnergyIndex(i, j)];
			//console.log(energy);
			var r = getEnergyColor(-energy, 0.0001);
			var g = getEnergyColor(energy, 0.0001);
			var a = Math.max(r, g) / 255;
			canvasCtx.strokeStyle = "rgba(" + r + "," + g + ",0," + a + ")";
			canvasCtx.beginPath();
			canvasCtx.moveTo(x1, y1);
			canvasCtx.lineTo(x2, y2);
			canvasCtx.stroke();
		}
	}
}

function getEnergyColor(energy, max) {
	if (energy < 0)
		return 0;
	energy = energy / max;
	if (energy > 1) energy = 1;
	energy = 1 - (1 - energy) * (1 - energy) * (1 - energy);
	return 255 * energy;
}

