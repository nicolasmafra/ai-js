var game = {
	// constants
	canvasWidth: 500,
	canvasHeight: 500,
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
	bulletColor: [0, 0, 0],
	walkStep: 1,
	rotationStep: 0.05,
	tiredLevel: 0.3,
	minMultiplier: 0.5,
	bulletSpeed: 2,
	energyConsumeSpeed: 0.00001,
	foodSpawnSpeed: 0.001,

	// internal variables
	stoped: true,
	interval: null,
	
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
			input: [0,0,0,0,0],
			output: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],

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
		
		this.canvas = document.getElementsByTagName("canvas")[0];
		this.canvas.width = this.canvasWidth;
		this.canvas.height = this.canvasHeight;
		this.context = this.canvas.getContext("2d");
		
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
		if (this.mustDraw)
			this.draw();
		
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
	},


	processPhysics() {
		this.players.forEach(player => {
			// update levels
			player.pain -= 0.0005;
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


	collides: function(a, b) { // collision of circles
		var deltaX = a.position.x - b.position.x;
		var deltaY = a.position.y - b.position.y;
		var dist = a.size + b.size;
		return deltaX * deltaX + deltaY * deltaY < dist * dist;
	},


	checkBounds: function(a) { // limit and returns
		var out = false;
		if (a.position.x < 0) {
			a.position.x = 0;
			out = true;
		} else if (a.position.x > this.canvasWidth) {
			a.position.x = this.canvasWidth;
			out = true;
		}
		if (a.position.y < 0) {
			a.position.y = 0;
			out = true;
		} else if (a.position.y > this.canvasHeight) {
			a.position.y = this.canvasHeight;
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
		this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
		this.context.fillStyle = "gray";
		this.context.fillRect(0, 0, this.canvasWidth, this.canvasHeight); // background
		
		this.foodSpots.forEach(obj => this.drawObject(obj));
		this.foods.forEach(obj => this.drawObject(obj));
		this.players.forEach(obj => this.drawObject(obj));
		this.bullets.forEach(obj => this.drawObject(obj));
		
	},
	circleSection: 0.7,
	drawObject: function(obj) {
		if (isNaN(obj.position.x) || isNaN(obj.position.y)) {
			throw new Error("NaN position at object " + obj.type);
		}
		this.context.fillStyle = "rgba(" + (255 * obj.color[0]) + "," + (255 * obj.color[1]) + "," + (255 * obj.color[2]) + ",0.5)";
		this.context.beginPath();
		this.context.arc(obj.position.x, obj.position.y, obj.size,
			obj.angle + this.circleSection, obj.angle - this.circleSection);
		this.context.fill();
	}
};
