// ===============================================
// # Constants
const c_FPS = 30;
const c_PlatformSize = [10, 2, 10];
const c_PlatformSep = 2;
const c_charRadius = 2.5;			// the half of the height of the player
const c_charDefaultPosY = c_charRadius + 0.5;
const c_shadowSquareSize = 300;		// the size of the square of the directional light casting on the map
const c_shadowStrength = 4096;		// the strength of the directional light casting on the map
const c_jumpInitVelocity = 15;
const c_fallSpeed = 25;

const directionX = Object.freeze({"LEFT":1, "RIGHT":-1, "NULL":0});
const directionZ = Object.freeze({"UP":1, "DOWN":-1, "NULL":0}); 
// ===============================================
// # Global objects and variables
var scene = null;
var camera = null;
var renderer = null;

var player = null;
var playerX = 0, playerZ = 0;		// save the x and z position in currentMap
var currentMap = [];
var nextMovement = null;			// To make a smooth control, save the next movement to perform

// ===============================================
function animate() {
	requestAnimationFrame(animate);
	if (player) {
		playerFall();
		camera.position.set(player.position.x, 20, player.position.z - 20);
		camera.lookAt(player.position.x, 0, player.position.z);
	}
	renderer.render(scene, camera);
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

	// Create and append a canvas object into DOM
	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	document.body.appendChild(renderer.domElement);

	// make the "fog"
	var fogAttr = sceneObject.fog;
	if (fogAttr) {
		scene.fog = new THREE.Fog(fogAttr.color, fogAttr.near, fogAttr.far);
	}

	// Listener for keyboard input
	document.addEventListener("keydown", onKeyDown);
}

function getMapElement(z, x) {
	if (currentMap == null || currentMap.length == 0) return null;
	if (z < 0 || x < 0 || z > currentMap.length-1 || x > currentMap[0].length-1) return null;
	return currentMap[z][x];
}

// Create a single rectangular platform
// source (string): location of the image
function renderPlatform(platformAttr) {
	var source = platformAttr.texture;
	var geometry = new THREE.BoxGeometry(c_PlatformSize[0], c_PlatformSize[1], c_PlatformSize[2]);
	var texture = new THREE.TextureLoader().load(source);
	var material = new THREE.MeshLambertMaterial({map: texture});
	// var material = new THREE.MeshLambertMaterial();
	// material.color = new THREE.Color(0x00ff00);
	var platform = new THREE.Mesh(geometry, material);
	platform.receiveShadow = platformAttr.receiveShadow;
	return platform;
}

// input: 
// size (int), gradientRect (1D Array [4]), colorStop (2D Array[][2])
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
	for (var i = 0; i < stage.length; i++) {
 		var row = stage[i];
 		var mapRow = [];
 		if (!row) continue;
		for (var j = 0; j < row.length; j++) {
			switch (row[j]) {
			case 'P':
				var platform = renderPlatform(platformAttr);
				platform.position.set(j * (c_PlatformSize[0] + c_PlatformSep), 0, i * (c_PlatformSize[2] + c_PlatformSep));
				scene.add(platform);
				mapRow.push(platform);							
				break;
			case 'S':
				var platform = renderPlatform(platformAttr);
				var x_mid = j * (c_PlatformSize[0] + c_PlatformSep);
				platform.position.set(x_mid, 0, i * (c_PlatformSize[2] + c_PlatformSep));
				scene.add(platform);
				// The camera will take this platform as the center
				camera.position.x = x_mid;
				// Place player, use a sphere as placeholder
				player = createPlayer(x_mid);
				scene.add(player);
				playerX = j;
				playerZ = i;
				// sunlight.target = player;
				mapRow.push(platform);				
				break;
			case 'F':
				var platform = renderPlatform(platformAttr);
				platform.position.set(j * (c_PlatformSize[0] + c_PlatformSep), 0, i * (c_PlatformSize[2] + c_PlatformSep));
				scene.add(platform);
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

// Load a map from the server and create the respective level accordingly
function loadMap(map) {
	var request = new XMLHttpRequest();
	request.open('GET', 'maps/' + map);
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
		 	// Initialize
		 	stageInit(content.scene);
		 	// Render the sky
		 	scene.background = renderSky(content.sky);
		 	// light setting
		 	setLight(content.light);				 	
		 	// Render the platforms
		 	buildPlatforms(content.stage, content.platform);
		 	animate();
		}
		else if (request.readyState == 4) {
			// TODO handle if map is not found
			alert("Unable to find or open map: " + map);
			return;
		}
	}
	request.send();
}

// ==================================================================
// # Player Related Functions
// ==================================================================
function onKeyDown(event) {
	var keyCode = event.which;
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

function createPlayer(x_mid) {
	// Placeholder: temporarily use a sphere to represent
	var sphere = new THREE.SphereBufferGeometry(c_charRadius, 32, 32);
	var materialForChar = new THREE.MeshLambertMaterial();
	materialForChar.color = new THREE.Color(0x2040A0);
	let player = new THREE.Mesh(sphere, materialForChar);

	// setup and initialization
	player.castShadow = true;
	player.position.x = x_mid;
	player.position.y += c_charDefaultPosY;
	player.velocityX = 0;
	player.velocityY = 0;
	player.velocityZ = 0;
	return player;			
}

// To handle the jumping/falling motion of the player
function playerFall() {
	if (player.velocityY == 0) return;
	// Case: Landing
	let platform = getMapElement(playerZ, playerX);
	if (player.position.y < c_charDefaultPosY && platform) {
		// Cancel all speeds
		player.velocityX = 0;
		player.velocityY = 0;
		player.velocityZ = 0;
		// Fix the landing position to the center of the platform
		player.position.y = c_charDefaultPosY;
		player.position.x = platform.position.x;
		player.position.z = platform.position.z;
		// Handle unperformed movement
		if (nextMovement) {
			movePlayer(nextMovement[0], nextMovement[1]);
			nextMovement = null;
		}
	}
	// Case: Jumping / Falling
	else {
		// Y axis rising/falling
		player.position.y += player.velocityY / c_FPS;
		player.velocityY -= c_fallSpeed / c_FPS;
		// X and Z axis moving
		player.position.x += player.velocityX / c_FPS;
		player.position.z += player.velocityZ / c_FPS;
	}
}


function movePlayer(dirX=0, dirZ=0) {
	if (!player) return;
	if (player.velocityY != 0) {
		// If the player almost lands, save the next action to perform immediately after landing
		if (player.velocityY < 0 && player.position.y < c_charDefaultPosY * 2)
			nextMovement = [dirX, dirZ];
		return;
	};
	player.velocityY = c_jumpInitVelocity;			
	player.velocityX = (c_PlatformSize[0] + c_PlatformSep) * dirX * (c_fallSpeed / c_jumpInitVelocity / 2);
	player.velocityZ = (c_PlatformSize[2] + c_PlatformSep) * dirZ * (c_fallSpeed / c_jumpInitVelocity / 2);
	playerX += dirX;
	playerZ += dirZ;
}