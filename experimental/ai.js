var ai = {
    start: function() {
        if (this.players == null) {
            throw new Error("Set players before start!");
        }
        // create neural networks
        this.playerData = {};
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            this.playerData[player.id] = {
                layer1: []
            }
        }
    },
    update: function() {
        // update neural networks
    },
}