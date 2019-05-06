// #================================================================#
// #                            STAGE.JS                            #
// #----------------------------------------------------------------#
// # This module handles the creation of the stage and the platforms#
// # construction.													#
// # This is the outest class for a stage                           #
// #================================================================#
//
// # Dependencies:
//
// - RoundEdgedBox.js
//
// ==================================================================
// # Constants
const mapFolder = 'maps/';
const c_FPS = 45;
const c_PlatformSize = [14, 4, 14];
const c_PlatformSep = 2;
const c_PlatformDefRadius = 2		// the default edge corner radius of each platform
const c_charRadius = 2.5;			// the half of the height of the player
const c_charDefaultPosY = c_charRadius;
const c_shadowSquareSize = 300;		// the size of the square of the directional light casting on the map
const c_shadowStrength = 4096;		// the strength of the directional light casting on the map
const c_jumpInitVelocity = 20;
const c_fallSpeed = 200;
// (c_jumpInitVelocity / c_fallSpeed) * 2 => time needed to jump across ONE platform

const directionX = Object.freeze({"LEFT":1, "RIGHT":-1, "NULL":0});
const directionZ = Object.freeze({"UP":1, "DOWN":-1, "NULL":0});
const platformTypes = Object.freeze({"NORMAL":0, "DESTINATION":1, "HORIZONTAL":2, "VERTICAL":3, "DECORATION":4,
									"XTRACK_L":-1, "XTRACK_R":-2, "ZTRACK_U":-3, "ZTRACK_D":-4});
const playerStatus = Object.freeze({"NORMAL":0, "HORIZONTAL_PLATFORM":1, "VERTICAL_PLATFORM":2});
// ===============================================
// # Global objects and variables
var mixers = []; 					// for animation for the character
var clock = new THREE.Clock();

var paused = false;					// Should the animation stuff be paused
var nextRemaining = 0;
var animationInterval = null;

var audioListener = null;

var stageLevel;
var player = null;
var playerX = 0, playerZ = 0;		// save the x and z position in currentMap
var prevPlayerX = -1 , prevPlayerZ = -1; // save the previous x and z position in currentMap
var peerPlayer = null;
var peerX = 0, peerZ = 0;			// save the x and z position in currentMap
var currentMap = [];
var dynamicPlatformsList = [];
var nextMovement = null;			// To make a smooth control, save the next movement to perform
var fallingY = -5;					// After fallingY, "fall.wav" will be played
var losingY = -100;					// The minimum y the player can reach not to lose

var colliding = false;
var alt = false;

var particleSystem = null;

// ==================================================================
function animate() {
	// requestAnimationFrame(animate);
	moveDynamicPlatforms();
	if (player) {
		playerFall();
		// lost in multiplayer mode => camera follows peer
		if (loseInMult || winInMult) {
			camera.position.set(peerPlayer.position.x, 20, peerPlayer.position.z - 20);
			camera.lookAt(peerPlayer.position.x, 0, peerPlayer.position.z);
		}
		else {
			camera.position.set(player.position.x, 20, player.position.z - 20);
			camera.lookAt(player.position.x, 0, player.position.z);
		}
	}
	checkNextNote();
	moveNotes();
	performFadingAnimation();
	if (multiplaying) {

		if (alt) {
			sendGameData();
		}
		alt = !alt;
	}

	if (particleSystem) particleSystem.updateParticles();
	renderer.render(scene, camera);
}

function moveDynamicPlatforms() {
	for (var i = 0; i < dynamicPlatformsList.length; i++) {
		dynamicPlatformsList[i].move();
	}
}

// ==================================================================
// # Map Related Functions
// ==================================================================

function stageInit(sceneObject) {
	// Initial setup
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	camera.position.set(0, 20, -20);
	camera.lookAt(new THREE.Vector3(0, 0, 20));

	// make the "fog"
	let fogAttr = sceneObject.fog;
	if (fogAttr) {
		scene.fog = new THREE.Fog(fogAttr.color, fogAttr.near, fogAttr.far);
		losingY = -100;
	}

	// generate particle system
	let particleSystemSetup = sceneObject.particles;
	if (particleSystemSetup) {
		particleSystemInit(particleSystemSetup);
	}

	// AudioListener for audio
	audioListener = new THREE.AudioListener();
	camera.add(audioListener);

	// Listener for window resize
	window.addEventListener('resize', function() {
	    renderer.setSize(window.innerWidth, window.innerHeight);
		camera.aspect = window.innerWidth / window.innerHeight;
	    camera.updateProjectionMatrix();
	}, false);

	// Listener for keyboard input
	document.addEventListener("keydown", onKeyDown);
	return;
}

