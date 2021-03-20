var game = {
	// constants
	screenWidth: 500,
	screenHeight: 500,
	mustDraw: true,
	delay: 20,

	initialDistance: 100,
	initialEnergy: 1,
	playerSize: 10,
	playerColor: [0, 0, 1],
	foodSize: 2,
	foodSpotSize: 20,
	foodColor: [1, 0, 0],
	visionRange: 500,
	bulletSize: 2,
	bulletColor: [0, 0, 0.5],
	walkStep: 2,
	rotationStep: 0.1,
	tiredLevel: 0.3,
	minMultiplier: 0.5,
	bulletSpeed: 2,
	energyConsumeSpeed: 0.00001,
	foodSpawnSpeed: 0.001,

	// internal variables
	stoped: true,
	interval: null,
	onUpdateCallback: null,
	
	// external variables
	players: [],
	foodSpots: [],
	foods: [],
	bullets: [],
	
	cleanPlayers: function() {
		this.players = [];
	},
	createPlayer: function(label) {
		var player = {
			type: "player",
			label: label,
			input: [
				0, // walk
				0, // turn right
				0, // turn left
				0, // shoot
				0, // eat
				0, // object size to see (large ou small)
				0, // object type to see (player vs foodSpot, bullet vs food)
				0, // object index to see (-1 to n)
			],
			output: [
				0, // hungry (bad)
				0, // pain (bad)
				0, // seeing nothing

				0, // self position x
				0, // self position y
				0, // self size
				0, // self angle
				0, // length of array of object type seen
				0, // distance x of object seen
				0, // distance y of object seen
				0, // size of object type seen
				0, // hue of object type seen (red vs blue)
				0, // angle diff of object seen

				0, // saciety (good)
				0, // near to food
				0, // seeing something
			],

			position: {x: 0, y: 0},
			size: this.playerSize,
			color: this.playerColor,
			angle: 0,

			energy: this.initialEnergy,
			ate: false,
			moved: false,
			pain: 0,
			hit: false,
			bullet: null,
			shot: false,
			hitWall: false,
		};
		this.players.push(player);
		return player;
	},


	start: function() {
		if (!this.stoped) {
			console.log("Already started.");
			return;
		}
		this.stoped = false;
		
		this.createObjects();
		
		if (this.interval == null)
			this.interval = setInterval(() => this.update(), this.delay);
	},


	createObjects: function() {
		var n = this.players.length;
		var side = Math.ceil(Math.sqrt(n));

		// players
		for (var i = 0; i < n; i++) {
			this.players[i].position = {
				x: this.initialDistance * this.randomize(1 + (i % side), 0.3),
				y: this.initialDistance * this.randomize(1 + Math.floor(i / side), 0.3)
			};
		}

		// food spots
		this.foodSpots = [];
		var qt = Math.max(1, n - 1);
		for (var i = 0; i < qt; i++) {
			this.foodSpots.push({
				type: "foodSpot",
				position: {
					x: this.initialDistance * (0.5 + (i % side)),
					y: this.initialDistance * (0.5 + Math.floor(i / side))
				},
				size: this.foodSpotSize,
				color: this.foodColor,
				angle: 0,
				wait: 0,
				count: 0
			});
		}
	},


	randomize: function(center, range) {
		return center + (Math.random() * 2 - 1) * range;
	},


	stop: function() {
		this.stoped = true;
		if (this.interval != null) {
			clearInterval(this.interval);
			this.interval = null;
		}
	},


	restart: function() {
		this.stop();
		this.start();
	},


	update: function() {
		if (this.stoped) {
			console.log("interval not stoping...");
			return;
		}

		this.players.forEach(p => this.processInput(p));

		this.processPhysics();

		this.players.forEach(p => this.updateOutput(p));

		if (this.mustDraw)
			this.draw();

		if (this.onUpdateCallback != null)
			this.onUpdateCallback();
		
		if (this.stoped) {
			this.stop();
		}
		this.ticks++;
	},


	processInput: function(player) {
		var moveMultiplier = this.minMultiplier + (1 - this.minMultiplier) * (player.energy - this.tiredLevel);
		if (moveMultiplier > 1) moveMultiplier = 1;
		if (moveMultiplier < this.minMultiplier) moveMultiplier = this.minMultiplier;

		player.moved = false;
		if (player.input[0] > 0.1) { // walk
			var howMuch = player.input[0];
			if (howMuch > 1) howMuch = 1;
			howMuch *= moveMultiplier;
			player.position.x += howMuch * this.walkStep * Math.cos(player.angle);
			player.position.y += howMuch * this.walkStep * Math.sin(player.angle);
			player.moved = true;
		}

		var howMuchRotation = 0;
		if (player.input[1] > 0.1) { // turn clockwise
			var howMuch = player.input[1];
			if (howMuch > 1) howMuch = 1;
			howMuchRotation += howMuch;
		}
		if (player.input[2] > 0.1) { // turn counter-clockwise
			var howMuch = player.input[2];
			if (howMuch > 1) howMuch = 1;
			howMuchRotation -= howMuch;
		}
		if (howMuchRotation != 0) {
			howMuchRotation *= moveMultiplier;
			player.angle += howMuchRotation * this.rotationStep;
			player.moved = true;
		}

		player.shot = false;
		if (player.bullet == null && player.input[3] > 0.1) { // shoot
			player.bullet = this.spawnBullet(player);
			player.shot = true;
			player.moved = true; // because spent energy
		}

		player.ate = false;
		if (player.input[4] > 0.1) { // eat food
			var foodI = this.foods.findIndex(food => this.collides(player, food));
			if (foodI >= 0) {
				this.foods.splice(foodI, 1); // delete food
				player.energy += 0.1;
				if (player.energy > 1) player.energy = 1;
				player.ate = true;
			}
		}
		
		// vision
		var sizeAsk = player.input[5];
		var hueAsk = player.input[6];
		var array = [];
		if (sizeAsk > 0.2 && sizeAsk <= 0.6) {
			if (hueAsk > 0.2 && hueAsk <= 0.6) {
				array = this.foods;
			} else if (hueAsk > 0.6) {
				array = this.bullets;
			}
		} else if (sizeAsk > 0.6) {
			if (hueAsk > 0.2 && hueAsk <= 0.6) {
				array = this.foodSpots;
			} else if (hueAsk > 0.6) {
				array = this.players;
			}
		}
		var i = array.length == 0 ? -1 : (Math.floor(player.input[7] * array.length) - 1);
		if (i >= array.length) i = array.length - 1;

		var item = i < 0 ? null : array[i];
		player.seeing = item;
		player.arraySeeing = array;
	},


	updateOutput: function(player) {
		var item = player.seeing;
		var array = player.arraySeeing;
		var spaceUnit = this.screenWidth;
		var foodDistance = this.screenWidth;
		for (var i = 0; i < this.foods.length; i++) {
			var distance = this.distance(player, this.foods[i]);
			if (distance < foodDistance)
				foodDistance = distance;
		}
		player.output = [
			1 - player.energy, // hungry (bad)
			player.pain, // pain (bad)
			item == null ? 0.8 : 0, // seeing nothing
			
			player.position.x / spaceUnit,
			player.position.y / spaceUnit,
			player.size / spaceUnit,
			0.5 + this.normalizeAngle(player.angle),
			array.length / this.players.length, // length of array of object type seen
			item == null ? 0 : (item.position.x - player.position.x) / spaceUnit, // distance x of object seen
			item == null ? 0 : (item.position.y - player.position.y) / spaceUnit, // distance y of object seen
			item == null ? 0 : item.size / spaceUnit, // size of object type seen
			item == null ? 0 : (item.color[2] > 0 ? 0 : 1), // hue of object type seen (red vs blue)
			item == null ? 0 : (0.5 + this.normalizeAngle(
				Math.atan2(item.position.y - player.position.y, item.position.x - player.position.x) - player.angle
			)), // angle diff of object seen

			player.ate ? 1 : 0, // saciety (good)
			(this.screenWidth - foodDistance) / spaceUnit, // near to food
			item == null ? 0 : 0.2, // seeing something
		];
	},


	normalizeAngle: function(angle) {
		if (angle > Math.PI) angle -= Math.PI;
		if (angle < -Math.PI) angle += Math.PI;
		return angle / (2 * Math.PI); // -0.5 to 0.5
	},


	processPhysics: function() {
		this.players.forEach(player => {
			// update levels
			player.pain -= 0.005;
			if (player.pain < 0) player.pain = 0

			if (player.moved) player.energy -= 5 * this.energyConsumeSpeed;
			else player.energy -= this.energyConsumeSpeed;

			if (player.energy < 0) player.energy = 0;
			
			// limits players' position
			player.hitWall = this.checkBounds(player);
		});

		// spanw foods
		this.foodSpots.forEach(foodSpot => {
			foodSpot.wait -= this.foodSpawnSpeed;
			if (foodSpot.wait <= 0 && this.foods.length < this.players.length) {
				foodSpot.wait = 1;
				this.spawnFood(foodSpot);
			}
		});

		// move bullets
		this.bullets.forEach(bullet => {
			bullet.position.x += this.bulletSpeed * Math.cos(bullet.angle);
			bullet.position.y += this.bulletSpeed * Math.sin(bullet.angle);
		})
		// check bullet colision
		for (var i = this.bullets.length - 1; i >= 0; i--) {
			var bullet = this.bullets[i];
			var deleteBullet = false;

			var playerI = this.players.findIndex(player => this.collides(player, bullet));
			if (playerI >= 0) {
				var player = this.players[playerI];
				player.hit = true;
				player.pain += 0.5;
				if (player.pain > 1) player.pain = 1;
				
				deleteBullet = true;
			} else if (this.checkBounds(bullet)) {
				deleteBullet = true;
			}

			if (deleteBullet) {
				bullet.player.bullet = null; // allow shoot again
				this.bullets.splice(i, 1); // delete bullet
			}
		}
	},


	distance: function(a, b) {
		var deltaX = a.position.x - b.position.x;
		var deltaY = a.position.y - b.position.y;
		return Math.hypot(deltaX, deltaY);
	},


	collides: function(a, b) { // collision of circles
		var deltaX = a.position.x - b.position.x;
		var deltaY = a.position.y - b.position.y;
		var dist = a.size + b.size;
		return deltaX * deltaX + deltaY * deltaY < dist * dist;
	},


	checkBounds: function(a) { // limit and returns
		var out = false;
		if (a.position.x < a.size) {
			a.position.x = a.size;
			out = true;
		} else if (a.position.x > this.screenWidth - a.size) {
			a.position.x = this.screenWidth - a.size;
			out = true;
		}
		if (a.position.y < a.size) {
			a.position.y = a.size;
			out = true;
		} else if (a.position.y > this.screenHeight - a.size) {
			a.position.y = this.screenHeight - a.size;
			out = true;
		}
		return out;
	},


	spawnBullet: function(player) {
		var bullet = {
			type: "bullet",
			position: {
				x: player.position.x + 1.5 * player.size * Math.cos(player.angle),
				y: player.position.y + 1.5 * player.size * Math.sin(player.angle)
			},
			size: this.bulletSize,
			color: this.bulletColor,
			angle: player.angle,
			player: player,
		};
		this.bullets.push(bullet);
		return bullet;
	},


	spawnFood: function(foodSpot) {
		var angle = foodSpot.count + this.randomize(0, 0.3);
		var food = {
			type: "food",
			position: {
				x: foodSpot.position.x + 2 * foodSpot.size * Math.cos(angle),
				y: foodSpot.position.y + 2 * foodSpot.size * Math.sin(angle)
			},
			size: this.foodSize,
			color: this.foodColor,
			angle: angle,
			foodSpot: foodSpot,
		};
		foodSpot.count++;
		this.foods.push(food);
		return food;
	},


	draw: function() {
		canvasCtx.fillStyle = "gray";
		canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight); // general background
		canvasCtx.fillStyle = "green";
		canvasCtx.fillRect(0, 0, this.screenWidth, this.screenHeight); // game background
		
		this.foodSpots.forEach(obj => this.drawObject(obj));
		this.foods.forEach(obj => this.drawObject(obj));
		this.players.forEach(obj => this.drawObject(obj));
		this.bullets.forEach(obj => this.drawObject(obj));

		this.players.forEach(player => {
			if (player.seeing != null) {
				canvasCtx.strokeStyle = "rgba(0,0,0,0.5)";
				canvasCtx.beginPath();
				if (player.seeing == player) {
					canvasCtx.arc(player.position.x + player.size, player.position.y + player.size, player.size, 0, Math.PI);
				} else {
					canvasCtx.moveTo(player.position.x, player.position.y);
					canvasCtx.lineTo(player.seeing.position.x, player.seeing.position.y);
				}
				canvasCtx.stroke();
			}
		});
		
	},
	circleSection: 0.7,
	drawObject: function(obj) {
		if (isNaN(obj.position.x) || isNaN(obj.position.y)) {
			throw new Error("NaN position at object " + obj.type);
		}
		canvasCtx.fillStyle = "rgba(" + (255 * obj.color[0]) + "," + (255 * obj.color[1]) + "," + (255 * obj.color[2]) + ",0.5)";
		canvasCtx.beginPath();
		canvasCtx.arc(obj.position.x, obj.position.y, obj.size,
			obj.angle + this.circleSection, obj.angle - this.circleSection);
		canvasCtx.fill();
	}
};
