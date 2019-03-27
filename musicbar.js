// #================================================================#
// #                         MUSICBAR.JS                            #
// #----------------------------------------------------------------#
// # This module handles the creation and setting of the svg music  #
// # bar                                                            #
// #================================================================#
// # Dependencies:
//
// - stage.js
// - music.js
// - Widget.js
//
// # Constants
const c_musicBarCoordinate = ["0", "0", "100%", "100%"];
const c_musicBarDefaultBgColor = "#282828";
const hitText = "JUMP";
const c_defaultFinalX = 20;
const themeFolder = 'themes/';
// ==================================================================
// # Global objects and variables
var svg = null;
var defs = null;
var musicBar = null;

var noteTheme = null;			// Store the theme for the incoming notes
var notesList = [];				// Store the current note showing on the bar
var hitX = 0;					// The length of the block area, integer value representing percentage

var hitArea = null;				// The area which is itself a boundary of checking valid note hit
var flashArea = null;			// The area which flashes when the note is hit
var fadeTime = 1000;			// The total time needed of fading of the flash area

// For note movement calculation
var initX = 120;
var finalX = 20;
var screenTravelingTime = 2;	// # of second(s) a note needs to move to the hit center


var currentProgress = 0;		// Store the progress of the song (in number of notes)

function themeOnSuccessLoad(content) {
	initMusicBar(content);
}


function setHitCenter(theme) {
	// Retrieve the attributes
	finalX = theme.x ? theme.x : c_defaultFinalX;
	let radius = theme.radius;
	let color = theme.color;

	var hitCenter = document.createElementNS(svgns, "circle");
	hitCenter.setAttribute("cx", finalX);
	hitCenter.setAttribute("cy", "50%");
	hitCenter.setAttribute("r", radius);
	hitCenter.setAttribute("stroke", color);
	hitCenter.setAttribute("fill-opacity", "0");
	svg.append(hitCenter);
}

// Game over when a beat reaches here
function setBlockArea(theme) {
	// Retrieve the attributes
	let width = theme.width;
	let color = theme.color;

	hitX = width;
	var blockArea = document.createElementNS(svgns, "rect");
	blockArea.setAttribute("x", 0);
	blockArea.setAttribute("y", 0);
	blockArea.setAttribute("width", width);
	blockArea.setAttribute("height", "100%");
	blockArea.setAttribute("fill", color);
	svg.appendChild(blockArea);
}

// Note: Whatever the size of hit area, the beats are still perfectly
// hit at "center"
function setHitArea(theme) {
	// Retrieve the attributes
	let width = theme.width;

	hitArea = document.createElementNS(svgns, "rect");
	hitArea.setAttribute("x", hitX);
	hitArea.setAttribute("y", 0);
	hitArea.setAttribute("width", width);
	hitArea.setAttribute("height", "100%");
	hitArea.setAttribute("fill-opacity", "0");
	svg.append(hitArea);
}

function setFlashArea(theme) {
	// Retrieve the attributes
	let width = theme.width;
	let color = theme.color;

	// create the gradient
	var gradient = document.createElementNS(svgns, 'linearGradient');
	gradient.setAttribute("id", "flash");
	gradient.setAttribute("x1", "0%");
	gradient.setAttribute("y1", "0%");
	gradient.setAttribute("x2", "100%");
	gradient.setAttribute("y2", "0%");
	var stop0 = document.createElementNS(svgns, 'stop');
	stop0.setAttribute("offset", "0%");
	stop0.style.stopOpacity = 1;
	stop0.style.stopColor = color;
	var stop1 = document.createElementNS(svgns, 'stop');
	stop1.setAttribute("offset", "100%");
	stop1.style.stopOpacity = 0;
	stop1.style.stopColor = color;
	gradient.appendChild(stop0);
	gradient.appendChild(stop1);
	defs.append(gradient);

	// Make the area
	flashArea = document.createElementNS(svgns, "rect");
	flashArea.setAttribute("x", hitX);
	flashArea.setAttribute("y", 0);
	flashArea.setAttribute("width", width);
	flashArea.setAttribute("height", "100%");
	flashArea.setAttribute("fill", "url(#flash)");
	flashArea.setAttribute("opacity", 0);
	// Set functions for it to flash and fade out
	flashArea.flash = function() {
		fadeTime = theme.fade ? theme.fade : fadeTime;
		var opacity = parseFloat(flashArea.getAttribute("opacity"));
		flashArea.setAttribute("opacity", 1);
		setTimeout(flashArea.fade, fadeTime / 20);
	}
	flashArea.fade = function() {
		var opacity = parseFloat(flashArea.getAttribute("opacity"));
		opacity -= 0.05;
		flashArea.setAttribute("opacity", opacity);
		if (opacity > 0)
			setTimeout(flashArea.fade, fadeTime / 20);
	}
	svg.append(flashArea);
}