function particleSystemInit(setup) {
	if (!setup) return;
	// fetch all attributes information from setup
	let source = setup.source;
	let size = (setup.size ? setup.size : 1);
	let count = (setup.count ? setup.count : 100);
	let initPos = (setup.init ? setup.init : [0, 0, 0]);
	let initRange = (setup.initRange ? setup.initRange : [0, 0, 0]);
	let initVelocity = (setup.velocity ? setup.velocity : [0, 0, 0]);
	let velocityRange = (setup.velocityRange ? setup.velocityRange : [0, 0, 0]);
	let upperlimit = (setup.upperlimit ? setup.upperlimit : null); // limit: the max position (x/y/z) the particles can reach
	let lowerlimit = (setup.lowerlimit ? setup.lowerlimit : null);
	let lifespan = (setup.lifespan ? setup.lifespan : 999999); // lifespan: the number of frames to survive, infinity by default

	// create the particle variables
	var particles = new THREE.Geometry();
	let img = new THREE.TextureLoader().load(source);
	let pMaterial = new THREE.PointsMaterial({
		size: size, 
		transparent: true, 
		depthWrite: false, 
		blending: THREE.AdditiveBlending, 
		map: img
	});

	function reachLimit(x, y, z) {
		let coord = [x, y, z];
		for (let i = 0; i < 3; i++) {
			if (upperlimit && upperlimit[i] && coord[i] > upperlimit[i]) return true;
			if (lowerlimit && lowerlimit[i] && coord[i] < lowerlimit[i]) return true;
		}
		return false;	
	}

	function createParticle() {
		// create a particle with random position values
		let pX = initPos[0] + (Math.random() - 0.5) * initRange[0];
		let pY = initPos[1] + (Math.random() - 0.5) * initRange[1];
		let pZ = initPos[2] + (Math.random() - 0.5) * initRange[2];
		var particle = new THREE.Vector3(pX, pY, pZ);
		particle.lifespan = lifespan;		
		return particle;
	}

	// now create the individual particles
	for (var p = 0; p < count; p++) {
		let particle = createParticle();
		// add it to the geometry
		particles.vertices.push(particle);
	}

	// create the particle system
	particleSystem = new THREE.Points(particles, pMaterial);
	// set the update function in animate
	particleSystem.updateParticles = () => {
		for (var i = 0; i < count; i++) {
			particles.vertices[i].x += initVelocity[0] + (Math.random() - 0.5) * velocityRange[0];
			particles.vertices[i].y += initVelocity[1] + (Math.random() - 0.5) * velocityRange[1];
			particles.vertices[i].z += initVelocity[2] + (Math.random() - 0.5) * velocityRange[2];
			particles.vertices[i].lifespan--;
			if (particles.vertices[i].lifespan < 0 || reachLimit(particles.vertices[i].x, particles.vertices[i].y
				, particles.vertices[i].z)) {
				// remove this particle, and create another new particle at initPos
				particles.vertices[i] = createParticle();
			}
		}
		particles.verticesNeedUpdate = true;
	}
	scene.add(particleSystem);
}


function getMapElement(z, x, readSign=true) {
	if (currentMap == null || currentMap.length == 0) return null;
	if (z < 0 || x < 0 || z > currentMap.length-1 || x > currentMap[0].length-1) return null;
	if (currentMap[z][x] == null) return null;
	// if '>'/'<': find the actual platform recursively
	if (readSign && currentMap[z][x].type == platformTypes.XTRACK_R) return getMapElement(z, x-1);
	else if (readSign && currentMap[z][x].type == platformTypes.XTRACK_L) return getMapElement(z, x+1);
	else if (readSign && currentMap[z][x].type == platformTypes.ZTRACK_U) return getMapElement(z-1, x);
	else if (readSign && currentMap[z][x].type == platformTypes.ZTRACK_D) return getMapElement(z+1, x);
	return currentMap[z][x];
}

// Create a single rectangular platform
function renderPlatform(platformAttr, rx=1, ry=1, rz=1) {
	// Special scene: all platforms are in wireframe
	if (platformAttr.wireframe) {
		var geometry = new THREE.CubeGeometry(c_PlatformSize[0] * rx, c_PlatformSize[1] * ry, c_PlatformSize[2] * rz);
		var wireframe = new THREE.EdgesGeometry(geometry); // planes in squares but not triangles
		var platform = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({color: 0xffffff}));
		return platform;
	}
	// normal scene with texture and rounded edge box
	else {
		var source = platformAttr.texture;
		var radius = platformAttr.edgeRadius ? platformAttr.edgeRadius : c_PlatformDefRadius;
		var box = RoundEdgedBox(c_PlatformSize[0] * rx, c_PlatformSize[1] * ry, c_PlatformSize[2] * rz, radius);
		// var box = new THREE.CubeGeometry(c_PlatformSize[0], c_PlatformSize[1], c_PlatformSize[2]);
		var textureTop = new THREE.MeshLambertMaterial({map: resourceLoader.textures[source.top]});
		var textureSide = new THREE.MeshLambertMaterial({map: resourceLoader.textures[source.others]});
		var materials = [textureSide, textureSide, textureSide, textureSide, textureTop, textureSide];
		var platform = new THREE.Mesh(box, materials);
		platform.receiveShadow = platformAttr.receiveShadow;
		return platform;
	}
}

// Create a single rectangular platform, with a model on the center
function renderDecoration(platformAttr, x, z) {
	var platform = renderPlatform(platformAttr);
	// Place the decoration object (if any) onto the platform
	if (platformAttr.models) {
		// setup of models loaded from resourceLoader	
		let assets = resourceLoader.decorations[platformAttr.models];
		let deco = assets.children[platformAttr.model].clone();
		// translate
		deco.position.x = x + platformAttr.position[0];
		deco.position.y = platformAttr.position[1];				
		deco.position.z = z + platformAttr.position[2];
		deco.castShadow = platformAttr.castShadow;				
		// rescale
		if (platformAttr.size) {
			let boundingBox = new THREE.Box3().setFromObject(deco);
			let v3 = new THREE.Vector3(1, 1, 1);
			boundingBox.getSize(v3);
			deco.scale.set(platformAttr.size[0]/v3.x, platformAttr.size[1]/v3.y, platformAttr.size[2]/v3.z);
		}
		scene.add(deco);
	}
	return platform;
}

