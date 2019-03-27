// #================================================================#
// #                     RESOURCELOADER.JS                          #
// #----------------------------------------------------------------#
// # This module helps to deal with all loading of JSON files       #
// #================================================================#


// Constructor
function ResourceLoader(mapFile="", themeFile="", stageFile="", mapFolder="", themeFolder="", stageFolder="") {
	// Initialization
	var loader = this;
	this.map = null;
	this.theme = null;
	this.stage = null;
	this.song = null;
	this.player = null;

	this.mapCallback = null;
	this.themeCallback = null;
	this.stageCallback = null;

	this.loadCompleted = function() {
		return (this.map && this.theme && this.stage && this.song && this.song.readyState > 1);
	}

	this.allCallbackFilled = function() {
		return (this.mapCallback && this.themeCallback && this.stageCallback);
	}

	this.runCallbacks = function() {
		this.mapCallback(this.map);
		this.themeCallback(this.theme);
		this.stageCallback(this.stage);
	}

	// Load a map from the server and create the respective level accordingly
	this.loadMap = function() {
		var request = new XMLHttpRequest();
		request.open('GET', mapFolder + mapFile);
		request.onreadystatechange = function() {
			if (request.readyState == 4 && request.status == 200) {
				var content;
				try {
			 		content = JSON.parse(request.responseText);
			 	}
			 	catch (err) {
			 		// TODO error msg
			 		console.log("Unable to load map.");
			 		return;
			 	}
			 	loader.map = content;
			}
			else if (request.readyState == 4) {
				// TODO handle if map is not found
				alert("Unable to find or open map: " + map);
				return;
			}
		}
		request.send();
	}

	this.loadTheme = function() {
		var request = new XMLHttpRequest();
		request.open('GET', themeFolder + themeFile);
		request.onreadystatechange = function() {
			if (request.readyState == 4 && request.status == 200) {
				var content;
				try {
			 		content = JSON.parse(request.responseText);
			 	}
			 	catch (err) {
			 		// TODO error msg
			 		console.log("Unable to load theme.");
			 		return;
			 	}
			 	loader.theme = content;
			}
			else if (request.readyState == 4) {
				// TODO handle if theme is not found
				alert("Unable to find or open theme: " + themeFile);
				return;
			}
		}
		request.send();	
	}

	this.loadSong = function() {
		try {
			this.song = new Audio(stageFolder + this.stage.song);
		}
		catch (e) {
			console.log(e);
			alert("Unable to load the song: " + songFile);
			return;
		}
		return;		
	}

	this.loadStage = function() {
		// Load the json file representing the music
		var request = new XMLHttpRequest();
		request.open('GET', stageFolder + stageFile);
		request.onreadystatechange = function() {
			if (request.readyState == 4 && request.status == 200) {
				var content;
				try {
			 		content = JSON.parse(request.responseText);
			 	}
			 	catch (err) {
			 		// TODO error msg
			 		console.log("Unable to load file");
			 		console.log(err);
			 		return;
			 	}
			 	// Use global scope to access the loader
			 	loader.stage = content;
				loader.loadSong();
			}
			else if (request.readyState == 4) {
				// TODO handle if theme is not found
				alert("Unable to find or open file: " + stageFile);
				return;
			}
		}
		request.send();		
	}

	this.loadCharacter = function() {
		var myself = this;
		var loader = new THREE.GLTFLoader();
		loader.load('models/stork.glb', function (gltf) {
			myself.player = gltf;
		}, undefined, function (error) {
			console.error(error);
		});
	}

	this.load = function() {
		this.loadMap();
		this.loadTheme();
		this.loadStage();
		this.loadCharacter();
	}

}