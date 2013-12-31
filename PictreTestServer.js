var fs = require('fs'),PictreTestServer = require('http').createServer(server).listen(8000);

function server(req,res) {
	if(req.url.match(/^\/data/gi)) {
		var file = req.url.split("/");
		var path = "";
		for(var i=0;i<file.length;i++) {
			var separator = i == file.length-1 ? "" : "/";
			path+=file[i]+separator;
		}
		console.log(path);
		file = file[file.length-1];
		fs.readFile(__dirname+path,function(err,data) {
			if(err) {
				res.writeHead(500);
				return res.end("The file '"+path+"' could not be found.");
			}
			res.writeHead(200);
			res.end(data);
		})
	} else {
		fs.readFile(__dirname+"/index.html",function(err,data) {
			if(err) {
				res.writeHead(500);
				return res.end("There was an error loading the test application.");
			}
			res.writeHead(200);
			res.end(data);
		});
	}
}