function renderSky(skyObject) {
	// Extract data
	var size = skyObject.size;
	var gradientRect = skyObject.gradient;
	var colorStop = skyObject.colorStop;
	// create canvas
	canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	// get context
	var context = canvas.getContext('2d');
	// draw gradient
	context.rect(0, 0, size, size);
	var gradient = context.createLinearGradient(gradientRect[0], gradientRect[1], gradientRect[2], gradientRect[3]);
	for (var i = 0; i < colorStop.length; i++) {
		gradient.addColorStop(colorStop[i][0], colorStop[i][1]);
	}
	context.fillStyle = gradient;
	context.fill();
	var texture = new THREE.Texture(canvas);
	texture.needsUpdate = true;
	return texture;
}

function setLight(lightObject) {
	if (!lightObject) return;
	var sunPosition = lightObject.sunlight.position;
	// Ambient Light: To avoid the objects to be completely darkened
	// Sunlight: To render the shadows
	var ambientLight = new THREE.AmbientLight(lightObject.ambient.color);
	var sunlight = new THREE.DirectionalLight(lightObject.sunlight.color);
	sunlight.position.set(sunPosition[0], sunPosition[1], sunPosition[2]);
	sunlight.castShadow = true;
	sunlight.shadow.mapSize.width = c_shadowStrength;
	sunlight.shadow.mapSize.height = c_shadowStrength;
	sunlight.shadow.camera.left = c_shadowSquareSize;
	sunlight.shadow.camera.right = -c_shadowSquareSize;
	sunlight.shadow.camera.top = c_shadowSquareSize;
	sunlight.shadow.camera.bottom = -c_shadowSquareSize;
	scene.add(ambientLight);
	scene.add(sunlight);
}

