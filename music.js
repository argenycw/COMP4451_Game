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

var notesContent = []			// Store the timing of jumping of the full song (2D array)
var currentRow = 0;				// Current row reading in notesContent
var currentCol = 0;				// Current column reading in notesContent

function notesOnSuccessLoad(content) {
	readNotes(content);
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
	var start = new Date().getTime();
	var next = 100;
	// Reach the last note
	if (currentRow >= notesContent.length) {
		// The music bar is clean, then finish
		if (notesList.length == 0) {
			stageEnd();
			return;
		}
	}
	// Continue to check next note
	else {
		if (notesContent[currentRow][currentCol] == '1') {
			var speed1s = (initX - trimPercentage(finalX)) / c_FPS; // exactly the distance moved for 1 second
			var speed = speed1s / screenTravelingTime;
			pushJumpNote(noteTheme, speed);
		}
		currentCol++;
		// Calculate the time to check next note
		next = barPeriod / notesContent[currentRow].length;
		// Go to next row if reaches the end in the current row
		if (currentCol >= notesContent[currentRow].length) {
			currentRow++;
			currentCol = 0;
		}
	}
	var passed = new Date().getTime() - start;
	nextNoteTimeout = setTimeout(checkNextNote, next - passed);
}


function stageBegin() {
	console.log("Stage readys.");
	// Countdown
	var waitBlinking = widget.blinkSimpleText(stageBeginMsg, "50%", "50%", ["cubic", "black-4-white"], 100);
	setTimeout(startSong, waitPeriod + waitBlinking);
	setTimeout(checkNextNote, waitBlinking);
}

function stageEnd() {
	console.log("Stage finishes.");
	pauseSong();
	return;
}


function startSong() {
	resourceLoader.song.play();
}

function pauseSong() {
	if (!resourceLoader.song) return;
	resourceLoader.song.pause();
}
