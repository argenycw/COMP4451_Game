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
	this.player2 = null;
	this.locked = false;

	this.textures = {};
	this.decorationsToLoad = 0;
	this.decorations = {};
	this.soundsToLoad = 0;
	this.soundEffects = [];

	this.mapCallback = null;
	this.themeCallback = null;
	this.stageCallback = null;

	this.loadCompleted = function() {
		return (this.map && this.theme && this.stage && this.allTexturesLoaded() && this.player && this.player2 &&
			this.allDecorationLoaded() && this.song && this.song.readyState > 1);
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
			 	loader.loadTextures();
			 	loader.loadDecorations();
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
		var gltfLoader = new THREE.GLTFLoader();
		gltfLoader.load('models/dog.glb', function (gltf) {
			// ensure every mesh of the model will cast shadow
			gltf.scene.traverse(node => {if (node instanceof THREE.Mesh) {node.castShadow = true;}});
			loader.player = gltf;
		}, undefined, function (error) {
			console.error(error);
		});
	}

	this.loadCharacter2 = function() {
		var gltfLoader = new THREE.GLTFLoader();
		gltfLoader.load('models/dog2.glb', function (gltf) {
			// ensure every mesh of the model will cast shadow
			gltf.scene.traverse(node => {if (node instanceof THREE.Mesh) {node.castShadow = true;}});
			loader.player2 = gltf;
		}, undefined, function (error) {
			console.error(error);
		});
	}	

	this.loadTextures = function() {
		let platforms = this.map.platform;
		for (let key in platforms) {
			// Decoration
			if (Array.isArray(platforms[key])) {
				for (let i = 0; i < platforms[key].length; i++) {
					let textures = platforms[key].texture;
					for (let k in textures) {
						if (loader.textures[textures[k]]) continue;
						loader.textures[textures[k]] = true;
						let texLoader = new THREE.TextureLoader();
						texLoader.load(textures[k], function(texture) {
							loader.textures[textures[k]] = texture;
						}, null, null);
					}					
				}
			}
			// Other platforms
			else {
				let textures = platforms[key].texture;
				for (let k in textures) {
					if (loader.textures[textures[k]]) continue;
					loader.textures[textures[k]] = true;
					let texLoader = new THREE.TextureLoader();
					texLoader.load(textures[k], function(texture) {
						loader.textures[textures[k]] = texture;
					}, null, null);
				}
			}
		}
	}

	this.allTexturesLoaded = function() {
		let tex = this.textures;
		for (let key in tex) {
			if (tex[key] === true) return false;
		}
		return true;
	}

	this.allDecorationLoaded = function() {
		let tex = this.decorations;
		for (let key in tex) {
			if (tex[key] === true) return false;
		}
		return true;		
	}

	this.loadDecorations = function() {
		let decoList = this.map.platform.decoration;
		if (!decoList) return;
		for (let i = 0; i < decoList.length; i++) {
			let deco = decoList[i];
			// avoid loading the same thing twice
			if (this.decorations[deco.models]) continue;
			// load the material beforehand
			// for mtl and obj
			if (deco.models.endsWith(".obj")) {
				var mtlLoader = new THREE.MTLLoader();
				mtlLoader.load(deco.material,
					function (material) {
						// Load the OBJ file then
						var objLoader = new THREE.OBJLoader();
						objLoader.setMaterials(material);
						objLoader.load(deco.models,
							// called when resource is loaded
							function (object) {
								// To increase the saturation of the color, if specified
								// it is placed here instead of stage->renderDecoration so as to avoid 
								// duplicated color multiplication, because there is only ONE material (by reference)
								if (deco.colorDepth) {
									let obj = object.children[deco.model];
									for (let j = 0; j < obj.material.length; j++) {
										obj.material[j].color.r *= deco.colorDepth[0];
										obj.material[j].color.g *= deco.colorDepth[1];
										obj.material[j].color.b *= deco.colorDepth[2];
									}
								}
								loader.decorations[deco.models] = object;					
							}, null,
							// called when loading has errors
							function (error) {
								console.error("Unable to load the following model: ", deco.model, error);
								loader.decorationsToLoad--;
							});
					}, null, 
					function (error) {
						console.error("Unable to load the following material: ", deco.material, error);
					});
			}
			else if (deco.models.endsWith(".json")) {
				var request = new XMLHttpRequest();
				request.open('GET', deco.models);
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
					 	loader.decorations[deco.models] = content.rootnode;					 	
					}
					else if (request.readyState == 4) {
						// TODO handle if theme is not found
						alert("Unable to find or open file: " + stageFile);
						return;
					}
				}
				request.send();	
			}
			// temporarily mark it as TRUE
			this.decorations[deco.models] = true;
			this.decorationsToLoad++;
		}
	}

	this.loadSoundEffects = function(folder, list) {
		let success = 0;
		for (let i = 0; i < list.length; i++) {
			try {
				let sound = new Audio(folder + list[i]);
				this.soundEffects.push(sound);
				success++;
			}
			catch (e) {
				console.warn("Unable to load sound effect: " + list[i] + ":\n" + e);
				return;
			}
		}
		this.soundsToLoad = success;
	}

	this.allSoundEffectsLoaded = function() {
		return (this.soundEffects.length == this.soundsToLoad);
	}

	this.load = function() {
		this.loadMap();
		this.loadTheme();
		this.loadStage();
		this.loadCharacter();
		this.loadCharacter2();
	}

}