// platforms: 2D array representing the map
function buildPlatforms(stage, platformAttr) {
	currentMap = [];
	dynamicPlatformsList = [];
	for (var i = 0; i < stage.length; i++) {
 		var row = stage[i];
 		var mapRow = [];
 		if (!row) continue;
		for (var j = 0; j < row.length; j++) {
			switch (row[j][0]) {
			case 'P': // Normal platform
				var platform = renderPlatform(platformAttr.normal);
				platform.type = platformTypes.NORMAL;
				platform.position.set(j * (c_PlatformSize[0] + c_PlatformSep), 0, i * (c_PlatformSize[2] + c_PlatformSep));
				scene.add(platform);
				mapRow.push(platform);
				break;
			case 'S': // Starting platform
				var platform = renderPlatform(platformAttr.normal);
				var type = parseInt(row[j][1]);
				platform.type = platformTypes.NORMAL;
				var x_mid = j * (c_PlatformSize[0] + c_PlatformSep);
				platform.position.set(x_mid, 0, i * (c_PlatformSize[2] + c_PlatformSep));
				scene.add(platform);
				// Place player if necessary
				if (!type || type == gameid) {
					// The camera will take this platform as the center
					camera.position.x = x_mid;
					if (!type) player = createPlayer(x_mid); // single
					else player = createPlayer(x_mid, type); // multiplayer
					playerX = j;
					playerZ = i;
					scene.add(player);
				}
				// otherwise place peer character
				else {
					peerPlayer = createPlayer(x_mid, type);
					peerX = j;
					peerZ = i;
					scene.add(peerPlayer);
				}
				mapRow.push(platform);
				break;
			case 'F': // Destination
			 	var platform;
				if (platformAttr.destination) platform = renderPlatform(platformAttr.destination);
				else platform = renderPlatform(platformAttr.normal);
				platform.type = platformTypes.DESTINATION;
				platform.position.set(j * (c_PlatformSize[0] + c_PlatformSep), 0, i * (c_PlatformSize[2] + c_PlatformSep));
				// use sprite to make the desination "glow"
				var spriteMaterial = new THREE.SpriteMaterial({ 
					map: new THREE.ImageUtils.loadTexture('images/glow.png'), 
					color: 0xffff00, 
					transparent: false, 
					blending: THREE.AdditiveBlending
				});
				var sprite = new THREE.Sprite(spriteMaterial);
				sprite.scale.set(40, 40, 1);
				sprite.position.set(j * (c_PlatformSize[0] + c_PlatformSep), c_charDefaultPosY * 2, i * (c_PlatformSize[2] + c_PlatformSep));
				scene.add(sprite);
				scene.add(platform);
				mapRow.push(platform);
				break;
			case 'D': // Decoration
				var platform;
				var type = (row[j].length > 1) ? parseInt(row[j][1]) : 1;
				let x = j * (c_PlatformSize[0] + c_PlatformSep);
				let z = i * (c_PlatformSize[2] + c_PlatformSep);				
				if (platformAttr.decoration) {
					platform = renderDecoration(platformAttr.decoration[type], x, z);
					platform.position.set(x, 0, z);						
					platform.type = platformTypes.DECORATION;
					scene.add(platform);				
				}
				mapRow.push(platform);	
				break;				
			case 'H': // Horizontal moving platform
			 	var platform;
			 	var range = (row[j].length > 1) ? parseInt(row[j][1]) : 1;
				if (platformAttr.horizontal) platform = renderPlatform(platformAttr.horizontal);
				else platform = renderPlatform(platformAttr.normal);
				platform.type = platformTypes.HORIZONTAL;
				platform.position.set(j * (c_PlatformSize[0] + c_PlatformSep), 0, i * (c_PlatformSize[2] + c_PlatformSep));
				platform.initX = platform.position.x;
				platform.initMapX = j;
				platform.velocityX = 10 / c_FPS;
				// set up the moving property
				platform.move = function() {
					if (this.position.x < (this.initMapX - range) * (c_PlatformSize[0] + c_PlatformSep) ||
						this.position.x > (this.initMapX + range) * (c_PlatformSize[0] + c_PlatformSep)) {
						this.velocityX = -this.velocityX;
					}
					if (this.hasPlayer) {
						// Move the player with the platform
						player.position.x += this.velocityX;
						// Move the MapView of the player (playerX playerZ) if necessary
						let dx = 2 * (player.position.x - this.initX) / (c_PlatformSize[0] + c_PlatformSep);
						let dmx = parseInt((dx + ((dx>0) ? 1 : -1)) / 2);
						playerX = this.initMapX + dmx;
					}
					this.position.x += this.velocityX;
				}
				scene.add(platform);
				dynamicPlatformsList.push(platform);
				mapRow.push(platform);
				break;
			case 'Z': // Horizontal (Z) moving platform
				var platform;
			 	var range = (row[j].length > 1) ? parseInt(row[j][1]) : 1;
				if (platformAttr.horizontal) platform = renderPlatform(platformAttr.horizontal);
				else platform = renderPlatform(platformAttr.normal);
				platform.type = platformTypes.HORIZONTAL;
				platform.position.set(j * (c_PlatformSize[0] + c_PlatformSep), 0, i * (c_PlatformSize[2] + c_PlatformSep));
				platform.initZ = platform.position.z;
				platform.initMapZ = i;
				platform.velocityZ = 10 / c_FPS;
				// set up the moving property
				platform.move = function() {
					if (this.position.z < (this.initMapZ - range) * (c_PlatformSize[2] + c_PlatformSep) ||
						this.position.z > (this.initMapZ + range) * (c_PlatformSize[2] + c_PlatformSep)) {
						this.velocityZ = -this.velocityZ;
					}
					if (this.hasPlayer) {
						// Move the player with the platform
						player.position.z += this.velocityZ;
						// Move the MapView of the player (playerX playerZ) if necessary
						let dz = 2 * (player.position.z - this.initZ) / (c_PlatformSize[2] + c_PlatformSep);
						let dmz = parseInt((dz + ((dz>0) ? 1 : -1)) / 2);
						playerZ = this.initMapZ + dmz;
					}
					this.position.z += this.velocityZ;
				}
				scene.add(platform);
				dynamicPlatformsList.push(platform);
				mapRow.push(platform);
				break;
			case 'V': // vertical moving platforms
				var platform;
			 	var range = (row[j].length > 1) ? parseInt(row[j][1]) : 1;
				if (platformAttr.vertical) platform = renderPlatform(platformAttr.vertical);
				else platform = renderPlatform(platformAttr.normal);
				platform.type = platformTypes.VERTICAL;
				platform.position.set(j * (c_PlatformSize[0] + c_PlatformSep), 0, i * (c_PlatformSize[2] + c_PlatformSep));
				platform.initY = platform.position.y;
				platform.velocityY = barPeriod / 1000 / c_FPS;
				// set up the moving property
				platform.move = function() {
					if (this.position.y < this.initY || (this.position.y > this.initY + range * c_PlatformSize[1] * 2)) {
						this.velocityY = -this.velocityY;
					}
					if (this.hasPlayer) {
						// Move the player with the platform
						player.position.y += this.velocityY;
					}
					this.position.y += this.velocityY;
				}
				scene.add(platform);
				dynamicPlatformsList.push(platform);
				mapRow.push(platform);
				break;
			case '>': // XTRACK of moving platforms
				var platform = {};
				platform.isSign = true;
				platform.type = platformTypes.XTRACK_L;
				platform.position = new THREE.Vector3(j * (c_PlatformSize[0] + c_PlatformSep), 0, i * (c_PlatformSize[2] + c_PlatformSep));
				mapRow.push(platform);
				break;
			case '<': // XTRACK of moving platforms
				var platform = {};
				platform.isSign = true;
				platform.type = platformTypes.XTRACK_R;	
				platform.position = new THREE.Vector3(j * (c_PlatformSize[0] + c_PlatformSep), 0, i * (c_PlatformSize[2] + c_PlatformSep));
				mapRow.push(platform);
				break;
			case 'v': // ZTRACK of moving platforms
				var platform = {};
				platform.isSign = true;
				platform.type = platformTypes.ZTRACK_D;	
				platform.position = new THREE.Vector3(j * (c_PlatformSize[0] + c_PlatformSep), 0, i * (c_PlatformSize[2] + c_PlatformSep));
				mapRow.push(platform);
				break;
			case '^': // ZTRACK of moving platforms
				var platform = {};
				platform.isSign = true;
				platform.type = platformTypes.ZTRACK_U;	
				platform.position = new THREE.Vector3(j * (c_PlatformSize[0] + c_PlatformSep), 0, i * (c_PlatformSize[2] + c_PlatformSep));
				mapRow.push(platform);
				break;
			default:
				mapRow.push(null);
				break;
			}
		}
		currentMap.push(mapRow);
	}
}

