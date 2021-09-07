var game = {
    playerSize: 20,
    visionLength: 10,
    visionTotalAngle: 90,

    start: function() {
        if (this.canvas == null || this.players == null) {
            throw new Error("Set canvas and players before start!");
        }
        
        this.playerData = {};
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            let w = this.canvas.width / this.players.length;
            let h = this.canvas.height / this.players.length;
            this.playerData[player.id] = {
                x: w * (i + 0.5),
                y: h * (i + 0.5),
                a: 0
            }
        }
    },

    update: function() {
        var ctx = this.canvas.getContext("2d");
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		ctx.fillStyle = "red";
        for (p in this.playerData) {
            let pd = this.playerData[p];
            ctx.beginPath();
            ctx.arc(pd.x, pd.y, this.playerSize, pd.a + 1, pd.a - 1);
            ctx.fill();
        }

        this.players.forEach(this.setInputs, this);
    },

    setInputs: function(player) {
        let farDistance = 50000
        player.inputs = []; // dist of nearest player
        for (let i = 0; i < this.visionLength; i++) {
            player.inputs[i] = farDistance;
        }

        let visionAngleSlice = this.visionTotalAngle / this.visionLength;
        let visionStartAngle = -(this.visionTotalAngle) / 2 + (visionAngleSlice / 2);
        let thisPd = this.playerData[player.id];
        
        for (p in this.playerData) {
            if (p == player.id) {
                continue;
            }
            let pd = this.playerData[p];
            let dx = pd.x - thisPd.x;
            let dy = pd.y - thisPd.y;
            let relAngle = Math.atan2(dy, dx);

            for (let i = 0; i < this.visionLength; i++) {
                let visionAngle = visionStartAngle + i * visionAngleSlice;
                let angleDiff = relAngle - visionAngle;
                if (angleMag(angleDiff) <= visionAngleSlice / 2) {
                    // it's seeing
                    let dist = Math.hypot(dx, dy);
                    if (dist < player.inputs[i]) {
                        player.inputs[i] = dist;
                    }
                }
            }
        }
        for (let i = 0; i < this.visionLength; i++) {
            if (player.inputs[i] == farDistance)
                player.inputs[i] = 0;
            else
                player.inputs[i] = 1 / (1 + player.inputs[i] / this.playerSize); // inverse of dist
        }
    },
}

function angleMag(angle) {
    if (angle < 0)
        angle = -angle;
    while (angle >= 360)
        angle -= 360;
    if (angle > 180)
        angle = 360 - angle;
    return angle;
}