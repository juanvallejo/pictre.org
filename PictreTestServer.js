var fs = require('fs'),PictreTestServer = require('http').createServer(server).listen(8000);

function server(req,res) {
	fs.readFile(__dirname+"/index.html",function(err,data) {
		if(err) {
			res.writeHead(500);
			return res.end("There was an error loading the test application.");
		}
		res.writeHead(200);
		res.end(data);
	});
}