// The callback actions when the map is succesfully loaded
function stageOnSuccessLoad(content) {
	 // Initialize
 	stageInit(content.scene);
 	// Render the sky
 	scene.background = renderSky(content.sky);
 	// light setting
 	setLight(content.light);
 	// Render the platforms
 	buildPlatforms(content.stage, content.platform);
 	// Set the interval with a specific FPS
 	requestAnimationFrame(animate);
 	animationInterval = setInterval(function() {requestAnimationFrame(animate);}, 1000 / c_FPS);
	paused = false;
}

// This function pauses/resumes everything that refreshes in the game
function gamePauseToggle(mute=true) {
	// Pause
	if (!paused) {
		// Set the pause flag
		paused = true;
		clearInterval(animationInterval);
		nextRemaining = getTimeout(nextNoteTimeout);
		clearTimeout(nextNoteTimeout);		
		// change the svg icon as well
		var pauser = widget.getWidget("pause-resume");
		if (pauser) {
			pauser.setAttribute("href", "#svg-play");
		}
		if (mute) resourceLoader.song.pause();
		else resourceLoader.song.volume = 0.4;
	}
	// Resume
	else {
		animationInterval = setInterval(function() {requestAnimationFrame(animate);}, 1000 / c_FPS);
		nextNoteTimeout = setTimeout(checkNextNote, nextRemaining);
		// unset the pause flag
		paused = false;
		// change the svg icon as well
		var pauser = widget.getWidget("pause-resume");
		if (pauser) {
			pauser.setAttribute("href", "#svg-pause");
		}
		resourceLoader.song.play();
	}
}

// callback function for all backButton in stage
function backCallBack() {
	resourceLoader.song.pause();
	document.removeEventListener("keydown", onKeyDown);
	scene = new THREE.Scene();
	renderer.render(scene, camera);
	var musicbar = svg; // svg in musicbar.js
	musicbar.parentNode.removeChild(musicbar);
	widget.removeAll();
	mainMenu();
}

function nextStageCallback() {
	resourceLoader.song.pause();
	document.removeEventListener("keydown", onKeyDown);
	scene = new THREE.Scene();
	renderer.render(scene, camera);
	var musicbar = svg; // svg in musicbar.js
	musicbar.parentNode.removeChild(musicbar);
	widget.removeAll();
	start(stageLevel + 1);
}

function backMulti(arg=false) {
	document.removeEventListener("keydown", onKeyDown);
	scene = new THREE.Scene();
	renderer.render(scene, camera);
	var musicbar = svg; // svg in musicbar.js
	musicbar.parentNode.removeChild(musicbar);
	widget.removeAll();
	// TODO return to previous menu, but not disconnecting
	if (arg) terminateConnection();
	mainMenu();
}

function quitMulti(disconnect=false) {
	document.removeEventListener("keydown", onKeyDown);
	scene = new THREE.Scene();
	renderer.render(scene, camera);
	var musicbar = svg; // svg in musicbar.js
	musicbar.parentNode.removeChild(musicbar);
	widget.removeAll();
	// TODO return to previous menu, but not disconnecting
	if (disconnect) terminateConnection();
	mainMenu();	
}

// callback function for restartBtn
var restart = function() {
	resourceLoader.song.pause();
	document.removeEventListener("keydown", onKeyDown);
	scene = new THREE.Scene();
	renderer.render(scene, camera);
	var musicbar = svg; // svg in musicbar.js
	musicbar.parentNode.removeChild(musicbar);
	widget.removeAll();
	if (multiplaying) startMulti(stageLevel);
	else start(stageLevel);
}

// When the player wins the currentStage
function stageClear() {
	// stop the game
	if (!paused) gamePauseToggle(false);
	stageEnd();
	// Fade out background
	widget.fadeScreenWhite(5000);
	// display the dialog of winning

	var dialog = widget.showDialog("25%", "25%", "50%", "50%", ["green-dialog"], "clearing-dialog");
	var clearMsg = widget.createSimpleText("Stage Clear", "50%", "30%", ["cubic", "green-rect-text"], "5vw");
	// only show the next button if this is not the last stage
	if (stageLevel + 1 < currentStage) {
		var nextBtn = widget.createRectButton("Next Level", "30%", "45%", "40%", "20%", ["green-rect-btn", "cubic"], nextStageCallback);
		dialog.appendChild(nextBtn);
	} 
	else {
		var text = "This is the last stage of current version.";
		var text2 = "Thank you for playing.";
		var msg = widget.createSimpleText(text, "50%", "50%", ["sub-cubic", "victory-green"], "1.8vw");
		var tqmsg = widget.createSimpleText(text2, "50%", "60%", ["sub-cubic", "victory-green"], "1.8vw");
		dialog.appendChild(msg);
		dialog.appendChild(tqmsg);
	}
	var backBtn = widget.createRectButton("Back to Menu", "30%", "70%", "40%", "20%", ["green-rect-btn", "cubic"], backCallBack);
	dialog.appendChild(clearMsg);
	dialog.appendChild(backBtn);
}

