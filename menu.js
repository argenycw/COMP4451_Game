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
const multiStage = [
	{stage: 1, name: "Tutorial"},
	{stage: 2, name: "In Progress..."}
]
// # Global objects and variables
var m_resourceLoader = null;
var currentStage = 8;
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
	var howToPlayCallback = function() {
		widget.remove(dialog);
		showHowToPlay();
	}
	var settingCallback = function() {
		widget.remove(dialog);
		showSetting();
	}

	var title = widget.createSimpleText("Rhythm & Jump", "50%", "20%", ["cubic", "brown-rect-text"], "5vw");
	var startSingleBtn = widget.createRectButton("Single Player", "10%", "35%", "80%", "15%", ["brown-rect-btn", "cubic"], storyModeCallback);
	var startMultiBtn = widget.createRectButton("Multiplayer", "10%", "55%", "80%", "15%", ["brown-rect-btn", "cubic"], multiplayerModeCallback);
	var howToPlayBtn = widget.createRectButton("How To Play", "10%", "75%", "80%", "15%", ["brown-rect-btn", "cubic"], howToPlayCallback);
	var setting = widget.createDefinedSVG("85%", "25%", "#svg-setting", ["menu-round-btn"], settingCallback, "setting");
	dialog.appendChild(title);
	dialog.appendChild(startSingleBtn);
	dialog.appendChild(startMultiBtn);
	dialog.appendChild(howToPlayBtn);
	dialog.appendChild(setting);
}

// When this dialog is opened, turn on peer connection
function showHostDialog() {
	var dialog = widget.showDialog("25%", "10%", "50%", "80%", ["brown-dialog"], "host-dialog");
	var title = widget.createSimpleText("Host Game", "50%", "20%", ["cubic", "brown-rect-text"], "5vw");
	var desc = widget.createSimpleText("Your Peer ID: ", "50%", "40%", ["cubic", "black-fill"], "2.5vw");
	// Host the peer connection
	let randString = host();
	var peerId = widget.createSimpleText(randString, "50%", "50%", ["cubic", "red-fill", "svg-selectable"], "2vw", "peerId");
	var hostStatus = widget.createSimpleText("Waiting for connection...", "50%", "70%", ["cubic", "black-fill"], "2vw", "hostStatus");
	var backCallBack = function() {
		terminateConnection();
		widget.remove(dialog);
		multiplayer();
	}
	var startBtn = widget.createRectButton("Begin", "30%", "75%", "40%", "8%", 
		["cubic", "brown-rect-btn", "btn-disabled"], () => {}, null, "start-btn");
	var backBtn = widget.createRectButton("Cancel", "30%", "85%", "40%", "8%", ["cubic", "brown-rect-btn"], backCallBack);
	dialog.appendChild(title);	
	dialog.appendChild(desc);
	dialog.appendChild(peerId);
	dialog.appendChild(hostStatus);
	dialog.appendChild(startBtn);
	dialog.appendChild(backBtn);
}

// Only the host can start multiplayer
function enableMultiplayerStart() {
	var dialog = widget.getWidget("host-dialog");
	var startBtn = widget.getWidget("start-btn");
	startBtn.disabled = false;
	if (startBtn.classList.contains("btn-disabled")) {
		startBtn.classList.remove("btn-disabled");
	}
	startBtn.addEventListener("click", (event) => {
		signal('{"action": {"type": "Selecting stage..."}}');
		widget.remove(dialog);
		stageSelectionMult();
	});
}