function initMusicBar(theme) {
	notesList = [];
	svg = document.createElementNS(svgns, "svg");
	defs = document.createElementNS(svgns, 'defs');
	svg.appendChild(defs);
	musicBar = document.createElementNS(svgns, "rect");
	// Add class for the svg in order to activate CSS
	svg.classList.add("music-bar");
	// Draw the music bar using svg attributes
	musicBar.setAttribute("x", c_musicBarCoordinate[0]);
	musicBar.setAttribute("y", c_musicBarCoordinate[1]);
	musicBar.setAttribute("width", c_musicBarCoordinate[2]);
	musicBar.setAttribute("height", c_musicBarCoordinate[3]);
	musicBar.setAttribute("fill", theme.background.color ? theme.background.color : c_musicBarDefaultBgColor);
	svg.appendChild(musicBar);
	// Draw the areas one by one, from bottom to top
	setBlockArea(theme.blockArea);
	setHitArea(theme.hitArea);
	setFlashArea(theme.flashArea);
	setHitCenter(theme.hitCenter);

	// Store the theme for notes globally
	noteTheme = theme.notes;

	document.body.prepend(svg);
}

// ==================================================================

// Initialize the jump note outside the window and wait for update
function pushJumpNote(theme, speed) {
	var jumpNote = document.createElementNS(svgns, "circle");
	jumpNote.setAttribute("r", theme.radius);
	jumpNote.setAttribute("cx", initX + "%");
	jumpNote.setAttribute("posX", initX);	// A customized attribute storing the integer value of percentage
	jumpNote.setAttribute("cy", "50%");
	jumpNote.setAttribute("fill", theme.fillColor);
	jumpNote.setAttribute("stroke", theme.strokeColor);
	jumpNote.setAttribute("speed", speed);
	svg.appendChild(jumpNote);
	notesList.push(jumpNote);
}

// Move all the notes on the music bar to the left
function moveNotes() {
	for (var i = 0; i < notesList.length; i++) {
		var cx = parseFloat(notesList[i].getAttribute("posX"));
		var speed = parseFloat(notesList[i].getAttribute("speed"));
		cx -= speed;
		notesList[i].setAttribute("posX", cx);
		notesList[i].setAttribute("cx", cx + "%");

		// When the note hits the "block area" => Game over
		var radius = trimPercentage(notesList[i].getAttribute("r"));
		if (cx < trimPercentage(hitX) - radius) {
			// DEBUG MODE: Remove that note and allow tester continue playing
			if (DEBUG) {
				removeNote(notesList[i]);
				notesList.shift();
				i--;
			}
			// RELEASE MODE: Game Over
			else {
				stageFail();
			}
		}
	}
}

function removeNote(note) {
	svg.removeChild(note);
	return;
}

function jumpable() {
	if (DEBUG) return true;
	if (notesList.length == 0) return false;
	var width = trimPercentage(hitArea.getAttribute("width"));
	var x = parseFloat(notesList[0].getAttribute("posX"));
	var leftBound = (x < trimPercentage(finalX) + width);
	var rightBound = (x > trimPercentage(finalX) - width);
	return (leftBound && rightBound);
}

function successJumpClearup() {
	flashArea.flash();
	if (DEBUG) return;
	removeNote(notesList[0]);
	notesList.shift();
}

function trimPercentage(percent) {
	if (typeof percent == 'string') {
		return parseFloat(percent.replace("%", ""));
	}
	return percent;
}
