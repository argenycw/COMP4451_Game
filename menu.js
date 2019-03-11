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
var currentStage = 1;
// ==================================================================

function mainMenu() {
	var dialog = widget.showDialog("25%", "10%", "50%", "80%", ["brown-dialog"], "mainMenu");

	var storyModeCallback = function() {
		widget.remove(dialog);
		stageSelection();
	}

	var title = widget.createSimpleText("Change Me", "50%", "20%", ["cubic", "brown-rect-text"], "5vw");
	var startSingleBtn = widget.createRectButton("Story Mode", "10%", "40%", "80%", "15%", ["brown-rect-btn", "cubic"], storyModeCallback);
	var startMultiBtn = widget.createRectButton("Multiplayer", "10%", "60%", "80%", "15%", ["brown-rect-btn", "cubic"]);
	var creditBtn = widget.createRectButton("Credit", "10%", "80%", "80%", "15%", ["brown-rect-btn", "cubic"]);
	dialog.appendChild(title);
	dialog.appendChild(startSingleBtn);
	dialog.appendChild(startMultiBtn);
	dialog.appendChild(creditBtn);
}


function stageSelection() {
	var dialog = widget.showDialog("25%", "10%", "50%", "80%", ["brown-dialog"], "stageSelection");
	var title = widget.createSimpleText("Stages", "50%", "20%", ["cubic", "brown-rect-text"], "5vw");
	var backBtn = widget.createRectButton("Back", "80%", "85%", "15%", "8%", ["cubic", "brown-rect-btn"]);
	for (var i = 0; i < currentStage; i++) {
		var row = parseInt(i / gridPerRow);
		var col = i % gridPerRow;
		var xSep = parseInt(80 / gridPerRow - 10);
		var playStageI = function() {
			widget.remove(dialog);
			start();
		}
		var grid = widget.createRectButton((i+1).toString(), (10+xSep+col*(10+xSep))+"%", (30+row*(10+xSep))+"%", 
							"10%", "10%", ["brown-rect-btn", "cubic"], playStageI);
		dialog.appendChild(grid);
	}
	dialog.appendChild(backBtn);
	dialog.appendChild(title);
}