// Unlike showHostDialog(), only connect when the player click the connect button
function showJoinDialog() {
	var dialog = widget.showDialog("25%", "10%", "50%", "80%", ["brown-dialog"], "join-dialog");
	var title = widget.createSimpleText("Join Game", "50%", "20%", ["cubic", "brown-rect-text"], "5vw");
	// Let the player input his friend's id	
	var desc = widget.createSimpleText("Peer ID: ", "22%", "40%", ["cubic", "black-fill"], "2.5vw");
	var inputField = widget.createForeignInputField("10%", "45%", "58%", "6vh", ["menu-text-input", "svg-selectable"], "peerid-input");
	var connectBtn = widget.createRectButton("Connect", "70%", "45%", "18%", "8%", ["cubic", "brown-rect-btn", "rect-btn-sm"], () => {
		let peerid = inputField.childNodes[0].value;
		if (peerid.length > 0) {
			join(peerid);
		}
	});
	var joinStatus = widget.createSimpleText("Ready...", "50%", "70%", ["cubic", "black-fill"], "2vw", "joinStatus");
	var backBtn = widget.createRectButton("Cancel", "30%", "85%", "40%", "8%", ["cubic", "brown-rect-btn"], () => {
		terminateConnection();
		widget.remove(dialog);
		multiplayer();
	});
	dialog.appendChild(title);
	dialog.appendChild(desc);
	dialog.appendChild(inputField);
	dialog.appendChild(connectBtn);
	dialog.appendChild(joinStatus);
	dialog.appendChild(backBtn);
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
	var dialog = widget.showDialog("25%", "10%", "50%", "80%", ["brown-dialog"], "stageSelection");
	var title = widget.createSimpleText("Stages", "50%", "20%", ["cubic", "brown-rect-text"], "5vw");
	var backBtn = widget.createRectButton("Back", "75%", "85%", "15%", "8%", ["cubic", "brown-rect-btn"], (event) => {
		widget.remove(dialog);
		showMainDialog();
	});
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

function stageSelectionMult() {
	var dialog = widget.showDialog("25%", "10%", "50%", "80%", ["brown-dialog"], "stageSelection");
	var title = widget.createSimpleText("Stages (Multiplayer)", "50%", "20%", ["cubic", "brown-rect-text"], "3vw");
	var backBtn = widget.createRectButton("Cancel", "65%", "85%", "25%", "8%", ["cubic", "brown-rect-btn"], (event) => {
		terminateConnection();
		widget.remove(dialog);
		multiplayer();
	});

	for (let i = 0; i < multiStage.length; i++) {
		let stage = multiStage[i];
		var playStageI = function(stage) {
			// Signal the peer to begin stage i
			signal('{"action": {"type": "starting", "stage": ' + i + '}}');
			// Start stage normally
			widget.remove(dialog);
			widget.remove("fade");
			clearInterval(animationInterval);
	 		scene = new THREE.Scene();
			renderer.render(scene, camera);
			startMulti(stage);
		}
		// Create the rectangle button to enter the stage
		var grid = widget.createRectButton(stage.name, "25%", (i*1.5+3)*10+"%", "50%", "10%", ["brown-rect-btn", "cubic"], 
			playStageI, i);
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
		// widget.remove("fade");
		showMainDialog();
	}
	var hostCallBack = function() {
		widget.remove(dialog);
		showHostDialog();	
	}	
	var joinCallBack = function() {
		widget.remove(dialog);
		showJoinDialog();	
	}
	var hostBtn = widget.createRectButton("Host", "10%", "30%", "35%", "40%", ["cubic", "brown-rect-btn"], hostCallBack);
	var joinBtn = widget.createRectButton("Join", "55%", "30%", "35%", "40%", ["cubic", "brown-rect-btn"], joinCallBack);
	var backBtn = widget.createRectButton("Back", "75%", "85%", "15%", "8%", ["cubic", "brown-rect-btn"], backCallBack);
	dialog.appendChild(joinBtn);
	dialog.appendChild(hostBtn);
	dialog.appendChild(backBtn);
	dialog.appendChild(title);
}

function showHowToPlay() {
	var dialog = widget.showDialog("25%", "10%", "50%", "80%", ["brown-dialog"], "How To Play");
	var title = widget.createSimpleText("How To Play", "50%", "20%", ["cubic", "brown-rect-text"], "5vw");
	var text1 = widget.createSimpleText("W/A/S/D or up/down/left/right arrows to move your character.", "50%", "30%", ["sub-cubic"], "1.4vw");
	var note_normal_image = widget.createImage("images/firework_normal_01.png", "8%", "40%", "15%", "7.5%");
	var note_double_image = widget.createImage("images/firework_double_01.png", "8%", "55%", "15%", "7.5%");
	var note_reverse_image = widget.createImage("images/firework_reverse_01.png", "7%", "70%", "15%", "7.5%");
	var text2 = widget.createSimpleText("Normal note, you can jump to another platform", "58%", "45%", ["sub-cubic"], "1.4vw");
	var text3 = widget.createSimpleText("Double note, you will jump 2 platforms at once.", "58%", "60%", ["sub-cubic"], "1.4vw");
	var text4 = widget.createSimpleText("Reverse note, you will jump backward.", "52%", "75%", ["sub-cubic"], "1.4vw");
	var backCallBack = function() {
		widget.remove(dialog);
		showMainDialog();
	}
	var backBtn = widget.createRectButton("Back", "75%", "85%", "15%", "8%", ["cubic", "brown-rect-btn"], backCallBack);
	dialog.appendChild(backBtn);
	dialog.appendChild(title);
	dialog.appendChild(note_normal_image);
	dialog.appendChild(note_double_image);
	dialog.appendChild(note_reverse_image);
	dialog.appendChild(text1);
	dialog.appendChild(text2);
	dialog.appendChild(text3);
	dialog.appendChild(text4);
}

function showSetting() {
	var dialog = widget.showDialog("25%", "10%", "50%", "80%", ["brown-dialog"], "Setting");
	var title = widget.createSimpleText("Setting", "50%", "20%", ["cubic", "brown-rect-text"], "5vw");
	var backCallBack = function() {
		widget.remove(dialog);
		showMainDialog();
	}
	var text = widget.createSimpleText("Nothing to set in this version...", "50%", "50%", ["sub-cubic"], "1.8vw");
	var backBtn = widget.createRectButton("Back", "75%", "85%", "15%", "8%", ["cubic", "brown-rect-btn"], backCallBack);
	dialog.appendChild(backBtn);
	dialog.appendChild(text);
	dialog.appendChild(title);
}

function menuWaitUntilLoaded() {
	if (m_resourceLoader.map && g_resourceLoader.allSoundEffectsLoaded()) {
		widget.clearLoadingScreen();
		menuOnSuccessLoad(m_resourceLoader.map);
		showMainDialog();
	}
	else setTimeout(menuWaitUntilLoaded, 200);
}

function playChoiceSound(event) {
	if (event.currentTarget.disabled) return;
	g_resourceLoader.soundEffects[3].currentTime = 0;
	g_resourceLoader.soundEffects[3].play();
}