// When the player reach the destination in multiplayer mode
function stageClearMulti() {
	winInMult = true;
	widget.showSimpleText("Stage Clear", "50%", "25%", ["cubic", "green-rect-text", "transparent-50"], "5vw", "win-mult");
	if (widget.screen.contains(explosion)) widget.screen.removeChild(explosion);
	songStarted = false;
	canCheckNextNote = false;
}

// When the player loses the currentStage for any reason
function stageFail() {
	// stop the game
	if (!paused) gamePauseToggle(false);
	stageEnd();
	// Fade out background
	widget.fadeScreenWhite(0.8, 5000);
	// display the dialog of losing
	var dialog = widget.showDialog("25%", "25%", "50%", "50%", ["brown-dialog"], "losing-dialog");
	var gameoverMsg = widget.createSimpleText("Game Over", "50%", "30%", ["cubic", "brown-rect-text"], "5vw");
	var restartBtn = widget.createRectButton("Restart", "30%", "45%", "40%", "20%", ["brown-rect-btn", "cubic"], restart);
	var backBtn = widget.createRectButton("Back to Menu", "30%", "70%", "40%", "20%", ["brown-rect-btn", "cubic"], backCallBack);
	dialog.appendChild(gameoverMsg);
	dialog.appendChild(restartBtn);
	dialog.appendChild(backBtn);
}

// When the player loses the currentStage for any reason in multiplayer mode
function stageFailMulti() {
	loseInMult = true;
	widget.showSimpleText("Game Over", "50%", "25%", ["cubic", "brown-rect-text", "transparent-50"], "5vw", "game-over-mult");
	if (widget.screen.contains(explosion)) widget.screen.removeChild(explosion);
	songStarted = false;
	canCheckNextNote = false;
}

function stageEndMulti() {
	// stop the game
	if (!paused) gamePauseToggle();
	let cnt1 = playMissed;
	let cnt2 = peerMissed;
	// Fade out background
	widget.fadeScreenWhite(0.8, 5000);
	stageEnd();
	// Clear the failed score and game over message
	widget.remove("multi-missed-cnt");
	widget.remove("game-over-mult");
	widget.remove("win-mult");
	// display the dialog of losing
	let color = (winInMult) ? "green" : "brown";
	var dialog = widget.showDialog("25%", "25%", "50%", "50%", [color + "-dialog"], "mult-ending-dialog");
	var missed1 = widget.createSimpleText(cnt1 + " Miss from You", "25%", "35%", ["cubic", "black-fill"], "2vw");
	var missed2 = widget.createSimpleText(cnt2 + " Miss from Peer", "75%", "35%", ["cubic", "black-fill"], "2vw");
	dialog.appendChild(missed1);
	dialog.appendChild(missed2);
	var endMsg;
	if (winInMult) endMsg = widget.createSimpleText("You Win", "50%", "20%", ["cubic", color + "-rect-text"], "4vw");
	else endMsg = widget.createSimpleText("You Lose", "50%", "20%", ["cubic", color + "-rect-text"], "4vw");
	dialog.appendChild(endMsg);
	if (gameid == 1) { // game host: able to choose to restart or back to menu
		var restartBtn = widget.createRectButton("Restart", "30%", "45%", "40%", "20%", [color + "-rect-btn", "cubic"], () => {
			signal('{"action": {"type": "restart"}}');
			restart();
		});
		var backBtn = widget.createRectButton("Back", "30%", "70%", "40%", "20%", [color + "-rect-btn", "cubic"], () => {
			signal('{"action": {"type": "back"}}');
			backMulti(false);
		});	
		dialog.appendChild(restartBtn);
		dialog.appendChild(backBtn);
	}
	else { // joiner: able to disconnect
		var instructMsg = widget.createSimpleText("waiting game host to restart / back...", "50%", "60%", ["black-fill", "cubic"], "1.8vw");
		var dcBtn = widget.createRectButton("Quit", "30%", "70%", "40%", "20%", [color + "-rect-btn", "cubic"], () => {
			signal('{"action": {"type": "quit"}}');
			quitMulti(false);
		});
		dialog.appendChild(instructMsg);
		dialog.appendChild(dcBtn);
	}
}

// ==================================================================
// # Player Related Functions
// ==================================================================
function onKeyDown(event) {
	if (paused) return;
	let keyCode = event.which;
	switch (keyCode) {
	case 87: // W
	case 38: // UP Arrow
		movePlayer(directionX.NULL, directionZ.UP);
		break;
	case 83: // S
	case 40: // DOWN Arrow
		movePlayer(directionX.NULL, directionZ.DOWN);
		break;
	case 65: // A
	case 37: // LEFT Arrow
		movePlayer(directionX.LEFT, directionZ.NULL);
		break;
	case 68: // D
	case 39: // RIGHT Arrow
		movePlayer(directionX.RIGHT, directionZ.NULL);
		break;
	}
	return;
}

