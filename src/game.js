var game = {
	// constants
	canvasWidth: 1000,
	canvasHeight: 500,
	groundHeight: 50,
	groundPosition: 10,
	playerWidth: 20,
	playerHeight: 40,
	mustDraw: true,
	initialSpeed: 10,
	acceleration: 0.005,
	gravity: -1,
	jumpSpeed: 15,
	fallSpeed: -20,
	minPlayerPosition: 20,
	maxPlayerPosition: 80,
	delay: 20,
	minObjectInterval: 300,
	maxObjectInterval: 1000,
	offsetObjectInterval: -200, // environment kill all "always jumping" player
	easyInterval: 10000,
	objectFlyHeight: 100,

	// internal variables
	stoped: true,
	interval: null,
	
	// external variables
	players: [],
	onStartCallback: null,
	onPlayerUpdateCallback: null,
	onUpdateCallback: null,
	onStopCallback: null,
	
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
		
		this.ground = {
			color: "gray",
			size: {x: this.canvasWidth, y: this.groundHeight },
			position: {x: this.canvasWidth / 2, y: this.groundPosition + this.groundHeight / 2}
		};
		this.activePlayers = this.players.slice();
		this.diedPlayers = [];
		var dist = (this.maxPlayerPosition - this.minPlayerPosition)/this.players.length;
		var playerOffset = 0;
		this.players.forEach(player => {
			player.position = {x: this.minPlayerPosition + playerOffset, y: this.groundPosition + 2 * this.groundHeight + player.size.y};
			player.speed = {x: 0, y:0};
			playerOffset += dist;
		});
		this.objectsCount = 0;
		this.randomInterval = 0;
		this.objects = [];
		this.ticks = 0;
		this.position = 0;
		this.speed = this.initialSpeed;
		
		if (this.onStartCallback != null) {
			this.onStartCallback();
		}
		
		if (this.interval == null) {
			this.interval = setInterval(() => this.update(), this.delay);
		}
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
		// input
		this.activePlayers.forEach(player => {
			if (this.onPlayerUpdateCallback != null) {
				this.onPlayerUpdateCallback(player);
			}
			if (this.collides(player, this.ground)) {
				if (player.speed.y <= 0) {
					// ground stop
					player.position.y = this.ground.position.y + this.ground.size.y / 2 + player.size.y / 2;
					player.speed.y = 0;
				}
				if (player.input.up && !player.input.down) {
					player.speed.y = this.jumpSpeed;
				}
			} else if (player.input.down && !player.input.up) {
				player.speed.y = this.fallSpeed;
			}
		});
		// physics
		this.position += this.speed;
		this.speed += this.acceleration;
		this.activePlayers.forEach(player => {
			player.position.y += player.speed.y;
			player.speed.y += this.gravity;
			player.duration = this.ticks * this.delay / 1000;
		});
		this.objects.forEach(obj => {
			obj.position.x -= this.speed;
		});
		// object creation
		this.objects = this.objects.filter(obj => obj.position.x >= -obj.size.x / 2);
		if (this.objects.length < 2 && this.position + this.offsetObjectInterval >= this.objectsCount * this.maxObjectInterval - this.randomInterval) {
			this.objects.push(this.createObject());
			this.objectsCount++;
			if (this.position > this.easyInterval) {
				this.randomInterval = (this.maxObjectInterval - this.minObjectInterval) * Math.random();
			}
		}
		// draw
		if (this.mustDraw) {
			this.draw();
		}
		// die dettection
		this.objects.forEach(obj => {
			if (obj.position.x - obj.size.x / 2 <= this.maxPlayerPosition + this.playerWidth / 2) {
				for (var i = this.activePlayers.length - 1; i >= 0; i--) {
					var player = this.activePlayers[i];
					if (this.collides(player, obj)) {
						//console.log("player died: " + player.name);
						this.diedPlayers.push(player);
						this.activePlayers.splice(i, 1);
					}
				}
			}
		});
		
		if (this.onUpdateCallback != null) {
			this.onUpdateCallback();
		}
		// stop trigger
		if (this.activePlayers.length == 0) {
			this.stoped = true;
		}
		if (this.stoped) {
			this.stop();
			if (this.onStopCallback != null) {
				this.onStopCallback();
			}
		}
		this.ticks++;
	},
	collides: function(a, b) {
		return Math.abs(a.position.x - b.position.x) <= (a.size.x + b.size.x) / 2
			&& Math.abs(a.position.y - b.position.y) <= (a.size.y + b.size.y) / 2;
	},
	drawObject(obj) {
		this.context.fillStyle = obj.color;
		this.context.fillRect(
		  obj.position.x - obj.size.x / 2,
		  this.canvasHeight - (obj.position.y - obj.size.y / 2),
		  obj.size.x, -obj.size.y);
	},
	draw: function() {
		this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
		this.context.fillStyle = "black";
		this.context.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
		this.drawObject(this.ground);
		this.objects.forEach((x) => this.drawObject(x));
		this.activePlayers.forEach((x) => this.drawObject(x));
	},
	createPlayer(name, color) {
		return {
			name: name,
			color: color,
			size: {x: this.playerWidth, y: this.playerHeight},
			position: {x: 0, y: 0},
			speed: {x: 0, y: 0},
			input: {up: false, down: false}
		};
	},
	createObject() {
		var size = {x: 150, y: 20};
		var yDelta = this.position <= this.easyInterval ? 0 : (Math.random() > 0.8 ? this.objectFlyHeight : 0)
		return {
			color: "white",
			size: size,
			position: {
				x: this.canvasWidth,
				y: this.ground.position.y + this.ground.size.y / 2 + size.y / 2 + yDelta}
		};
	}
};