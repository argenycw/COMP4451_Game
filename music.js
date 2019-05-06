// #================================================================#
// #                            MUSIC.JS                            #
// #----------------------------------------------------------------#
// # This module handles the loading and playing of music,          #
// # as well as the note file which displays the note sequence      #
// #================================================================#
//
// # Dependencies:
//
// - musicbar.js
// -- screenTravelingTime
//
// - stage.js
// -- audioSource
//
// # Constants
const noteFolder = 'music/';

// # Variables
var nextNoteTimeout = null;

var song = null;
var barPeriod = 0;				// the time period in a single bar (bar length can vary, but total period is constant)
var waitPeriod = 0;				// the time period to wait after the song begins (in ms)
var songInterval = null;

var songStarted = false;
var canCheckNextNote = false;

var notesContent = []			// Store the timing of jumping of the full song (2D array)
var currentRow = 0;				// Current row reading in notesContent
var currentCol = 0;				// Current column reading in notesContent

var titleCanvas = null;
var titleName = null;
var titleSource = null;
var titleImageFile = null;
var titleImageWidth = 0;
var titleImageHeight = 0

function notesOnSuccessLoad(content) {
	readNotes(content);
	currentRow = 0;
	currentCol = 0;
	titleName = content.name;
	titleSource = content.source;
	titleImageFile = content.image;
	titleImageWidth = parseInt(content.imageWidth);
	titleImageHeight = parseInt(content.imageHeight);
}

// To load the song, and save the notes required to hit globally
function readNotes(content) {
	screenTravelingTime = content.timeTravel;
	barPeriod = content.period;
	waitPeriod = content.wait;
	notesContent = content.content;
}

// check if the next note exists, if yes => push
function checkNextNote() {
	if (!canCheckNextNote) return;
	// Reach the last note
	if (currentRow >= notesContent.length) {
		// The music bar is clean, then finish
		if (notesList.length == 0 && !paused) {
			if (multiplaying) stageFailMulti();
			else stageFail();
		}
		return;
	}
	let noteTiming = (barPeriod * currentRow + barPeriod * currentCol / notesContent[currentRow].length) / 1000;
	if (resourceLoader.song.currentTime < noteTiming) return;
	// Continue to check next note
	if (notesContent[currentRow][currentCol] == '1') {
		//var speed1s = (initX - trimPercentage(finalX)) / c_FPS; // exactly the distance moved for 1 second
		//var speed = speed1s / screenTravelingTime;
		pushJumpNote('normal', noteTheme.normal, resourceLoader.song.currentTime);
	} else if (notesContent[currentRow][currentCol] == '2') {
		pushJumpNote('double', noteTheme.double, resourceLoader.song.currentTime);
	} else if (notesContent[currentRow][currentCol] == '3') {
		pushJumpNote('reverse', noteTheme.reverse, resourceLoader.song.currentTime);
	}
	currentCol++;
	// Go to next row if reaches the end in the current row
	if (currentCol >= notesContent[currentRow].length) {
		currentRow++;
		currentCol = 0;
	}
}

function stageBegin() {
	console.log("Stage readys.");
	// create title canvas and show it on screen
	// console.log(titleImageWidth);
	// console.log(titleImageHeight);
	if (multiplaying) {
		widget.blinkSimpleText(stageBeginMsg, "50%", "50%", ["cubic", "black-4-white"], 100, () => {
			startSong();
			setTimeout(() => {canCheckNextNote = true;}, waitPeriod);
		});
	}
	else {
		titleCanvas = new TitleCanvas(titleImageWidth, titleImageHeight, titleName, titleSource, titleImageFile, () => {
			// Countdown and start checking notes
			widget.blinkSimpleText(stageBeginMsg, "50%", "50%", ["cubic", "black-4-white"], 100, () => {
				startSong();
				setTimeout(() => {canCheckNextNote = true;}, waitPeriod);
			});
		});
	}
	// play the environment sound
	if (resourceLoader.environment) resourceLoader.environment.start("sound");
}

function stageEnd() {
	console.log("Stage finishes.");
	if (resourceLoader.environment) resourceLoader.environment.stop();
	resourceLoader.song.volume = 1.0;
	if (widget.screen.contains(explosion)) widget.screen.removeChild(explosion);
	pauseSong();
	songStarted = false;
	canCheckNextNote = false;
	return;
}

function startSong() {
	noteTime = 0;
	resourceLoader.song.play();
}

function resumeSong() {
	resourceLoader.song.play();
	// resume the environment sound as well
	if (resourceLoader.environment) resourceLoader.environment.start("sound");
}

function pauseSong() {
	if (!resourceLoader.song) return;
	resourceLoader.song.pause();
	// pause the environment sound as well
	if (resourceLoader.environment) resourceLoader.environment.stop();	
}
