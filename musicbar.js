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
	let scale = theme.scale;
	let color = theme.color;
	let radius = theme.radius;
	let top = theme.top;
	fadeTime = theme.fade ? theme.fade : fadeTime;

	explosion = document.createElementNS(svgns, "svg");
	var g = document.createElementNS(svgns, "g");
	g.innerHTML = svg_explosion[0];
	explosion.appendChild(g);

	explosion.setAttribute("y", top);
	explosion.setAttribute("fill", color);
	explosion.setAttribute("stroke", color);
	explosion.setAttribute("opacity", 0);

	explosion.flash = function() {
		// Recalculate the size according to the screen width/height before each flash
		let vh = parseFloat(scale.replace(/[a-zA-Z]/, ""));
		g.setAttribute("vh", vh);
		let scaleFactor = window.innerHeight * vh / 100 / 50;
		g.setAttribute("transform", "scale(" + scaleFactor + ")");

		// Move to the note pos
		let posX = parseFloat(notesList[0].getAttribute("x").replace(/%/, ""));
		explosion.setAttribute("x", posX - radius*scaleFactor/window.innerWidth*100 + "%");

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
	// append the linear gradient data into the defs in advance
	for (let i = 0; i < svg_defs.length; i++) {
		defs.innerHTML += svg_defs[i];
	}
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
	for (let i = 0; i < svg_firework.length; i++) {
		var innerG = document.createElementNS(svgns, "g");
		innerG.innerHTML = svg_firework[i];
		if (i > 0) innerG.style.display = "none";
		else innerG.style.display = "block";
		g.appendChild(innerG);
	}
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
		if (frame > c_FPS / 2 / svg_firework.length) {
			for (let j = 0; j < g.childNodes.length; j++) {
				let anim = g.childNodes[j];
				if (anim.style.display != "none") {
					anim.style.display = "none";
					g.childNodes[(j+1) % g.childNodes.length].style.display = "block";
					break;
				}
			}
			g.setAttribute("frame", 0);
		}
		else {
			g.setAttribute("frame", frame + 1);
		}

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
var svg_defs = [`
<linearGradient id="linear-gradient" x1="98.37" y1="49.09" x2="300" y2="49.09" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#bde4f8"/><stop offset="0.04" stop-color="#9bd7f2"/><stop offset="0.09" stop-color="#77c8ed"/><stop offset="0.15" stop-color="#57bbe7"/><stop offset="0.21" stop-color="#3bb1e3"/><stop offset="0.28" stop-color="#25a8df"/><stop offset="0.36" stop-color="#14a1dc"/><stop offset="0.46" stop-color="#099cda"/><stop offset="0.6" stop-color="#029ad9"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient-2" x1="99.52" y1="36.82" x2="272.07" y2="36.82" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#cae9fa"/><stop offset="0.08" stop-color="#a3daf4"/><stop offset="0.19" stop-color="#78c9ed"/><stop offset="0.3" stop-color="#53bae7"/><stop offset="0.42" stop-color="#35aee2"/><stop offset="0.54" stop-color="#1ea5de"/><stop offset="0.67" stop-color="#0d9edb"/><stop offset="0.82" stop-color="#039ada"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient-3" x1="99.76" y1="66.83" x2="269.33" y2="66.83" xlink:href="#linear-gradient-2"/>
`,`
<linearGradient id="linear-gradient2" x1="99.83" y1="50" x2="299.84" y2="50" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#bde4f8"/><stop offset="0.04" stop-color="#9bd7f2"/><stop offset="0.09" stop-color="#77c8ed"/><stop offset="0.15" stop-color="#57bbe7"/><stop offset="0.21" stop-color="#3bb1e3"/><stop offset="0.28" stop-color="#25a8df"/><stop offset="0.36" stop-color="#14a1dc"/><stop offset="0.46" stop-color="#099cda"/><stop offset="0.6" stop-color="#029ad9"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient2-2" x1="101.74" y1="35.88" x2="249.36" y2="35.88" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#cae9fa"/><stop offset="0.08" stop-color="#a3daf4"/><stop offset="0.19" stop-color="#78c9ed"/><stop offset="0.3" stop-color="#53bae7"/><stop offset="0.42" stop-color="#35aee2"/><stop offset="0.54" stop-color="#1ea5de"/><stop offset="0.67" stop-color="#0d9edb"/><stop offset="0.82" stop-color="#039ada"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient2-3" x1="101.59" y1="59.73" x2="258.53" y2="59.73" xlink:href="#linear-gradient2-2"/>
`,`
<linearGradient id="linear-gradient3" x1="98.37" y1="49.09" x2="300" y2="49.09" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#bde4f8"/><stop offset="0.04" stop-color="#9bd7f2"/><stop offset="0.09" stop-color="#77c8ed"/><stop offset="0.15" stop-color="#57bbe7"/><stop offset="0.21" stop-color="#3bb1e3"/><stop offset="0.28" stop-color="#25a8df"/><stop offset="0.36" stop-color="#14a1dc"/><stop offset="0.46" stop-color="#099cda"/><stop offset="0.6" stop-color="#029ad9"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient3-2" x1="99.52" y1="36.82" x2="272.07" y2="36.82" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#cae9fa"/><stop offset="0.08" stop-color="#a3daf4"/><stop offset="0.19" stop-color="#78c9ed"/><stop offset="0.3" stop-color="#53bae7"/><stop offset="0.42" stop-color="#35aee2"/><stop offset="0.54" stop-color="#1ea5de"/><stop offset="0.67" stop-color="#0d9edb"/><stop offset="0.82" stop-color="#039ada"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient3-3" x1="99.76" y1="66.83" x2="269.33" y2="66.83" xlink:href="#linear-gradient3-2"/>
`,`
<linearGradient id="linear-gradient4" x1="100.83" y1="50.02" x2="300.03" y2="50.02" gradientTransform="matrix(1, 0, 0, -1, 0, 100)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#bde4f8"/><stop offset="0.04" stop-color="#9bd7f2"/><stop offset="0.09" stop-color="#77c8ed"/><stop offset="0.15" stop-color="#57bbe7"/><stop offset="0.21" stop-color="#3bb1e3"/><stop offset="0.28" stop-color="#25a8df"/><stop offset="0.36" stop-color="#14a1dc"/><stop offset="0.46" stop-color="#099cda"/><stop offset="0.6" stop-color="#029ad9"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient4-2" x1="102.74" y1="35.88" x2="250.36" y2="35.88" gradientTransform="matrix(1, 0, 0, -1, 0, 100)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#cae9fa"/><stop offset="0.08" stop-color="#a3daf4"/><stop offset="0.19" stop-color="#78c9ed"/><stop offset="0.3" stop-color="#53bae7"/><stop offset="0.42" stop-color="#35aee2"/><stop offset="0.54" stop-color="#1ea5de"/><stop offset="0.67" stop-color="#0d9edb"/><stop offset="0.82" stop-color="#039ada"/><stop offset="1" stop-color="#0099d9"/></linearGradient><linearGradient id="linear-gradient4-3" x1="102.59" y1="59.73" x2="259.53" y2="59.73" xlink:href="#linear-gradient4-2"/>
`]
var svg_firework = [`
<g id="Layer_2" data-name="Layer 2"><path d="M98.37,51a46.67,46.67,0,0,0,22.16,39.13c8.43,5.08,16.56,5.77,26.14,6.58,6.85.57,18.46,1.52,31.49-3.21,6-2.18,12.09-4.4,17.88-9,2.65-2.12,5.74-5.14,11.32-7.34,2.53-1,4.8-1.53,4.73-2-.09-.67-5-.67-9.32-.15-9.76,1.17-15.72,5-15.9,4.59-.5-1.12,11.7-10.81,25.38-12.39,2.06-.23,9.67-.93,18.26-1.31,2.5-.11,2.84-.1,4.06-.22,5.91-.57,8.53-1.94,15.83-3.36,1.19-.23,2.73-.53,4.67-.78,9.78-1.3,12.91.67,22.45-.14A62.6,62.6,0,0,0,286.24,60c7-1.61,14-4.43,13.76-5.2-.1-.37-1.76,0-5.05.15a67,67,0,0,1-17.39-1.49c-4.24-.85-6.36-1.27-9.06-2.48a46,46,0,0,0-6.11-2.6,37.3,37.3,0,0,0-5-1.13c-6-.89-13.21.14-15.48.37-10.64,1-22.58-5.11-28.75-12.45-2.75-3.26-3.11-4.87-8.06-11.29A67.46,67.46,0,0,0,196.81,15C188,7,182.14,4.61,180.09,3.83,176.19,2.35,170.78,1,161.82,1c-12.38,0-28.74.07-43.34,11.68C114.87,15.58,98.29,28.76,98.37,51Z" transform="translate(-97.87 -0.53)" style="stroke:#3586c8;stroke-miterlimit:10;fill:url(#linear-gradient)"/></g><g id="Layer_3" data-name="Layer 3"><path d="M101,54.57c-3.55-4.19.09-12.33,1.46-15.39,4-9,11.25-13.83,14.67-16a50.23,50.23,0,0,1,17.74-6.88c3.52-.66,18.51-3.48,29.81,3.06,2.45,1.41,6.82,4.48,12.68,7.94,1.18.7,2.69,1.57,4.69,3,3.08,2.18,4.13,3.45,9.38,6.36,15,8.28,27.43,10.19,27.21,11.16-.15.68-7.32-.83-18.19-1.84A165.91,165.91,0,0,0,179.69,45c-7.84.22-18.7.54-31,5-10.59,3.83-10.84,6.58-18.34,7.52-4.28.54-14.76,1-19.35,1-.08,0-.18,0-.31,0S103.74,57.76,101,54.57Z" transform="translate(-97.87 -0.53)" style="fill:url(#linear-gradient-2)"/><path d="M106.63,56.46h0a15.75,15.75,0,0,0,6.88,1.77c5,.07,32.32-7.86,42.79-10,7-1.45,13.77-1.32,27.36-1.07,16.66.31,26.58,2.25,32.87,3.82,8.51,2.12,13.44,4.33,13.3,4.89-.21.82-8.1-2.25-18.18.25-.38.09-1.44.44-3.34,1-4.1,1.22-7.07,2-7.37,2.11-6.3,1.75-21.45,12.17-31.8,17.74-6.91,3.71-15.62,8.29-27.52,9.47-12.36,1.23-19.5-2.08-22-3.4a33.07,33.07,0,0,1-5.81-3.91C102.73,69.81,98.05,52,100.33,50.79,101,50.44,102.64,51.39,106.63,56.46Z" transform="translate(-97.87 -0.53)" style="fill:url(#linear-gradient-3)"/></g>
`,`
<g id="Layer_2" data-name="Layer 2"><path d="M99.83,53.27c0,12,6.09,21.92,7.83,24.75A47,47,0,0,0,119.2,91a41.06,41.06,0,0,0,21.91,8c12.92.67,23.11-5.35,27.61-8,7.46-4.41,7.23-5.47,16.37-10.14,7-3.59,12.52-6.33,19.81-6.94,9.63-.8,15.66,2.69,16.06,1.43.46-1.43-6.6-7.69-15.44-8.72-11.38-1.33-19.77,6.72-20.27,5.69s6.44-8.38,16.32-10.32a26.86,26.86,0,0,1,8.89-.17c8.33,1,13.92,5.53,29,8.49,7.87,1.53,19.08,3.59,32.35,0,16.34-4.42,28.26-15.35,28-16-.16-.36-4.47,3-11.19,4.79-3,.82-13.29,3-28.5-3.2-11.07-4.49-4.51-2.06-24.31-16-7.1-5-15.93-15.26-32.42-25.95C189.92,5.24,171.28,1.35,160.82,1a59.86,59.86,0,0,0-42.5,17C112.2,23.9,99.77,35.91,99.83,53.27Z" transform="translate(-99.33 -0.51)" style="stroke:#3586c8;stroke-miterlimit:10;fill:url(#linear-gradient2)"/></g><g id="Layer_3" data-name="Layer 3"><path d="M102.48,54.72c-2.37-4.52,1.49-11.45,3.67-15.36a52.44,52.44,0,0,1,18.36-18.55A55.44,55.44,0,0,1,153,13.05c7.78,0,13.34,1.76,21.12,4.16,13.26,4.09,23.94,9.92,23.64,11S186.89,22.4,172.6,24.8C159.8,27,148,35.94,143.07,39.74c-2.55,1.95-1.84,1.61-6.15,5-16.83,13.3-21.9,14-24.83,14C110.19,58.69,104.52,58.64,102.48,54.72Z" transform="translate(-99.33 -0.51)" style="fill:url(#linear-gradient2-2)"/><path d="M108.08,56.62c1.88.72,2.55.61,6.88,1.76,3.44.91,3.49,1.1,4.66,1.34,0,0,8.44,1.75,19.44-7.5l2.33-1.93c.53-.44,1.2-1,2.18-1.75,5.39-4.22,9.62-7,10.14-7.38,4.26-2.82,23.41-12.93,46-6.58,6.7,1.88,14.89,4.18,21.86,11.76,2.95,3.22,3.87,5.4,7.61,8.32,8.44,6.58,17.31,6,17.22,6.64-.12.86-10.1,2.49-22-.79-5.47-1.51-7.45-3-11-4.15a32.32,32.32,0,0,0-4.21-1c-9-1.84-20.41,4.12-21.31,4.6-13.93,7.45-13.29,12.21-25.52,19.27-5.91,3.41-15.14,8.59-27.14,7.64-4.16-.32-12.23-1-19.93-7.57-11-9.37-14.84-25-13.33-26.17C102.54,52.58,103.75,55,108.08,56.62Z" transform="translate(-99.33 -0.51)" style="fill:url(#linear-gradient2-3)"/></g>
`,`
<g id="Layer_2" data-name="Layer 2"><path d="M98.37,51a46.67,46.67,0,0,0,22.16,39.13c8.43,5.08,16.56,5.77,26.14,6.58,6.85.57,18.46,1.52,31.49-3.21,6-2.18,12.09-4.4,17.88-9,2.65-2.12,5.74-5.14,11.32-7.34,2.53-1,4.8-1.53,4.73-2-.09-.67-5-.67-9.32-.15-9.76,1.17-15.72,5-15.9,4.59-.5-1.12,11.7-10.81,25.38-12.39,2.06-.23,9.67-.93,18.26-1.31,2.5-.11,2.84-.1,4.06-.22,5.91-.57,8.53-1.94,15.83-3.36,1.19-.23,2.73-.53,4.67-.78,9.78-1.3,12.91.67,22.45-.14A62.6,62.6,0,0,0,286.24,60c7-1.61,14-4.43,13.76-5.2-.1-.37-1.76,0-5.05.15a67,67,0,0,1-17.39-1.49c-4.24-.85-6.36-1.27-9.06-2.48a46,46,0,0,0-6.11-2.6,37.3,37.3,0,0,0-5-1.13c-6-.89-13.21.14-15.48.37-10.64,1-22.58-5.11-28.75-12.45-2.75-3.26-3.11-4.87-8.06-11.29A67.46,67.46,0,0,0,196.81,15C188,7,182.14,4.61,180.09,3.83,176.19,2.35,170.78,1,161.82,1c-12.38,0-28.74.07-43.34,11.68C114.87,15.58,98.29,28.76,98.37,51Z" transform="translate(-97.87 -0.53)" style="stroke:#3586c8;stroke-miterlimit:10;fill:url(#linear-gradient3)"/></g><g id="Layer_3" data-name="Layer 3"><path d="M101,54.57c-3.55-4.19.09-12.33,1.46-15.39,4-9,11.25-13.83,14.67-16a50.23,50.23,0,0,1,17.74-6.88c3.52-.66,18.51-3.48,29.81,3.06,2.45,1.41,6.82,4.48,12.68,7.94,1.18.7,2.69,1.57,4.69,3,3.08,2.18,4.13,3.45,9.38,6.36,15,8.28,27.43,10.19,27.21,11.16-.15.68-7.32-.83-18.19-1.84A165.91,165.91,0,0,0,179.69,45c-7.84.22-18.7.54-31,5-10.59,3.83-10.84,6.58-18.34,7.52-4.28.54-14.76,1-19.35,1-.08,0-.18,0-.31,0S103.74,57.76,101,54.57Z" transform="translate(-97.87 -0.53)" style="fill:url(#linear-gradient3-2)"/><path d="M106.63,56.46h0a15.75,15.75,0,0,0,6.88,1.77c5,.07,32.32-7.86,42.79-10,7-1.45,13.77-1.32,27.36-1.07,16.66.31,26.58,2.25,32.87,3.82,8.51,2.12,13.44,4.33,13.3,4.89-.21.82-8.1-2.25-18.18.25-.38.09-1.44.44-3.34,1-4.1,1.22-7.07,2-7.37,2.11-6.3,1.75-21.45,12.17-31.8,17.74-6.91,3.71-15.62,8.29-27.52,9.47-12.36,1.23-19.5-2.08-22-3.4a33.07,33.07,0,0,1-5.81-3.91C102.73,69.81,98.05,52,100.33,50.79,101,50.44,102.64,51.39,106.63,56.46Z" transform="translate(-97.87 -0.53)" style="fill:url(#linear-gradient3-3)"/></g>
`,`
<g id="Layer_2" data-name="Layer 2"><path d="M100.83,46.73c0-12,6.09-21.92,7.83-24.75A42.87,42.87,0,0,1,120.2,9a42.23,42.23,0,0,1,22.73-8c13.2-.6,22.71,5.4,26.79,8,1.93,1.26,2.32,1.7,5.57,4.2,13.34,10.29,20,15.43,28.66,18.6,10.93,4,23.77,3.69,30.91,2.52,7.79-1.28,8.91-3.05,17.16-3.86A66.32,66.32,0,0,1,276.83,33c13.06,3.86,23.81,11.42,23.17,12.88-.5,1.13-7.23-2.94-18.07-3.07-11.44-.13-20,3.89-28.66,8.28-22.49,11.43-22.66,21.37-42.93,28.66-6.3,2.27-14.67,4.33-14.45,5.58.17.94,4.94.4,13.33,1.79,3.45.58,10.43,1.74,10.42,3,0,1.81-15.67-.5-34,5A78.08,78.08,0,0,1,161.82,99s-1.22,0-2.37-.08c-7.32-.38-25.3-2.56-40.13-16.88C113.2,76.1,100.77,64.09,100.83,46.73Z" transform="translate(-100.33 -0.49)" style="stroke:#3586c8;stroke-miterlimit:10;fill:url(#linear-gradient4)"/></g><g id="Layer_3" data-name="Layer 3"><path d="M103.48,45.28c-2.37,4.52,1.49,11.45,3.67,15.36a52.44,52.44,0,0,0,18.36,18.55A55.44,55.44,0,0,0,154,87c7.78,0,13.34-1.76,21.12-4.16,13.26-4.09,23.94-9.92,23.64-11S187.89,77.6,173.6,75.2C160.8,73.05,149,64.06,144.07,60.26c-2.55-1.95-1.84-1.61-6.15-5-16.83-13.3-21.9-14-24.83-14C111.19,41.31,105.52,41.36,103.48,45.28Z" transform="translate(-100.33 -0.49)" style="fill:url(#linear-gradient4-2)"/><path d="M109.08,43.38c1.88-.72,2.55-.61,6.88-1.76,3.44-.91,3.49-1.1,4.66-1.34,0,0,8.44-1.75,19.44,7.5l2.33,1.93c.53.44,1.2,1,2.18,1.75,5.39,4.22,9.62,7,10.14,7.38,4.26,2.82,23.41,12.93,46,6.58,6.7-1.88,14.89-4.18,21.86-11.76,2.95-3.22,3.87-5.4,7.61-8.32,8.44-6.58,17.31-6,17.22-6.64-.12-.86-10.1-2.49-22,.79-5.47,1.51-7.45,3-11,4.15a32.32,32.32,0,0,1-4.21,1c-9,1.84-20.41-4.12-21.31-4.6-13.93-7.45-13.29-12.21-25.52-19.27-5.91-3.41-15.14-8.59-27.14-7.64-4.16.32-12.23,1-19.93,7.57-11,9.37-14.84,25-13.33,26.17C103.54,47.42,104.75,45.05,109.08,43.38Z" transform="translate(-100.33 -0.49)" style="fill:url(#linear-gradient4-3)"/></g>
`];

var svg_explosion = [`
<rect height="2" style="fill:#fdb62f" width="2" x="31" y="14"/><rect height="2" style="fill:#fdb62f" width="2" x="31" y="22"/><rect height="2" style="fill:#fdb62f" width="2" x="31" y="48"/><rect height="2" style="fill:#fdb62f" width="2" x="31" y="40"/><rect height="2" style="fill:#fdb62f" width="2" x="14" y="31"/><rect height="2" style="fill:#fdb62f" width="2" x="22" y="31"/><rect height="2" style="fill:#fdb62f" width="2" x="48" y="31"/><rect height="2" style="fill:#fdb62f" width="2" x="40" y="31"/><rect height="2" style="fill:#fdb62f" transform="translate(-8.276 19.979) rotate(-45)" width="2" x="18.98" y="18.98"/><rect height="2" style="fill:#fdb62f" transform="translate(-10.619 25.636) rotate(-45)" width="2" x="24.636" y="24.636"/><rect height="2" style="fill:#fdb62f" transform="translate(-18.234 44.021) rotate(-45)" width="2" x="43.021" y="43.021"/><rect height="2" style="fill:#fdb62f" transform="translate(-15.891 38.364) rotate(-45)" width="2" x="37.364" y="37.364"/><rect height="2" style="fill:#fdb62f" transform="translate(-25.275 27.021) rotate(-45)" width="2" x="18.98" y="43.021"/><rect height="2" style="fill:#fdb62f" transform="translate(-19.619 29.364) rotate(-45)" width="2" x="24.636" y="37.364"/><rect height="2" style="fill:#dd4a43" width="2" x="31" y="18"/><rect height="2" style="fill:#dd4a43" width="2" x="31" y="44"/><rect height="2" style="fill:#dd4a43" width="2" x="18" y="31"/><rect height="2" style="fill:#dd4a43" width="2" x="44" y="31"/><rect height="2" style="fill:#dd4a43" transform="translate(-9.447 22.808) rotate(-45)" width="2" x="21.808" y="21.808"/><rect height="2" style="fill:#dd4a43" transform="translate(-17.062 41.192) rotate(-45)" width="2" x="40.192" y="40.192"/><rect height="2" style="fill:#dd4a43" transform="translate(-22.447 28.192) rotate(-45)" width="2" x="21.808" y="40.192"/><rect height="2" style="fill:#dd4a43" transform="translate(-4.062 35.808) rotate(-45)" width="2" x="40.192" y="21.808"/><rect height="2" style="fill:#fdb62f" transform="translate(-1.234 36.979) rotate(-45)" width="2" x="43.021" y="18.98"/><rect height="5" style="fill:#fd6d2f" width="2" x="31" y="7"/><rect height="5" style="fill:#fd6d2f" width="2" x="31" y="52"/><rect height="2" style="fill:#fd6d2f" width="5" x="7" y="31"/><rect height="2" style="fill:#fd6d2f" width="5" x="52" y="31"/><rect height="4.999" style="fill:#fd6d2f" transform="translate(-6.665 16.09) rotate(-45)" width="2" x="15.09" y="13.59"/><rect height="4.999" style="fill:#fd6d2f" transform="translate(-19.845 47.91) rotate(-45)" width="2" x="46.91" y="45.41"/><rect height="2" style="fill:#fd6d2f" transform="translate(-29.165 25.41) rotate(-45)" width="4.999" x="13.59" y="46.91"/><rect height="2" style="fill:#fd6d2f" transform="translate(2.655 38.59) rotate(-45)" width="4.999" x="45.41" y="15.09"/><rect height="2" style="fill:#fdb62f" transform="translate(-6.891 34.636) rotate(-45)" width="2" x="37.364" y="24.636"/><rect height="2" style="fill:#fdb62f" transform="translate(-12.632 10.469) rotate(-22.508)" width="2" x="18.989" y="35.975"/><path d="M13.522,39.652a2,2,0,1,0-1.082,2.615A2,2,0,0,0,13.522,39.652Z" style="fill:#fd6d2f"/><rect height="2" style="fill:#fdb62f" transform="translate(-6.993 18.906) rotate(-22.508)" width="2" x="43.011" y="26.025"/><path d="M50.478,24.348a2,2,0,0,0,2.613,1.081,2,2,0,1,0-2.613-1.081Z" style="fill:#fd6d2f"/><rect height="2" style="fill:#fdb62f" transform="translate(-5.594 11.868) rotate(-22.508)" width="2" x="26.025" y="18.989"/><path d="M23.584,13.674a2,2,0,1,0-1.851-1.234A2,2,0,0,0,23.584,13.674Z" style="fill:#fd6d2f"/><rect height="2" style="fill:#fdb62f" transform="translate(-14.031 17.507) rotate(-22.508)" width="2" x="35.975" y="43.011"/><path d="M39.652,50.478a2,2,0,1,0,2.615,2.613,1.983,1.983,0,0,0,0-1.531A2.006,2.006,0,0,0,39.652,50.478Z" style="fill:#fd6d2f"/><rect height="2" style="fill:#fdb62f" transform="translate(-23.979 52.13) rotate(-67.492)" width="2" x="26.025" y="43.011"/><path d="M24.346,50.478a2,2,0,0,0-2.613,1.082,2,2,0,0,0,1.082,2.613,2,2,0,0,0,1.533,0,1.981,1.981,0,0,0,1.081-1.082A2,2,0,0,0,24.346,50.478Z" style="fill:#fdb62f"/><rect height="2" style="fill:#fdb62f" transform="translate(4.354 46.495) rotate(-67.492)" width="2" x="35.975" y="18.989"/><path d="M39.654,13.522a1.975,1.975,0,0,0,.762.153,2.005,2.005,0,0,0,1.851-1.235,2,2,0,1,0-3.7-1.531A2,2,0,0,0,39.654,13.522Z" style="fill:#fdb62f"/><rect height="2" style="fill:#fdb62f" transform="translate(-12.63 35.146) rotate(-67.492)" width="2" x="18.989" y="26.025"/><path d="M10.909,25.429a2,2,0,1,0-1.082-1.081A1.992,1.992,0,0,0,10.909,25.429Z" style="fill:#fdb62f"/><rect height="2" style="fill:#fdb62f" transform="translate(-6.995 63.479) rotate(-67.492)" width="2" x="43.011" y="35.975"/><rect height="2" style="fill:#fd6d2f" transform="translate(-11.764 11.767) rotate(-22.508)" width="2.001" x="22.685" y="34.444"/><rect height="2" style="fill:#fd6d2f" transform="translate(-7.861 17.608) rotate(-22.508)" width="2.001" x="39.314" y="27.556"/><rect height="2.001" style="fill:#fd6d2f" transform="translate(-6.892 12.736) rotate(-22.508)" width="2" x="27.556" y="22.685"/><rect height="2.001" style="fill:#fd6d2f" transform="translate(-12.733 16.639) rotate(-22.508)" width="2" x="34.444" y="39.314"/><rect height="2" style="fill:#fd6d2f" transform="translate(-19.62 51.262) rotate(-67.492)" width="2.001" x="27.555" y="39.315"/><rect height="2" style="fill:#fd6d2f" transform="translate(-0.005 47.363) rotate(-67.492)" width="2.001" x="34.444" y="22.685"/><rect height="2.001" style="fill:#fd6d2f" transform="translate(-11.762 39.505) rotate(-67.492)" width="2" x="22.685" y="27.555"/><rect height="2.001" style="fill:#fd6d2f" transform="translate(-7.858 59.129) rotate(-67.503)" width="2" x="39.315" y="34.444"/><path d="M53.091,38.571a2,2,0,1,0,1.082,1.081A1.981,1.981,0,0,0,53.091,38.571Z" style="fill:#fdb62f"/><rect height="2" style="fill:#fd6d2f" transform="translate(-13.499 9.171) rotate(-22.508)" width="2" x="15.294" y="37.506"/><rect height="2" style="fill:#fd6d2f" transform="translate(-6.126 20.204) rotate(-22.508)" width="2" x="46.706" y="24.494"/><rect height="2" style="fill:#fd6d2f" transform="translate(-4.296 11.001) rotate(-22.508)" width="2" x="24.494" y="15.294"/><rect height="2" style="fill:#fd6d2f" transform="translate(-15.329 18.374) rotate(-22.508)" width="2" x="37.506" y="46.706"/><rect height="2" style="fill:#fd6d2f" transform="translate(-28.337 52.996) rotate(-67.492)" width="2" x="24.494" y="46.706"/><rect height="2" style="fill:#fd6d2f" transform="translate(8.713 45.629) rotate(-67.492)" width="2" x="37.506" y="15.294"/><rect height="2" style="fill:#fd6d2f" transform="translate(-13.496 30.787) rotate(-67.492)" width="2" x="15.294" y="24.494"/><rect height="2" style="fill:#fd6d2f" transform="translate(-6.129 67.837) rotate(-67.492)" width="2" x="46.706" y="37.506"/><path d="M33.285,34.7l2.25,2.25,1.414-1.414-2.25-2.25A2.746,2.746,0,0,0,34.816,33H38V31H34.816a2.746,2.746,0,0,0-.117-.285l2.25-2.25-1.414-1.414-2.25,2.25A2.746,2.746,0,0,0,33,29.184V26H31v3.184a2.746,2.746,0,0,0-.285.117l-2.25-2.25-1.414,1.414,2.25,2.25a2.746,2.746,0,0,0-.117.285H26v2h3.184a2.746,2.746,0,0,0,.117.285l-2.25,2.25,1.414,1.414,2.25-2.25a2.746,2.746,0,0,0,.285.117V38h2V34.816A2.746,2.746,0,0,0,33.285,34.7ZM33,32a1,1,0,1,1-1-1A1,1,0,0,1,33,32Z" style="fill:#fd6d2f"/><path d="M32,2a3,3,0,1,0,3,3A3,3,0,0,0,32,2Zm0,4a1,1,0,1,1,1-1A1,1,0,0,1,32,6Z" style="fill:#dd4a43"/><path d="M32,56a3,3,0,1,0,3,3A3,3,0,0,0,32,56Zm0,4a1,1,0,1,1,1-1A1,1,0,0,1,32,60Z" style="fill:#dd4a43"/><path d="M5,29a3,3,0,1,0,3,3A3,3,0,0,0,5,29Zm0,4a1,1,0,1,1,1-1A1,1,0,0,1,5,33Z" style="fill:#dd4a43"/><path d="M59,29a3,3,0,1,0,3,3A3,3,0,0,0,59,29Zm0,4a1,1,0,1,1,1-1A1,1,0,0,1,59,33Z" style="fill:#dd4a43"/><path d="M10.787,10.787a3,3,0,1,0,4.242,0A3,3,0,0,0,10.787,10.787Zm2.828,2.828a1,1,0,1,1,0-1.414A1,1,0,0,1,13.615,13.615Z" style="fill:#dd4a43"/><path d="M48.971,48.971a3,3,0,1,0,4.242,0A3,3,0,0,0,48.971,48.971ZM51.8,51.8a1,1,0,1,1,0-1.414A1,1,0,0,1,51.8,51.8Z" style="fill:#dd4a43"/><path d="M10.787,48.971a3,3,0,1,0,4.242,0A3,3,0,0,0,10.787,48.971ZM13.615,51.8a1,1,0,1,1,0-1.414A1,1,0,0,1,13.615,51.8Z" style="fill:#dd4a43"/><path d="M48.971,10.787a3,3,0,1,0,4.242,0A3,3,0,0,0,48.971,10.787ZM51.8,13.615a1,1,0,1,1,0-1.414A1,1,0,0,1,51.8,13.615Z" style="fill:#dd4a43"/>
`];

