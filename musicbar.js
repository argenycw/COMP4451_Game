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
var explosion = null;
var fadeTime = 1000;			// The total time needed of fading of the flash area

// For note movement calculation
var initX = 120;
var finalX = c_defaultFinalX;
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

// Initialize the on hit explosion svg
function setNoteExplosion(theme) {
	let radius = theme.radius;
	let color = theme.color;
	let x = theme.x;
	fadeTime = theme.fade ? theme.fade : fadeTime;

	explosion = document.createElementNS(svgns, "svg");
	var g = document.createElementNS(svgns, "g");
	g.innerHTML = svg_explosion[0];
	explosion.appendChild(g);

	explosion.setAttribute("fill", color);
	explosion.setAttribute("stroke", color);
	explosion.setAttribute("opacity", 0);

	explosion.flash = function() {
		// Recalculate the size according to the screen width/height before each flash
		let vh = parseFloat(theme.radius.replace(/[a-zA-Z]/, ""));
		g.setAttribute("vh", vh);
		let scaleFactor = window.innerHeight * vh / 100 / 50;
		g.setAttribute("transform", "scale(" + scaleFactor + ")");

		// Move to the note pos
		let posX = parseFloat(notesList[0].getAttribute("x").replace(/%/, ""));
		let posY = parseFloat(notesList[0].getAttribute("y").replace(/%/, ""));

		explosion.setAttribute("x", posX - vh + "%");
		explosion.setAttribute("y", "75%");

		// Fade out after flash
		var opacity = parseFloat(explosion.getAttribute("opacity"));
		explosion.setAttribute("opacity", 1);
		setTimeout(explosion.fade, fadeTime / 20);
	}

	explosion.fade = function() {
		var opacity = parseFloat(flashArea.getAttribute("opacity"));
		opacity -= 0.05;
		explosion.setAttribute("opacity", opacity);
		if (opacity > 0)
			setTimeout(explosion.fade, fadeTime / 20);
	}
	widget.screen.appendChild(explosion);
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
	setNoteExplosion(theme.explosion);
	setHitCenter(theme.hitCenter);

	// Store the theme for notes globally
	noteTheme = theme.notes;

	document.body.prepend(svg);
}

// ==================================================================

// Initialize the jump note outside the window and wait for update
function pushJumpNote(theme, speed) {
	var jumpNote = createFirework(theme, speed);
	svg.appendChild(jumpNote);
	notesList.push(jumpNote);
}

// [Deprecated, use createFirework() instead] Create a svg circle for the notes
function createCircle(theme, speed) {
	var jumpNote = document.createElementNS(svgns, "circle");
	jumpNote.setAttribute("r", theme.radius);
	jumpNote.setAttribute("cx", initX + "%");
	jumpNote.setAttribute("posX", initX);	// A customized attribute storing the integer value of percentage
	jumpNote.setAttribute("cy", "50%");
	jumpNote.setAttribute("fill", theme.fillColor);
	jumpNote.setAttribute("stroke", theme.strokeColor);
	jumpNote.setAttribute("speed", speed);
	return jumpNote;
}

function createFirework(theme, speed) {
	var jumpNote = document.createElementNS(svgns, "svg");
	var g = document.createElementNS(svgns, "g");
	g.innerHTML = svg_firework[0];
	g.setAttribute("animation", 0);
	g.setAttribute("frame", 0);
	// Resize according to the screen width/height
	let vh = parseFloat(theme.radius.replace(/[a-zA-Z]/, ""));
	g.setAttribute("vh", vh);
	let scaleFactor = window.innerHeight * vh / 100 / 50;
	g.setAttribute("transform", "scale(" + scaleFactor + ")");
	jumpNote.appendChild(g);

	jumpNote.setAttribute("x", initX + "%");
	jumpNote.setAttribute("posX", initX);	// A customized attribute storing the integer value of percentage
	jumpNote.setAttribute("y", "25%");
	//jumpNote.setAttribute("fill", theme.fillColor);
	//jumpNote.setAttribute("stroke", theme.strokeColor);
	jumpNote.setAttribute("speed", speed);
	return jumpNote;
}