function createPlayer(x_mid, type=1) {
	console.log(type);
	let player = (type == 1) ? resourceLoader.player.scene : resourceLoader.player2.scene;
	// embed animations into player
	player.animations = (type == 1) ? resourceLoader.player.animations : resourceLoader.player2.animations;
	player.mixer = new THREE.AnimationMixer(player);
	if (player.animations.length > 0) { // Only add animation when it exists
	    const action = player.mixer.clipAction(player.animations[0]);
	    action.play();
	}
	else console.warn("player has no animation...");
	
	// setup and initialization

	// rescale the player to a proper size indicated by c_charRadius
	let boundingBox = new THREE.Box3().setFromObject(player);
	let v3 = new THREE.Vector3(1, 1, 1);
	boundingBox.getSize(v3);
	let ratio = 2 * 3 * c_charRadius / (v3.x + v3.y + v3.z);
	player.scale.set(ratio, ratio, ratio);
	player.castShadow = true;
	player.position.x = x_mid;
	player.position.y += c_charDefaultPosY;
	player.velocityX = 0;
	player.velocityY = 0;
	player.velocityZ = 0;
	player.status = playerStatus.NORMAL;
	return player;
}

// To handle the jumping/falling motion of the player
function playerFall() {
	if (multiplaying && (loseInMult || winInMult)) return;
	if (player.velocityX == 0 && player.velocityY == 0 && player.velocityZ == 0) return;
	// Y axis rising/falling
	player.position.y += player.velocityY / c_FPS;
	player.velocityY -= c_fallSpeed / c_FPS;
	// Case: Landing
	let platform = getMapElement(playerZ, playerX);
	if (landingAndCollidePlatform(platform)) {
		// Check if the player land on a "decoration" platform
		if (platform.type == platformTypes.DECORATION) {
			// Boom and lose
			playCollideSound();
			if (multiplaying) stageFailMulti();
			else stageFail();
			return;
		}
		// Play the sound effect of landing
		playLandSound();
		colliding = false;
		// Stop character animation, then activate (if exist)
		if (player.mixer.existingAction(player.animations[0])) player.mixer.existingAction(player.animations[0]).stop().play();
		// Cancel all speeds
		player.velocityX = 0;
		player.velocityY = 0;
		player.velocityZ = 0;
		// forcely raise the player up to the stage
		if (player.position.y < c_charDefaultPosY) player.position.y = c_charDefaultPosY;
		if (platform.type == platformTypes.HORIZONTAL) {
			player.status = playerStatus.HORIZONTAL_PLATFORM;
			platform.hasPlayer = true;
		}
		else if (platform.type == platformTypes.VERTICAL) {
			player.status = playerStatus.VERTICAL_PLATFORM;
			platform.hasPlayer = true;			
		}
		else {
			// Fix the landing position to the center of the platform
			/*player.position.y = c_charDefaultPosY;
			player.position.x = platform.position.x;
			player.position.z = platform.position.z;*/
			player.status = playerStatus.NORMAL;
		}
		// Check if the player is landing on the destination (Winning)
		if (platform.type == platformTypes.DESTINATION) {
			if (multiplaying) stageClearMulti();
			else stageClear();
			return;
		}
		// Handle unperformed movement
		if (nextMovement) {
			movePlayer(nextMovement[0], nextMovement[1]);
			nextMovement = null;
		}
	}
	// Case: Jumping / Falling
	else {
		// Play animation (if any)
		if (player.mixer.existingAction(player.animations[0])) {
			player.mixer.existingAction(player.animations[0]).play();
			const delta = clock.getDelta();
			player.mixer.update(delta * c_fallSpeed / c_jumpInitVelocity);
		}
		// X and Z axis moving
		player.position.x += player.velocityX / c_FPS;
		player.position.z += player.velocityZ / c_FPS;
		// Check if the player "loses" by falling out from the platforms
		if (player.position.y < fallingY) startFallSound();
		if (player.position.y < losingY) {
			if (multiplaying) stageFailMulti();
			else stageFail();
		}
	}
}

function landingAndCollidePlatform(platform) {
	if (platform == null) return false;
	if (platform.type == platformTypes.VERTICAL) {
		let yPos = platform.position.y + c_PlatformSize[1] / 4;
		return player.velocityY < 0 && yPos - player.position.y <= 0.001 && intersectPlatform(platform);
	}
	else
		// player has no y velocity, and is at a good position && intersect with the platform rect
		return player.velocityY < 0 && player.position.y - c_charDefaultPosY <= 0.001 && intersectPlatform(platform);
	return false;
}

// Whether the player has a x z intersect with the platform
function intersectPlatform(platform) {
	var r = ((platform.position.x - c_PlatformSize[0] / 2 <= player.position.x) && 
			(platform.position.x + c_PlatformSize[0] / 2 >= player.position.x) && 
			(platform.position.z - c_PlatformSize[2] / 2 <= player.position.z) &&
			(platform.position.z + c_PlatformSize[2] / 2 >= player.position.z));
	return r;
}

