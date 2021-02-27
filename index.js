var express = require('express'); // Flamework do Servidor
var path = require('path'); // Módulo para manipular caminhos

var app = express(); // Variável do express
var port = process.env.PORT || 3000; // Porta do servidor

// Mandando o Express rodar estaticamente a pasta src
app.use(express.static('src')); 

// Rodando o servidor na determinada porta
app.listen(port);

console.log("Server started at http://localhost:" + port);
