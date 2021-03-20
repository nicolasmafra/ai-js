// neurons schema: [input[bad + neutral + good] + hide + output]
var createAi = () => { return {
    obj: null,
    inputNeuronsQt: 3,
    badNeuronsQt: 2,
    goodNeuronsQt: 1,
    outputNeuronsQt: 3,
    totalNeuronsQt: 100,
    neurons: [],
    synapses: [],
    adrenaline: 0,
    maxEnergy: 100,

    adrenalineFactor: 1.01,
    resistenceMutationFactor: 0.1,
    delay: 20,
    stoped: true,
    interval: null,


    setOutputBias: function(i, value) {
        this.neurons[this.getNeuronBiasIndex(this.totalNeuronsQt - this.outputNeuronsQt + i)] = value;
    },
    setOutputThreshold: function(i, value) {
        this.neurons[this.getNeuronThresholdIndex(this.totalNeuronsQt - this.outputNeuronsQt + i)] = value;
    },


	start: function() {
		if (!this.stoped) {
			console.log("Already started.");
			return;
		}
		this.stoped = false;
		
		if (this.interval == null)
			this.interval = setInterval(() => this.update(), this.delay);
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


    createNeurons: function() {
        this.neurons = [];
        for (var i = 0; i < this.totalNeuronsQt; i++) {
            this.neurons.push(0); // energy
            this.neurons.push(0.002 * (Math.random() - 0.5)); // bias
            this.neurons.push(0.5); // threshold
        }
    },

    getNeuronEnergyIndex: function(i) {
        return 3 * i;
    },

    getNeuronBiasIndex: function(i) {
        return 3 * i + 1;
    },

    getNeuronThresholdIndex: function(i) {
        return 3 * i + 2;
    },

    createSynapses: function() {
        var qt = this.totalNeuronsQt * this.totalNeuronsQt;
        this.synapses = [];
        for (var i = 0; i < qt; i++) {
            this.synapses.push(0); // energy
            this.synapses.push(Math.random() * 2 - 1); // weight
            this.synapses.push(0); // resistence
        }
    },
    
    getSynapseEnergyIndex: function(i, j) {
        return 3 * (i * this.totalNeuronsQt + j);
    },

    getSynapseWeightIndex: function(i, j) {
        return 3 * (i * this.totalNeuronsQt + j) + 1;
    },

    getSynapseResistenceIndex: function(i, j) {
        return 3 * (i * this.totalNeuronsQt + j) + 2;
    },


    config: function() {
        this.createNeurons();
        this.createSynapses();
    },


    update: function() {
		if (this.stoped) {
			console.log("interval not stoping...");
			return;
		}

        if (this.obj == null)
            return;
        
        this.mutateSynapses();
        this.reforceSynapses();
        this.propagateSynapsesToNeurons();
        for (var i = 0; i < this.outputNeuronsQt; i++) {
            var n = this.totalNeuronsQt - this.outputNeuronsQt + i;
            this.obj.input[i] = this.neurons[this.getNeuronEnergyIndex(n)]; // input game is output AI
        }

        for (var i = 0; i < this.inputNeuronsQt; i++) {
            var input = this.obj.output[i]; // input AI is output game
            if (isNaN(input))
                throw new Error("NaN input " + i);
            this.neurons[this.getNeuronEnergyIndex(i)] = input;
        }
        this.propagateNeuronsToSynapses();

		if (this.stoped) {
			this.stop();
		}
		this.ticks++;
    },

    
    propagateNeuronsToSynapses: function() {
        var adrenalineEnergy = this.adrenaline * 0.01;
        for (var i = 0; i < this.totalNeuronsQt; i++) {
            var energyIndex = this.getNeuronEnergyIndex(i);
            this.neurons[energyIndex] += adrenalineEnergy + this.neurons[this.getNeuronBiasIndex(i)];
            if (this.neurons[energyIndex] >= this.neurons[this.getNeuronThresholdIndex(i)]) {
                // activation
                var energy = this.neurons[energyIndex];
                if (energy > this.maxEnergy) energy = this.maxEnergy;

                this.neurons[energyIndex] = 0;

                var weightSum = 0;
                for (var j = 0; j < this.totalNeuronsQt; j++) {
                    var weightAbs = Math.abs(this.synapses[this.getSynapseWeightIndex(i, j)]);
                    if (weightAbs > 1) {
                        throw new Error("Invalid weight abs at (" + i + "," + j + "): " + weightAbs);
                    }
                    weightSum += weightAbs;
                }
                if (weightSum > 0) {
                    for (var j = 0; j < this.totalNeuronsQt; j++) {
                        var weight = this.synapses[this.getSynapseWeightIndex(i, j)];
                        var synapseEnergy = energy * (weight / weightSum);
                        if (synapseEnergy > this.maxEnergy) synapseEnergy = this.maxEnergy;
                        if (synapseEnergy < -this.maxEnergy) synapseEnergy = -this.maxEnergy;
                        this.synapses[this.getSynapseEnergyIndex(i, j)] += synapseEnergy;
                    }
                }
            }
        }
        this.adrenaline /= this.adrenalineFactor;
    },

    
    propagateSynapsesToNeurons: function() {
        for (var i = 0; i < this.totalNeuronsQt; i++) {
            for (var j = 0; j < this.totalNeuronsQt; j++) {
                var energyIndex = this.getSynapseEnergyIndex(i, j);
                var energy = this.synapses[energyIndex];
                this.synapses[energyIndex] = 0;
                this.neurons[this.getNeuronEnergyIndex(j)] += energy;
            }
        }
    },

    mutateSynapses: function() {
        var badness = 0;
        // bad neurons, mutate
        for (var i = 0; i < this.badNeuronsQt; i++) {
            badness += this.neurons[this.getNeuronEnergyIndex(i)] / this.badNeuronsQt;
        }
        // good neurons, not mutate
        for (var i = this.inputNeuronsQt - this.goodNeuronsQt; i < this.inputNeuronsQt; i++) {
            badness -= this.neurons[this.getNeuronEnergyIndex(i)] / this.goodNeuronsQt;
        }
        // [-1 to 1] => [0 to 1]
        this.mutation = (badness + 1) / 2;
        if (isNaN(this.mutation)) {
            throw new Error("NaN mutation");
        }
        this.adrenaline += Math.max(0, badness) * 2 * (this.adrenalineFactor - 1);
        if (this.adrenaline > 1) this.adrenaline = 1;

        for (var i = 0; i < this.totalNeuronsQt; i++) {
            for (var j = 0; j < this.totalNeuronsQt; j++) {
                var resistence = this.synapses[this.getSynapseResistenceIndex(i, j)];
                var energyAbs = Math.abs(this.synapses[this.getSynapseEnergyIndex(i, j)]);

                var resistenceMutation = badness * energyAbs;
                resistence += resistenceMutation * this.resistenceMutationFactor;
                if (resistence > 1) resistence = 1;
                if (resistence < 0) resistence = 0;
                this.synapses[this.getSynapseResistenceIndex(i, j)] = resistence;

                var mutationFactor = this.mutation * (1 - resistence);
                this.mutateSynapse(i, j, mutationFactor, Math.random());
            }
        }
    },


    mutateSynapse: function(i, j, mutationFactor, mutation) {
        var weightIndex = this.getSynapseWeightIndex(i, j);
        this.synapses[weightIndex] = (1 - mutationFactor) * this.synapses[weightIndex] + mutationFactor * mutation;
        if (this.synapses[weightIndex] > 1) this.synapses[weightIndex] = 1;
        if (this.synapses[weightIndex] < -1) this.synapses[weightIndex] = -1;
    },


    reforceSynapses: function() {
        for (var i = 0; i < this.totalNeuronsQt; i++) {
            for (var j = 0; j < this.totalNeuronsQt; j++) {
                if (j == i) continue;
                for (var k = 0; k < this.totalNeuronsQt; k++) {
                    if (i == j || j == k) continue;

                    var synapseEnergy1 = this.synapses[this.getSynapseResistenceIndex(i, j)];
                    var synapseEnergy2 = this.synapses[this.getSynapseResistenceIndex(j, k)];
                    var diff = Math.abs(Math.abs(synapseEnergy1) - Math.abs(synapseEnergy2));
                    if (diff > 1) diff = 1;
                    
                    var resistence = this.synapses[this.getSynapseResistenceIndex(i, k)];

                    var mutationFactor = 0.001 * (1 - resistence);
                    var mutation = (1 - this.diff);
                    this.mutateSynapse(i, k, mutationFactor, mutation);
                }
            }
        }
    },
}};