// Move all the notes on the music bar to the left
function moveNotes() {
	for (var i = 0; i < notesList.length; i++) {
		// animate the firework
		let g = notesList[i].firstChild;
		let frame = parseInt(g.getAttribute("frame"));
		let animation = parseInt(g.getAttribute("animation"));
		frame++;
		if (frame >= c_FPS / svg_firework.length / 2) {
			let animationFrame = (animation + 1) % svg_firework.length;
			g.innerHTML = svg_firework[animationFrame];
			g.setAttribute("animation", animationFrame);
			frame = 0;
		}
		g.setAttribute("frame", frame);

		// translate the firework to the left
		var cx = parseFloat(notesList[i].getAttribute("posX"));
		var speed = parseFloat(notesList[i].getAttribute("speed"));
		cx -= speed;
		notesList[i].setAttribute("posX", cx);
		notesList[i].setAttribute("x", cx + "%");

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

function resizeExistingNotes() {
	for (var i = 0; i < notesList.length; i++) {
		let g = notesList[i].firstChild;
		let vh = parseFloat(g.getAttribute("vh"));
		let scaleFactor = window.innerHeight * vh / 100 / 50;
		g.setAttribute("transform", "scale(" + scaleFactor + ")");
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
	explosion.flash();
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

//#=================================
//# Inline drawing of svg
//#=================================
var svg_firework = [`
<defs><linearGradient id="linear-gradient" x1="98.37" y1="49.09" x2="300" y2="49.09" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#bde4f8"/><stop offset="0.04" stop-color="#9bd7f2"/><stop offset="0.09" stop-color="#77c8ed"/><stop offset="0.15" stop-color="#57bbe7"/><stop offset="0.21" stop-color="#3bb1e3"/><stop offset="0.28" stop-color="#25a8df"/><stop offset="0.36" stop-color="#14a1dc"/><stop offset="0.46" stop-color="#099cda"/><stop offset="0.6" stop-color="#029ad9"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient-2" x1="99.52" y1="36.82" x2="272.07" y2="36.82" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#cae9fa"/><stop offset="0.08" stop-color="#a3daf4"/><stop offset="0.19" stop-color="#78c9ed"/><stop offset="0.3" stop-color="#53bae7"/><stop offset="0.42" stop-color="#35aee2"/><stop offset="0.54" stop-color="#1ea5de"/><stop offset="0.67" stop-color="#0d9edb"/><stop offset="0.82" stop-color="#039ada"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient-3" x1="99.76" y1="66.83" x2="269.33" y2="66.83" xlink:href="#linear-gradient-2"/></defs><g id="Layer_2" data-name="Layer 2"><path d="M98.37,51a46.67,46.67,0,0,0,22.16,39.13c8.43,5.08,16.56,5.77,26.14,6.58,6.85.57,18.46,1.52,31.49-3.21,6-2.18,12.09-4.4,17.88-9,2.65-2.12,5.74-5.14,11.32-7.34,2.53-1,4.8-1.53,4.73-2-.09-.67-5-.67-9.32-.15-9.76,1.17-15.72,5-15.9,4.59-.5-1.12,11.7-10.81,25.38-12.39,2.06-.23,9.67-.93,18.26-1.31,2.5-.11,2.84-.1,4.06-.22,5.91-.57,8.53-1.94,15.83-3.36,1.19-.23,2.73-.53,4.67-.78,9.78-1.3,12.91.67,22.45-.14A62.6,62.6,0,0,0,286.24,60c7-1.61,14-4.43,13.76-5.2-.1-.37-1.76,0-5.05.15a67,67,0,0,1-17.39-1.49c-4.24-.85-6.36-1.27-9.06-2.48a46,46,0,0,0-6.11-2.6,37.3,37.3,0,0,0-5-1.13c-6-.89-13.21.14-15.48.37-10.64,1-22.58-5.11-28.75-12.45-2.75-3.26-3.11-4.87-8.06-11.29A67.46,67.46,0,0,0,196.81,15C188,7,182.14,4.61,180.09,3.83,176.19,2.35,170.78,1,161.82,1c-12.38,0-28.74.07-43.34,11.68C114.87,15.58,98.29,28.76,98.37,51Z" transform="translate(-97.87 -0.53)" style="stroke:#3586c8;stroke-miterlimit:10;fill:url(#linear-gradient)"/></g><g id="Layer_3" data-name="Layer 3"><path d="M101,54.57c-3.55-4.19.09-12.33,1.46-15.39,4-9,11.25-13.83,14.67-16a50.23,50.23,0,0,1,17.74-6.88c3.52-.66,18.51-3.48,29.81,3.06,2.45,1.41,6.82,4.48,12.68,7.94,1.18.7,2.69,1.57,4.69,3,3.08,2.18,4.13,3.45,9.38,6.36,15,8.28,27.43,10.19,27.21,11.16-.15.68-7.32-.83-18.19-1.84A165.91,165.91,0,0,0,179.69,45c-7.84.22-18.7.54-31,5-10.59,3.83-10.84,6.58-18.34,7.52-4.28.54-14.76,1-19.35,1-.08,0-.18,0-.31,0S103.74,57.76,101,54.57Z" transform="translate(-97.87 -0.53)" style="fill:url(#linear-gradient-2)"/><path d="M106.63,56.46h0a15.75,15.75,0,0,0,6.88,1.77c5,.07,32.32-7.86,42.79-10,7-1.45,13.77-1.32,27.36-1.07,16.66.31,26.58,2.25,32.87,3.82,8.51,2.12,13.44,4.33,13.3,4.89-.21.82-8.1-2.25-18.18.25-.38.09-1.44.44-3.34,1-4.1,1.22-7.07,2-7.37,2.11-6.3,1.75-21.45,12.17-31.8,17.74-6.91,3.71-15.62,8.29-27.52,9.47-12.36,1.23-19.5-2.08-22-3.4a33.07,33.07,0,0,1-5.81-3.91C102.73,69.81,98.05,52,100.33,50.79,101,50.44,102.64,51.39,106.63,56.46Z" transform="translate(-97.87 -0.53)" style="fill:url(#linear-gradient-3)"/></g>
`,`
<defs><linearGradient id="linear-gradient" x1="99.83" y1="50" x2="299.84" y2="50" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#bde4f8"/><stop offset="0.04" stop-color="#9bd7f2"/><stop offset="0.09" stop-color="#77c8ed"/><stop offset="0.15" stop-color="#57bbe7"/><stop offset="0.21" stop-color="#3bb1e3"/><stop offset="0.28" stop-color="#25a8df"/><stop offset="0.36" stop-color="#14a1dc"/><stop offset="0.46" stop-color="#099cda"/><stop offset="0.6" stop-color="#029ad9"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient-2" x1="101.74" y1="35.88" x2="249.36" y2="35.88" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#cae9fa"/><stop offset="0.08" stop-color="#a3daf4"/><stop offset="0.19" stop-color="#78c9ed"/><stop offset="0.3" stop-color="#53bae7"/><stop offset="0.42" stop-color="#35aee2"/><stop offset="0.54" stop-color="#1ea5de"/><stop offset="0.67" stop-color="#0d9edb"/><stop offset="0.82" stop-color="#039ada"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient-3" x1="101.59" y1="59.73" x2="258.53" y2="59.73" xlink:href="#linear-gradient-2"/></defs><g id="Layer_2" data-name="Layer 2"><path d="M99.83,53.27c0,12,6.09,21.92,7.83,24.75A47,47,0,0,0,119.2,91a41.06,41.06,0,0,0,21.91,8c12.92.67,23.11-5.35,27.61-8,7.46-4.41,7.23-5.47,16.37-10.14,7-3.59,12.52-6.33,19.81-6.94,9.63-.8,15.66,2.69,16.06,1.43.46-1.43-6.6-7.69-15.44-8.72-11.38-1.33-19.77,6.72-20.27,5.69s6.44-8.38,16.32-10.32a26.86,26.86,0,0,1,8.89-.17c8.33,1,13.92,5.53,29,8.49,7.87,1.53,19.08,3.59,32.35,0,16.34-4.42,28.26-15.35,28-16-.16-.36-4.47,3-11.19,4.79-3,.82-13.29,3-28.5-3.2-11.07-4.49-4.51-2.06-24.31-16-7.1-5-15.93-15.26-32.42-25.95C189.92,5.24,171.28,1.35,160.82,1a59.86,59.86,0,0,0-42.5,17C112.2,23.9,99.77,35.91,99.83,53.27Z" transform="translate(-99.33 -0.51)" style="stroke:#3586c8;stroke-miterlimit:10;fill:url(#linear-gradient)"/></g><g id="Layer_3" data-name="Layer 3"><path d="M102.48,54.72c-2.37-4.52,1.49-11.45,3.67-15.36a52.44,52.44,0,0,1,18.36-18.55A55.44,55.44,0,0,1,153,13.05c7.78,0,13.34,1.76,21.12,4.16,13.26,4.09,23.94,9.92,23.64,11S186.89,22.4,172.6,24.8C159.8,27,148,35.94,143.07,39.74c-2.55,1.95-1.84,1.61-6.15,5-16.83,13.3-21.9,14-24.83,14C110.19,58.69,104.52,58.64,102.48,54.72Z" transform="translate(-99.33 -0.51)" style="fill:url(#linear-gradient-2)"/><path d="M108.08,56.62c1.88.72,2.55.61,6.88,1.76,3.44.91,3.49,1.1,4.66,1.34,0,0,8.44,1.75,19.44-7.5l2.33-1.93c.53-.44,1.2-1,2.18-1.75,5.39-4.22,9.62-7,10.14-7.38,4.26-2.82,23.41-12.93,46-6.58,6.7,1.88,14.89,4.18,21.86,11.76,2.95,3.22,3.87,5.4,7.61,8.32,8.44,6.58,17.31,6,17.22,6.64-.12.86-10.1,2.49-22-.79-5.47-1.51-7.45-3-11-4.15a32.32,32.32,0,0,0-4.21-1c-9-1.84-20.41,4.12-21.31,4.6-13.93,7.45-13.29,12.21-25.52,19.27-5.91,3.41-15.14,8.59-27.14,7.64-4.16-.32-12.23-1-19.93-7.57-11-9.37-14.84-25-13.33-26.17C102.54,52.58,103.75,55,108.08,56.62Z" transform="translate(-99.33 -0.51)" style="fill:url(#linear-gradient-3)"/></g>
`,`
<defs><linearGradient id="linear-gradient" x1="98.37" y1="49.09" x2="300" y2="49.09" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#bde4f8"/><stop offset="0.04" stop-color="#9bd7f2"/><stop offset="0.09" stop-color="#77c8ed"/><stop offset="0.15" stop-color="#57bbe7"/><stop offset="0.21" stop-color="#3bb1e3"/><stop offset="0.28" stop-color="#25a8df"/><stop offset="0.36" stop-color="#14a1dc"/><stop offset="0.46" stop-color="#099cda"/><stop offset="0.6" stop-color="#029ad9"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient-2" x1="99.52" y1="36.82" x2="272.07" y2="36.82" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#cae9fa"/><stop offset="0.08" stop-color="#a3daf4"/><stop offset="0.19" stop-color="#78c9ed"/><stop offset="0.3" stop-color="#53bae7"/><stop offset="0.42" stop-color="#35aee2"/><stop offset="0.54" stop-color="#1ea5de"/><stop offset="0.67" stop-color="#0d9edb"/><stop offset="0.82" stop-color="#039ada"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient-3" x1="99.76" y1="66.83" x2="269.33" y2="66.83" xlink:href="#linear-gradient-2"/></defs><g id="Layer_2" data-name="Layer 2"><path d="M98.37,51a46.67,46.67,0,0,0,22.16,39.13c8.43,5.08,16.56,5.77,26.14,6.58,6.85.57,18.46,1.52,31.49-3.21,6-2.18,12.09-4.4,17.88-9,2.65-2.12,5.74-5.14,11.32-7.34,2.53-1,4.8-1.53,4.73-2-.09-.67-5-.67-9.32-.15-9.76,1.17-15.72,5-15.9,4.59-.5-1.12,11.7-10.81,25.38-12.39,2.06-.23,9.67-.93,18.26-1.31,2.5-.11,2.84-.1,4.06-.22,5.91-.57,8.53-1.94,15.83-3.36,1.19-.23,2.73-.53,4.67-.78,9.78-1.3,12.91.67,22.45-.14A62.6,62.6,0,0,0,286.24,60c7-1.61,14-4.43,13.76-5.2-.1-.37-1.76,0-5.05.15a67,67,0,0,1-17.39-1.49c-4.24-.85-6.36-1.27-9.06-2.48a46,46,0,0,0-6.11-2.6,37.3,37.3,0,0,0-5-1.13c-6-.89-13.21.14-15.48.37-10.64,1-22.58-5.11-28.75-12.45-2.75-3.26-3.11-4.87-8.06-11.29A67.46,67.46,0,0,0,196.81,15C188,7,182.14,4.61,180.09,3.83,176.19,2.35,170.78,1,161.82,1c-12.38,0-28.74.07-43.34,11.68C114.87,15.58,98.29,28.76,98.37,51Z" transform="translate(-97.87 -0.53)" style="stroke:#3586c8;stroke-miterlimit:10;fill:url(#linear-gradient)"/></g><g id="Layer_3" data-name="Layer 3"><path d="M101,54.57c-3.55-4.19.09-12.33,1.46-15.39,4-9,11.25-13.83,14.67-16a50.23,50.23,0,0,1,17.74-6.88c3.52-.66,18.51-3.48,29.81,3.06,2.45,1.41,6.82,4.48,12.68,7.94,1.18.7,2.69,1.57,4.69,3,3.08,2.18,4.13,3.45,9.38,6.36,15,8.28,27.43,10.19,27.21,11.16-.15.68-7.32-.83-18.19-1.84A165.91,165.91,0,0,0,179.69,45c-7.84.22-18.7.54-31,5-10.59,3.83-10.84,6.58-18.34,7.52-4.28.54-14.76,1-19.35,1-.08,0-.18,0-.31,0S103.74,57.76,101,54.57Z" transform="translate(-97.87 -0.53)" style="fill:url(#linear-gradient-2)"/><path d="M106.63,56.46h0a15.75,15.75,0,0,0,6.88,1.77c5,.07,32.32-7.86,42.79-10,7-1.45,13.77-1.32,27.36-1.07,16.66.31,26.58,2.25,32.87,3.82,8.51,2.12,13.44,4.33,13.3,4.89-.21.82-8.1-2.25-18.18.25-.38.09-1.44.44-3.34,1-4.1,1.22-7.07,2-7.37,2.11-6.3,1.75-21.45,12.17-31.8,17.74-6.91,3.71-15.62,8.29-27.52,9.47-12.36,1.23-19.5-2.08-22-3.4a33.07,33.07,0,0,1-5.81-3.91C102.73,69.81,98.05,52,100.33,50.79,101,50.44,102.64,51.39,106.63,56.46Z" transform="translate(-97.87 -0.53)" style="fill:url(#linear-gradient-3)"/></g>
`,`
<defs><linearGradient id="linear-gradient" x1="100.83" y1="50.02" x2="300.03" y2="50.02" gradientTransform="matrix(1, 0, 0, -1, 0, 100)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#bde4f8"/><stop offset="0.04" stop-color="#9bd7f2"/><stop offset="0.09" stop-color="#77c8ed"/><stop offset="0.15" stop-color="#57bbe7"/><stop offset="0.21" stop-color="#3bb1e3"/><stop offset="0.28" stop-color="#25a8df"/><stop offset="0.36" stop-color="#14a1dc"/><stop offset="0.46" stop-color="#099cda"/><stop offset="0.6" stop-color="#029ad9"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient-2" x1="102.74" y1="35.88" x2="250.36" y2="35.88" gradientTransform="matrix(1, 0, 0, -1, 0, 100)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#cae9fa"/><stop offset="0.08" stop-color="#a3daf4"/><stop offset="0.19" stop-color="#78c9ed"/><stop offset="0.3" stop-color="#53bae7"/><stop offset="0.42" stop-color="#35aee2"/><stop offset="0.54" stop-color="#1ea5de"/><stop offset="0.67" stop-color="#0d9edb"/><stop offset="0.82" stop-color="#039ada"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient-3" x1="102.59" y1="59.73" x2="259.53" y2="59.73" xlink:href="#linear-gradient-2"/></defs><g id="Layer_2" data-name="Layer 2"><path d="M100.83,46.73c0-12,6.09-21.92,7.83-24.75A42.87,42.87,0,0,1,120.2,9a42.23,42.23,0,0,1,22.73-8c13.2-.6,22.71,5.4,26.79,8,1.93,1.26,2.32,1.7,5.57,4.2,13.34,10.29,20,15.43,28.66,18.6,10.93,4,23.77,3.69,30.91,2.52,7.79-1.28,8.91-3.05,17.16-3.86A66.32,66.32,0,0,1,276.83,33c13.06,3.86,23.81,11.42,23.17,12.88-.5,1.13-7.23-2.94-18.07-3.07-11.44-.13-20,3.89-28.66,8.28-22.49,11.43-22.66,21.37-42.93,28.66-6.3,2.27-14.67,4.33-14.45,5.58.17.94,4.94.4,13.33,1.79,3.45.58,10.43,1.74,10.42,3,0,1.81-15.67-.5-34,5A78.08,78.08,0,0,1,161.82,99s-1.22,0-2.37-.08c-7.32-.38-25.3-2.56-40.13-16.88C113.2,76.1,100.77,64.09,100.83,46.73Z" transform="translate(-100.33 -0.49)" style="stroke:#3586c8;stroke-miterlimit:10;fill:url(#linear-gradient)"/></g><g id="Layer_3" data-name="Layer 3"><path d="M103.48,45.28c-2.37,4.52,1.49,11.45,3.67,15.36a52.44,52.44,0,0,0,18.36,18.55A55.44,55.44,0,0,0,154,87c7.78,0,13.34-1.76,21.12-4.16,13.26-4.09,23.94-9.92,23.64-11S187.89,77.6,173.6,75.2C160.8,73.05,149,64.06,144.07,60.26c-2.55-1.95-1.84-1.61-6.15-5-16.83-13.3-21.9-14-24.83-14C111.19,41.31,105.52,41.36,103.48,45.28Z" transform="translate(-100.33 -0.49)" style="fill:url(#linear-gradient-2)"/><path d="M109.08,43.38c1.88-.72,2.55-.61,6.88-1.76,3.44-.91,3.49-1.1,4.66-1.34,0,0,8.44-1.75,19.44,7.5l2.33,1.93c.53.44,1.2,1,2.18,1.75,5.39,4.22,9.62,7,10.14,7.38,4.26,2.82,23.41,12.93,46,6.58,6.7-1.88,14.89-4.18,21.86-11.76,2.95-3.22,3.87-5.4,7.61-8.32,8.44-6.58,17.31-6,17.22-6.64-.12-.86-10.1-2.49-22,.79-5.47,1.51-7.45,3-11,4.15a32.32,32.32,0,0,1-4.21,1c-9,1.84-20.41-4.12-21.31-4.6-13.93-7.45-13.29-12.21-25.52-19.27-5.91-3.41-15.14-8.59-27.14-7.64-4.16.32-12.23,1-19.93,7.57-11,9.37-14.84,25-13.33,26.17C103.54,47.42,104.75,45.05,109.08,43.38Z" transform="translate(-100.33 -0.49)" style="fill:url(#linear-gradient-3)"/></g>
`];

var svg_explosion = [`
	<g>
		<g>
			<path d="M291.889,8.704c0-0.512-0.512-1.024-1.024-1.024l-7.68-0.512l-3.072-6.656C280.113,0,279.601,0,279.089,0
				c-0.512,0-1.024,0.512-1.024,0.512l-3.584,6.656l-7.168,1.024c-0.512,0-1.024,0.512-1.024,1.024s0,1.024,0.512,1.536l4.608,4.608
				l-1.536,7.168c0,0.512,0,1.024,0.512,1.024c0.512,0,1.024,0.512,1.536,0l6.656-3.584l6.656,3.584h0.512c0.512,0,0.512,0,0.512,0
				c0.512-0.512,0.512-0.512,0.512-1.024l-1.024-7.168l5.632-5.12C291.889,9.728,291.889,9.216,291.889,8.704z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M43.569,60.928l-6.144-3.584l-1.024-7.168c0-0.512-0.512-1.024-1.024-1.024c-0.512,0-1.024,0-1.536,0.512l-5.12,5.632
				l-7.168-1.024c-0.512,0-1.024,0-1.024,0.512c-0.512,0.512-0.512,1.024,0,1.536l3.072,5.632l-3.584,6.656c0,0.512,0,1.024,0,1.536
				c0,0.512,1.024,0.512,1.024,0.512l7.168-1.536l5.12,5.12c0,0,0.512,0.512,1.024,0.512h0.512c0.512,0,1.024-0.512,1.024-1.024
				l1.024-7.168l6.656-3.584c0.512,0,0.512-0.512,0.512-1.024C44.081,61.44,43.569,60.928,43.569,60.928z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M342.064,281.6l-6.144-4.096l-0.512-7.68c0-0.512-0.512-1.024-0.512-1.024c-0.512,0-1.024,0-1.536,0l-5.632,4.608
				l-7.168-2.048c-0.512,0-1.024,0-1.536,0.512c-0.512,0.512-0.512,1.024,0,1.536l2.56,6.656l-4.096,6.144
				c-0.512,0.512-0.512,1.024,0,1.536c0,0.512,0.512,0.512,1.024,0.512l7.68-0.512l4.608,5.632c0,0.512,0.512,0.512,1.024,0.512
				c0,0,0,0,0.512,0c0.512,0,1.024-0.512,1.024-1.024l2.048-7.168l7.168-2.56c0.512,0,1.024-0.512,1.024-1.024
				C342.577,282.112,342.577,281.6,342.064,281.6z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M33.84,226.304c0-0.512,0-1.024-0.512-1.024l-6.144-4.096l-0.512-7.68c0-0.512-0.512-1.024-0.512-1.024
				c-0.512,0-1.024,0-1.536,0l-5.632,4.608l-7.168-1.536c-0.512,0-1.024,0-1.536,0.512c-0.512,0.512-0.512,1.024,0,1.536l2.56,6.656
				L8.753,230.4c-0.512,0.512-0.512,1.024,0,1.536c0,0.512,0.512,0.512,1.024,0.512l7.68-0.512l4.608,5.632
				c0,0.512,0.512,0.512,1.024,0.512c0,0,0,0,0.512,0c0.512,0,1.024-0.512,1.024-1.024l2.048-7.168l7.168-2.56
				C33.84,227.328,33.84,226.816,33.84,226.304z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M72.241,332.8c-1.024,0-1.024-0.512-1.536-0.512l-7.68-1.536l-3.072-6.656c0-0.512-0.512-0.512-1.024-0.512
				c-0.512,0-1.024,0.512-1.024,0.512l-3.584,6.656l-7.168,1.024c-0.512,0-1.024,0.512-1.024,1.024c0,0.512,0,1.024,0.512,1.536
				l5.12,5.12l-1.536,7.168c0,0.512,0,1.024,0.512,1.024c0.512,0.512,1.024,0.512,1.536,0l6.656-3.584l6.656,3.584h0.512
				c0.512,0,0.512,0,0.512,0c0.512-0.512,0.512-0.512,0.512-1.024l-1.024-7.168l5.632-5.12
				C72.241,333.824,72.241,333.312,72.241,332.8z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M174.641,0c-3.072,0-5.12,2.048-5.12,5.12v143.872c0,3.072,2.56,5.12,5.12,5.12c3.072,0,5.12-2.048,5.12-5.12V5.12
				C179.761,2.048,177.713,0,174.641,0z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M174.641,226.304c-3.072,0-5.12,2.048-5.12,5.12v115.2c0,3.072,2.048,5.12,5.12,5.12c3.072,0,5.12-2.048,5.12-5.12v-115.2
				C179.761,228.352,177.713,226.304,174.641,226.304z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M162.353,130.048l-21.504-59.904c-1.024-2.56-4.096-4.096-6.656-3.072c-2.56,1.024-3.584,4.096-2.56,6.656l21.504,59.904
				c0.512,2.048,2.56,3.584,4.608,3.584c0.512,0,1.024,0,1.536-0.512C161.841,135.68,163.377,132.608,162.353,130.048z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M133.681,52.736l-7.68-18.432c-1.024-2.56-4.096-4.096-6.656-3.072s-4.096,4.096-3.072,6.656l7.68,18.944
				c1.024,2.048,2.56,3.072,4.608,3.072c0.512,0,1.024,0,2.048-0.512C133.169,58.368,134.705,55.296,133.681,52.736z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M217.137,286.72l-27.648-78.336c-1.024-2.56-4.096-4.096-6.656-3.072c-2.56,1.024-4.096,4.096-3.072,6.656l28.16,78.336
				c0.512,2.048,2.56,3.584,4.608,3.584c0.512,0,1.024,0,1.536-0.512C216.625,292.352,218.161,289.28,217.137,286.72z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M167.473,164.352L75.313,52.224c-2.048-2.048-5.12-2.56-7.168-0.512c-2.048,2.048-2.56,5.12-0.512,7.168l92.16,111.616
				c1.024,1.024,2.56,2.048,4.096,2.048c1.024,0,2.048-0.512,3.072-1.024C169.009,169.472,169.521,166.4,167.473,164.352z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M281.648,308.224l-71.68-88.064c-2.048-2.048-5.12-2.56-7.168-0.512c-2.048,2.048-2.56,5.12-0.512,7.168l71.68,87.552
				c1.024,1.024,2.56,2.048,4.096,2.048c1.024,0,2.048-0.512,3.072-1.024C283.185,313.344,283.697,310.272,281.648,308.224z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M130.097,147.456L59.441,104.96c-2.56-1.536-5.632-0.512-7.168,1.536c-1.536,3.072-1.024,6.144,1.536,7.68l70.656,42.496
				c1.024,0.512,1.536,0.512,2.56,0.512c1.536,0,3.584-1.024,4.608-2.56C133.169,152.064,132.145,148.992,130.097,147.456z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M301.105,251.904l-115.2-68.608c-2.56-1.536-5.632-0.512-7.168,1.536c-1.536,2.56-0.512,5.632,1.536,7.168l114.688,68.608
				c1.024,0.512,1.536,0.512,2.56,0.512c1.536,0,3.584-1.024,4.608-2.56C304.176,256.512,303.665,253.44,301.105,251.904z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M128.561,166.4L14.385,143.872c-2.56-0.512-5.632,1.024-6.144,4.096c-0.512,3.072,1.024,5.632,4.096,6.144l114.176,22.528
				c0.512,0,0.512,0,1.024,0c2.56,0,4.608-1.536,5.12-4.096C133.169,169.984,131.633,166.912,128.561,166.4z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M326.192,206.848l-99.328-19.456c-3.072-0.512-5.632,1.024-6.144,4.096c-0.512,2.56,1.024,5.632,4.096,6.144
				l99.328,19.456c0.512,0,0.512,0,1.024,0c2.56,0,4.608-1.536,5.12-4.096C330.801,210.432,329.264,207.36,326.192,206.848z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M274.993,160.768l-69.632,10.24c-2.56,0.512-4.608,3.072-4.096,5.632c0.512,2.56,2.56,4.608,5.12,4.608h0.512
				l69.632-10.24c2.56-1.024,4.096-3.584,4.096-6.144C280.113,162.304,277.553,160.256,274.993,160.768z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M154.161,183.808c-0.512-2.56-3.072-4.608-5.632-4.096l-81.92,11.776c-2.56,0.512-4.608,3.072-4.096,5.632
				c0.512,2.56,2.56,4.608,5.12,4.608h0.512l81.92-12.288C152.625,188.928,154.673,186.368,154.161,183.808z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M306.225,161.28c-0.512-2.56-3.072-4.608-5.632-4.096l-6.144,1.024c-2.56,0.512-4.608,3.072-4.096,5.632
				c0.512,2.56,2.56,4.608,5.12,4.608c0-0.512,0-0.512,0.512-0.512l6.144-1.024C304.689,166.4,306.736,163.84,306.225,161.28z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M54.833,198.656c-0.512-2.56-3.072-4.608-5.632-4.096l-6.144,0.512c-2.56,0.512-4.608,3.072-4.096,5.632
				c0.512,2.56,2.56,4.608,5.12,4.608h0.512l6.144-1.024C53.297,203.776,55.345,201.216,54.833,198.656z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M322.609,100.864c-1.536-2.56-4.608-3.584-7.168-2.048l-95.744,51.712c-2.56,1.536-3.584,4.608-2.048,7.168
				c1.024,1.536,2.56,2.56,4.608,2.56c1.024,0,1.536,0,2.56-0.512l95.744-51.712C323.121,106.496,324.145,103.424,322.609,100.864z"
				/>
		</g>
	</g>
	<g>
		<g>
			<path d="M136.753,202.24c-1.536-2.56-4.608-3.584-7.168-2.048L33.84,251.904c-2.56,1.536-3.584,4.608-2.048,7.168
				c1.024,1.536,2.56,2.56,4.608,2.56c1.024,0,1.536,0,2.56-0.512l95.744-51.712C137.265,207.872,138.289,204.8,136.753,202.24z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M272.433,72.192c-2.048-2.048-5.12-1.536-7.168,0.512l-83.456,92.672c-2.048,2.048-1.536,5.12,0.512,7.168
				c1.024,0.512,2.048,1.024,3.584,1.024s2.56-0.512,3.584-1.536l83.456-92.672C274.993,77.312,274.48,74.24,272.433,72.192z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M170.545,185.344c-2.048-2.048-5.12-1.536-7.168,0.512l-83.968,92.16c-2.048,2.048-1.536,5.12,0.512,7.168
				c1.024,1.024,2.048,1.536,3.584,1.536c1.536,0,2.56-0.512,3.584-1.536l83.456-92.672
				C172.593,190.464,172.593,187.392,170.545,185.344z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M76.337,290.816c-2.048-2.56-5.12-2.048-7.168,0l-9.216,10.24c-2.048,2.048-1.536,5.12,0.512,7.168
				c1.024,1.024,2.048,1.536,3.584,1.536c1.536,0,2.56-0.512,3.584-1.536l9.216-10.24C78.897,295.936,78.385,292.864,76.337,290.816z
				"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M295.473,46.592c-2.048-2.048-5.12-1.536-7.168,0.512l-9.216,9.728c-2.048,2.048-1.536,5.12,0.512,7.168
				c1.024,1.024,2.048,1.536,3.584,1.536s2.56-0.512,3.584-1.536l9.216-10.24C298.033,51.712,297.52,48.64,295.473,46.592z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M238.641,25.6c-2.56-1.024-5.632,0-6.656,2.56l-34.304,83.968c-1.536,3.072,0,5.632,2.56,6.656
				c0.512,0.512,1.536,0.512,2.048,0.512c2.048,0,4.096-1.024,4.608-3.072l34.304-83.968C242.225,29.696,241.201,26.624,238.641,25.6
				z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M165.425,210.432c-2.56-1.024-5.632,0-6.656,2.56l-41.984,101.376c-1.024,2.56,0,5.632,2.56,6.656
				c0.512,0.512,1.536,0.512,2.048,0.512c2.048,0,4.096-1.024,4.608-3.072l41.984-101.376
				C169.521,214.528,167.985,211.968,165.425,210.432z"/>
		</g>
	</g>
	<g>
	</g>
	<g>
	</g>
	<g>
	</g>
	<g>
	</g>
	<g>
	</g>
	<g>
	</g>
	<g>
	</g>
	<g>
	</g>
	<g>
	</g>
	<g>
	</g>
	<g>
	</g>
	<g>
	</g>
	<g>
	</g>
	<g>
	</g>
	<g>
	</g>
	`];
