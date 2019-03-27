// #================================================================#
// #                            MENU.JS                             #
// #----------------------------------------------------------------#
// # This module is the menu displayed when first entering the game #
// #                                                                #
// # Using Widget.js, this handles the selection of stages as well  #
// # as other options                                               #
// #================================================================#
//
// ==================================================================
// # Constants
const c_maxStages = 20;
const gridPerRow = 6;
// # Global objects and variables
var m_resourceLoader = null;
var currentStage = 2;
var angle = 1;
var center = 0;
var scene = null;
var camera = null;
var renderer = null;
var animationInterval = null;
// ==================================================================
function menuAnimate() {
	camera.position.set(center + 50*Math.sin(angle*3.14/180), 20, center - 50*Math.cos(angle*3.14/180));
	camera.lookAt(center - 50*Math.sin(angle*3.14/180), 0, center + 50*Math.cos(angle*3.14/180));
	renderer.render(scene, camera);
	angle = (angle+0.1)%360;
}

function initCanvas() {
	// Create and append a canvas object into DOM
	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize( window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	document.body.appendChild(renderer.domElement);
}

// callback function call when resourceLoader finish loading
// para content : resourceLoader.map
function menuOnSuccessLoad(content) {
	 // Initialize the menu scene
	scene = new THREE.Scene();
 	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
 	camera.position.set(0, 20, -20);
 	camera.lookAt(new THREE.Vector3(0, 0, 20));

 	// Render the sky
 	scene.background = renderSky(content.sky);
 	// light setting
 	setLight(content.light);
 	// Render the platforms
	center = 14 * m_resourceLoader.map.stage.length / 2;
 	buildPlatforms(content.stage, content.platform);
 	// Set the interval with a specific FPS
 	animationInterval = setInterval(function() {requestAnimationFrame(menuAnimate);}, 1000 / (c_FPS/3));
}

function showMainDialog() {
	var dialog = widget.showDialog("25%", "10%", "50%", "80%", ["menu-brown-dialog"], "mainMenu");
	var storyModeCallback = function() {
		widget.remove(dialog);
		stageSelection();
	}
	var multiplayerModeCallback = function() {
		widget.remove(dialog);
		multiplayer();
	}
	var creditCallback = function() {
		widget.remove(dialog);
		showCredit();
	}
	var settingCallback = function() {
		widget.remove(dialog);
		showSetting();
	}

	var title = widget.createSimpleText("Change Me", "50%", "20%", ["cubic", "brown-rect-text"], "5vw");
	var startSingleBtn = widget.createRectButton("Story Mode", "10%", "35%", "80%", "15%", ["brown-rect-btn", "cubic"], storyModeCallback);
	var startMultiBtn = widget.createRectButton("Multiplayer", "10%", "55%", "80%", "15%", ["brown-rect-btn", "cubic"], multiplayerModeCallback);
	var creditBtn = widget.createRectButton("Credit", "10%", "75%", "80%", "15%", ["brown-rect-btn", "cubic"], creditCallback);
	var setting = widget.createDefinedSVG("88%", "13%", "#svg-setting", ["menu-round-btn"], settingCallback, "setting");
	dialog.appendChild(title);
	dialog.appendChild(startSingleBtn);
	dialog.appendChild(startMultiBtn);
	dialog.appendChild(creditBtn);
	dialog.appendChild(setting);
}

function mainMenu() {
	widget.fadeScreenWhite(0.3, 0);
	m_resourceLoader = new ResourceLoader("menu.json", null, null, mapFolder);
	m_resourceLoader.mapCallback = menuOnSuccessLoad;
	m_resourceLoader.loadMap();
	// Display the loading page and wait until loader finishes
	widget.showLoadingScreen();
	menuWaitUntilLoaded();
}


function stageSelection() {
	var backCallBack = function() {
		widget.remove(dialog);
		showMainDialog();
	}
	var dialog = widget.showDialog("25%", "10%", "50%", "80%", ["brown-dialog"], "stageSelection");
	var title = widget.createSimpleText("Stages", "50%", "20%", ["cubic", "brown-rect-text"], "5vw");
	var backBtn = widget.createRectButton("Back", "75%", "85%", "15%", "8%", ["cubic", "brown-rect-btn"], backCallBack);
	for (var i = 0; i < currentStage; i++) {
		var row = parseInt(i / gridPerRow);
		var col = i % gridPerRow;
		var xSep = parseInt(80 / gridPerRow - 10);
		var playStageI = function(stage) {
			widget.remove(dialog);
			widget.remove("fade");
			//TODO: loading scene
			clearInterval(animationInterval);
	 		scene = new THREE.Scene();
			renderer.render(scene, camera);
			start(stage);
		}
		// Create the rectangle button to enter the stage
		var grid = widget.createRectButton((i+1).toString(), (10+xSep+col*(10+xSep))+"%", (30+row*(10+xSep))+"%",
							"10%", "10%", ["brown-rect-btn", "cubic"], playStageI, i);
		dialog.appendChild(grid);
	}
	dialog.appendChild(backBtn);
	dialog.appendChild(title);
}

function multiplayer() {
	var dialog = widget.showDialog("25%", "10%", "50%", "80%", ["brown-dialog"], "Multiplayer");
	var title = widget.createSimpleText("Multiplayer", "50%", "20%", ["cubic", "brown-rect-text"], "5vw");
	var backCallBack = function() {
		widget.remove(dialog);
		widget.remove("fade");
		showMainDialog();
	}
	var backBtn = widget.createRectButton("Back", "75%", "85%", "15%", "8%", ["cubic", "brown-rect-btn"], backCallBack);
	dialog.appendChild(backBtn);
	dialog.appendChild(title);
}

function showCredit() {
	var dialog = widget.showDialog("25%", "10%", "50%", "80%", ["brown-dialog"], "Credit");
	var title = widget.createSimpleText("Credit", "50%", "20%", ["cubic", "brown-rect-text"], "5vw");
	var backCallBack = function() {
		widget.remove(dialog);
		showMainDialog();
	}
	var backBtn = widget.createRectButton("Back", "75%", "85%", "15%", "8%", ["cubic", "brown-rect-btn"], backCallBack);
	dialog.appendChild(backBtn);
	dialog.appendChild(title);
}

function showSetting() {
	var dialog = widget.showDialog("25%", "10%", "50%", "80%", ["brown-dialog"], "Setting");
	var title = widget.createSimpleText("Setting", "50%", "20%", ["cubic", "brown-rect-text"], "5vw");
	var backCallBack = function() {
		widget.remove(dialog);
		showMainDialog();
	}
	var backBtn = widget.createRectButton("Back", "75%", "85%", "15%", "8%", ["cubic", "brown-rect-btn"], backCallBack);
	dialog.appendChild(backBtn);
	dialog.appendChild(title);
}

function menuWaitUntilLoaded() {
	if (m_resourceLoader.map) {
		widget.clearLoadingScreen();
		menuOnSuccessLoad(m_resourceLoader.map);
		showMainDialog();
	}
	else setTimeout(menuWaitUntilLoaded, 200);
}