function movePlayer(dirX=0, dirZ=0) {
	if (!player) return;
	if (multiplaying && (loseInMult || winInMult)) return;
	// Unable to jump when there is no notes
	if (!jumpable()) {
		// penalty: flash a color illustrating it is wrong
		failedJumpClearup();
		return;
	}

	// Check the type of note for calculation of player movement
	let range = 1;
	let reverse = 1;
	let type = 0;
	if (notesList[0]) {
		let t = notesList[0].getAttribute("type");
		if (t == 'double') {
			range = 2;
			type = 1;
		}
		else if (t == 'reverse') {
			reverse = -1;
			type = 2;
		}
	}

	if (player.velocityY != 0) {
		// If the player almost lands, save the next action to perform immediately after landing
		if (player.velocityY < c_jumpInitVelocity)
			nextMovement = [dirX*range*reverse, dirZ*range*reverse];
		return;
	}
	// Mark the player has left the platform (to avoid horizontal movement)
	let currentPlatform = getMapElement(playerZ, playerX);
	if (currentPlatform) currentPlatform.hasPlayer = false;
	player.velocityY = c_jumpInitVelocity;

	let dpx = (c_PlatformSize[0] + c_PlatformSep);
	let dpz = (c_PlatformSize[2] + c_PlatformSep);
	// try to "fix" the position by jumping towards the center of the platform
	let nextPlatform = getMapElement(playerZ + dirZ, playerX + dirX, false);		
	if (nextPlatform && !nextPlatform.isSign) {
		dpx = Math.abs(player.position.x - nextPlatform.position.x);
		dpz = Math.abs(player.position.z - nextPlatform.position.z);
	}
	player.velocityX = range * dpx * dirX * reverse * (c_fallSpeed / (c_jumpInitVelocity * 2));
	player.velocityZ = range * dpz * dirZ * reverse * (c_fallSpeed / (c_jumpInitVelocity * 2));
	prevPlayerX = playerX;
	prevPlayerZ = playerZ;
	playerX += dirX * range * reverse;
	playerZ += dirZ * range * reverse;
	// Rotate the player to face at where it is jumping
	// if reverse: jump backward :)
	if (dirX) player.rotation.y = dirX * Math.PI / 2;
	else if (dirZ) player.rotation.y = ((dirZ == 1) ? 0 : Math.PI);
	playJumpSound();
	successJumpClearup(type);
}

// Only happen in Multiplayer mode
function collidePlayer(dirX=0, dirZ=0) {
	if (!player) return;
	if (multiplaying && (loseInMult || winInMult)) return;
	// Unable to jump when there is no notes
	if (!jumpable()) return;

	// Check the type of note for calculation of player movement
	let range = 1;
	let reverse = 1;

	// Mark the player has left the platform (to avoid horizontal movement)
	let currentPlatform = getMapElement(playerZ, playerX);
	if (currentPlatform) currentPlatform.hasPlayer = false;
	// player.velocityY = c_jumpInitVelocity;

	let dpx = (c_PlatformSize[0] + c_PlatformSep);
	let dpz = (c_PlatformSize[2] + c_PlatformSep);
	// try to "fix" the position by jumping towards the center of the platform
	let nextPlatform = getMapElement(playerZ + dirZ, playerX + dirX, false);
	if (nextPlatform && !nextPlatform.isSign) {
		dpx = Math.abs(player.position.x - nextPlatform.position.x);
		dpz = Math.abs(player.position.z - nextPlatform.position.z);
	}
	player.velocityX = range * dpx * dirX * reverse * (c_fallSpeed / (c_jumpInitVelocity * 2));
	player.velocityZ = range * dpz * dirZ * reverse * (c_fallSpeed / (c_jumpInitVelocity * 2));
	prevPlayerX = playerX;
	prevPlayerZ = playerZ;
	playerX += dirX*range*reverse;
	playerZ += dirZ*range*reverse;
	playJumpSound();
}


// Functions of sound playing

function playStartSound() {
	g_resourceLoader.soundEffects[7].currentTime = 0;
	g_resourceLoader.soundEffects[7].play();
}

function playCountdownSound() {
	g_resourceLoader.soundEffects[6].currentTime = 0;
	g_resourceLoader.soundEffects[6].play();
}

function playJumpSound() {
	let jumpSound = parseInt(Math.random() * 2);
	g_resourceLoader.soundEffects[jumpSound].volume = 0.2;
	g_resourceLoader.soundEffects[jumpSound].currentTime = 0;
	g_resourceLoader.soundEffects[jumpSound].play();
}

function playLandSound() {
	g_resourceLoader.soundEffects[2].currentTime = 0;
	g_resourceLoader.soundEffects[2].play();
}

function playCollideSound() {
	g_resourceLoader.soundEffects[4].currentTime = 0;
	g_resourceLoader.soundEffects[4].play();	
}

function startFallSound() {
	if (!g_resourceLoader.soundEffects[5].paused) return;
	g_resourceLoader.soundEffects[5].currentTime = 0;
	g_resourceLoader.soundEffects[5].play();
}

// A variable storing a getTimeout function
var getTimeout = (function() { // IIFE
    var _setTimeout = setTimeout, // Reference to the original setTimeout
        map = {}; // Map of all timeouts with their start date and delay

    setTimeout = function(callback, delay) { // Modify setTimeout
        var id = _setTimeout(callback, delay); // Run the original, and store the id
        map[id] = [Date.now(), delay]; // Store the start date and delay
        return id; // Return the id
    };

    return function(id) { // The actual getTimeLeft function
        var m = map[id]; // Find the timeout in map

        // If there was no timeout with that id, return NaN, otherwise, return the time left clamped to 0
        return m ? Math.max(m[1] - Date.now() + m[0], 0) : NaN;
    }
})();
