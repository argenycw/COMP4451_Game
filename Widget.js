// #================================================================#
// #                           WIDGET.JS                            #
// #----------------------------------------------------------------#
// # This module handles any display of widgets on the screen using #
// # SVG, which includes: button, text, description etc             #
// #                                                                #
// # If you are looking for modification of music bar,              #
// # see musicbar.js.                                               #
// #================================================================#
const svgns = "http://www.w3.org/2000/svg";

// Constructor
function Widget(x=0, y=0, width="100%", height="100%") {
	var myself = this;

	this.screen = document.createElementNS(svgns, "svg");
	this.defs = document.createElementNS(svgns, "defs");
	this.screen.setAttribute("x", x);
	this.screen.setAttribute("y", y);
	this.screen.setAttribute("width", width);
	this.screen.setAttribute("height", height);
	this.screen.appendChild(this.defs);
	document.body.appendChild(this.screen);
	this.widgets = {}; // a dictionary indicating all objects inside the svg screen
	this.loading = null;

	this.showDialog = function(x, y, width, height, classList=[], id="w-"+Object.keys(myself.widgets).length) {
		var dialog = document.createElementNS(svgns, "svg");
		var rect = document.createElementNS(svgns, "rect");
		dialog.setAttribute("x", x);
		dialog.setAttribute("y", y);
		dialog.setAttribute("width", width);
		dialog.setAttribute("height", height);
		rect.setAttribute("x", 0);
		rect.setAttribute("y", 0);
		rect.setAttribute("width", "100%");
		rect.setAttribute("height", "100%");

		rect.classList.add("unselectable");
		for (var i = 0; i < classList.length; i++) {
			rect.classList.add(classList[i]);
		}
		dialog.appendChild(rect);
		// append the text into the widget dictionary
		myself.widgets[id] = dialog;
		myself.screen.appendChild(dialog);
		return dialog;
	}

	// Return a rectangular button with a text embedded in the middle
	this.createRectButton = function(textContent, x, y, width, height, classListBtn=[], onclick=function(){}, 
			arg=null, id="w-"+Object.keys(myself.widgets).length) {
		var group = document.createElementNS(svgns, "svg");
		group.setAttribute("x", x);
		group.setAttribute("y", y);
		group.setAttribute("width", width);
		group.setAttribute("height", height);

		// Create button
		var btn = document.createElementNS(svgns, "rect");
		btn.setAttribute("x", 0);
		btn.setAttribute("y", 0);
		btn.setAttribute("width", "100%");
		btn.setAttribute("height", "100%");

		var playSound = true;
		for (var i = 0; i < classListBtn.length; i++) {
			group.classList.add(classListBtn[i]);
			// Set the flag as disabled
			if (classListBtn[i] == "btn-disabled") group.disabled = true;
		}
		// The function depends on whether there is argument passed
		if (arg === null) group.addEventListener("click", onclick);
		else group.addEventListener("click", function() {onclick(arg)});
		// Create text at the center of the button
		var text = document.createElementNS(svgns, "text");
		text.setAttribute("x", "50%");
		text.setAttribute("y", "50%");
		text.classList.add("unselectable");
		text.style.textAnchor = "middle";
		text.style.alignmentBaseline = "middle";
		text.appendChild(document.createTextNode(textContent));
		// "Click" sound of the button
		group.addEventListener("mouseenter", playChoiceSound);
		// Append the elements into the group
		group.appendChild(btn);
		group.appendChild(text);
		myself.widgets[id] = group;
		return group;
	}

	// Return a rectangular button with a text embedded in the middle that is already on the screen
	this.showRectButton = function(textContent, x, y, width, height, classListBtn=[], onclick=function(){},
									arg=null, id="w-"+Object.keys(myself.widgets).length) {
		// Create a rect button
		var group = myself.createRectButton(textContent, x, y, width, height, classListBtn, onclick);
		// append the text into the widget dictionary		
		myself.screen.appendChild(group);
		return group;
	}

	// Return an svg texts
	this.createSimpleText = function(content, x, y, classList=[], size=0, id="w-"+Object.keys(myself.widgets).length) {
		var text = document.createElementNS(svgns, "text");
		text.setAttribute("x", x);
		text.setAttribute("y", y);
		text.classList.add("unselectable");
		for (var i = 0; i < classList.length; i++) {
			text.classList.add(classList[i]);
		}
		if (size != 0) text.style.fontSize = size;
		text.appendChild(document.createTextNode(content));
		myself.widgets[id] = text;
		return text;
	}

	// Return an svg text that is already on the screen
	this.showSimpleText = function(content, x, y, classList=[], size=0, id="w-"+Object.keys(myself.widgets).length) {
		var text = myself.createSimpleText(content, x, y, classList, size, id);
		// append the text into the widget dictionary
		myself.screen.appendChild(text);
		return text;
	}

	// Blink the text. Content should be an array of text to blink
	this.blinkSimpleText = function(content, x, y, classList=[], size=0, time=1000) {
		for (var i = 0; i < content.length; i++) {
			let textContent = content[i];
			var id = "w_" + i;
			setTimeout(function() {myself.showSimpleText(textContent, x, y, classList, size, id);}, time * (i+1));
			setTimeout(function() {myself.remove(id);}, time * (i+2));
		}
		// return the time needed to wait for
		return (content.length + 1) * time;
	}

	this.createForeignInputField = function(x, y, width, height, classList=[], id="w-"+Object.keys(myself.widgets).length) {
		var obj = document.createElementNS(svgns, "foreignObject");
		obj.setAttribute("x", x);
		obj.setAttribute("y", y);
		obj.setAttribute("width", width);
		obj.setAttribute("height", height);
		var input = document.createElement("input");
		input.setAttribute("type", "text");
		input.setAttribute("maxlength", "20");
		for (var i = 0; i < classList.length; i++) {
			input.classList.add(classList[i]);
		}
		obj.appendChild(input);
		return obj;
	}

	this.showDefinedSVG = function(x, y, href, classList=[], onclick=null, id="w-"+Object.keys(myself.widgets).length) {
		var use = myself.createDefinedSVG(x, y, href, classList, onclick, id);
		// append the svg into the widget dictionary
		myself.widgets[id] = use;
		myself.screen.appendChild(use);
		return use;
	}

	this.createDefinedSVG = function(x, y, href, classList=[], onclick=null, id="w-"+Object.keys(myself.widgets).length) {
		var use = document.createElementNS(svgns, "use");
		use.setAttribute("x", x);
		use.setAttribute("y", y);
		use.setAttribute("href", href);
		if (onclick) use.addEventListener("click", onclick);
		for (var i = 0; i < classList.length; i++) {
			use.classList.add(classList[i]);
		}
		// append the svg into the widget dictionary
		return use;
	}

	this.showLoadingScreen = function() {
		var dialog = widget.showDialog("0%", "0%", "100%", "100%", ["black-full"], "loading-screen");
		var loadingMsg = widget.createSimpleText("Loading...", "50%", "50%", ["cubic", "white-fill"], "3vw");
		dialog.appendChild(loadingMsg);
		myself.loading = dialog;
		return dialog;
	}

	this.clearLoadingScreen = function() {
		myself.remove(myself.loading);
		myself.loading = null;
	}

	this.fadeScreenWhite = function(fadeLevel, fadeTime) {
		var fade = document.createElementNS(svgns, "rect");
		fade.setAttribute("x", 0);
		fade.setAttribute("y", 0);
		fade.setAttribute("width", "100%");
		fade.setAttribute("height", "100%");
		fade.style.fill = "white";
		fade.style.fillOpacity = 0.0;
		fade.fadeWhite = function() {
			var opacity = parseFloat(fade.style.fillOpacity);
			opacity += 0.05;
			fade.style.fillOpacity = opacity;
			if (opacity < fadeLevel)
				setTimeout(fade.fadeWhite, fadeTime / c_FPS);
		};
		setTimeout(fade.fadeWhite, fadeTime / c_FPS);
		myself.screen.appendChild(fade);
		myself.widgets["fade"] = fade;
	}


	this.getWidget = function(id) {
		return myself.widgets[id];
	}

	this.remove = function(id) {
		if (!id) return;
		// Passing in an object to remove
		if (typeof id == "object") {
			id.parentNode.removeChild(id);
			for (var key in myself.widgets) {
				if (myself.widgets[key] == id) {
					delete myself.widgets[key];
					break;
				}
			}
		}
		// Passing in an id to remove
		else {
			var target = myself.widgets[id];
			if (!target) return;
			target.parentNode.removeChild(target);
			delete myself.widgets[id];
		}
	}

	this.removeAll = function() {
		for (var key in myself.widgets)
			myself.widgets[key].parentNode.removeChild(myself.widgets[key]);
			delete myself.widgets[key];
	}

	// Some SVG definition
	this.playSVG = document.createElementNS(svgns, "g");
	this.playSVG.setAttribute("id", "svg-play");
	this.playSVG.innerHTML =
	`
	<circle cx="256" cy="256" r="256" fill-opacity="0" stroke="none"/>
	  <g>
    	<g>
      		<path d="m354.2,247.4l-135.1-92.4c-4.2-3.1-15.4-3.1-16.3,8.6v184.8c1,11.7 12.4,11.9 16.3,8.6l135.1-92.4c3.5-2.1 8.3-10.7 0-17.2zm-130.5,81.3v-145.4l106.1,72.7-106.1,72.7z"/>
      		<path d="M256,11C120.9,11,11,120.9,11,256s109.9,245,245,245s245-109.9,245-245S391.1,11,256,11z M256,480.1    C132.4,480.1,31.9,379.6,31.9,256S132.4,31.9,256,31.9S480.1,132.4,480.1,256S379.6,480.1,256,480.1z"/>
    	</g>
  	</g>
  	`
	this.playSVG.setAttribute("transform", "scale(0.05, 0.05)");
	this.defs.appendChild(this.playSVG);

	this.pauseSVG = document.createElementNS(svgns, "g");
	this.pauseSVG.setAttribute("id", "svg-pause");
	this.pauseSVG.innerHTML =
	`
	<circle cx="256" cy="256" r="256" fill-opacity="0" stroke="none"/>
	<g>
		<g>
			<path d="M477.607,128.055C443.432,68.861,388.25,26.52,322.229,8.83C256.207-8.862,187.249,0.218,128.055,34.393
				C68.862,68.57,26.52,123.75,8.83,189.771c-17.69,66.022-8.611,134.981,25.564,194.174
				c34.175,59.194,89.355,101.535,155.377,119.225c22.046,5.908,44.417,8.83,66.644,8.83c44.339-0.001,88.101-11.629,127.529-34.395
				c59.193-34.175,101.535-89.355,119.225-155.377C520.861,256.207,511.782,187.248,477.607,128.055z M477.431,315.333
				c-15.849,59.146-53.78,108.579-106.81,139.197c-53.028,30.616-114.806,38.748-173.952,22.901
				c-59.147-15.849-108.581-53.78-139.197-106.81c-30.616-53.028-38.75-114.807-22.901-173.954
				c15.849-59.146,53.78-108.579,106.81-139.197c35.325-20.395,74.523-30.812,114.249-30.812c19.91,0,39.958,2.62,59.705,7.91
				c59.147,15.849,108.581,53.78,139.197,106.81C485.146,194.407,493.279,256.186,477.431,315.333z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M210.706,133.118h-33.12c-14.694,0-26.648,11.954-26.648,26.648v192.468c0,14.694,11.954,26.648,26.648,26.648h33.12
				c14.694,0,26.648-11.954,26.648-26.648V159.766C237.354,145.072,225.4,133.118,210.706,133.118z M210.706,352.234h-33.12V159.766
				h33.12l0.017,192.466C210.723,352.232,210.718,352.234,210.706,352.234z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M334.416,133.118h-33.12c-14.694,0-26.648,11.954-26.648,26.648v192.468c0,14.694,11.954,26.648,26.648,26.648h33.12
				c14.694,0,26.648-11.954,26.648-26.648V159.766C361.064,145.072,349.109,133.118,334.416,133.118z M334.414,352.234h-33.12
				V159.766h33.12l0.017,192.466C334.432,352.232,334.426,352.234,334.414,352.234z"/>
		</g>
	</g>`;
	this.pauseSVG.setAttribute("transform", "scale(0.05, 0.05)");
	this.defs.appendChild(this.pauseSVG);

	this.settingSVG = document.createElementNS(svgns, "g");
	this.settingSVG.setAttribute("id", "svg-setting");
	this.settingSVG.innerHTML =
	`
	<circle cx="256" cy="256" r="256" fill-opacity="0" stroke="none"/>
	<g>
		<g>
			<path d="M256.8,160c-25.7,0-49.8,10-67.9,28.1c-18.1,18.1-28.1,42.2-28.1,67.9s10,49.7,28.1,67.9C207,342,231.2,352,256.8,352
				c25.7,0,49.8-10,67.9-28.1c18.1-18.1,28.1-42.2,28.1-67.9s-10-49.7-28.1-67.9C306.6,170,282.5,160,256.8,160z M256.8,336
				c-44.3,0-80-35.9-80-80c0-44.1,35.7-80,80-80c44.3,0,80,35.9,80,80C336.8,300.1,301.1,336,256.8,336z"/>
		</g>
	</g>
	<g>
		<g>
			<path d="M424.5,216h-15.2c-12.4,0-22.8-10.4-22.8-23.2c0-6.4,2.7-12.1,7.5-16.4l9.8-9.6c9.7-9.6,9.7-25.2,0-34.9l-22.3-22.1
			c-4.4-4.4-10.9-7-17.5-7c-6.6,0-13,2.6-17.5,7l-9.4,9.4c-4.5,5-10.7,7.7-17.2,7.7c-12.8,0-23.7-10.4-23.7-22.7V89.1
			c0-13.5-10.5-25.1-24-25.1h-30.4C228,64,217,75.5,217,89.1v15.2c0,12.3-10.6,22.7-23.4,22.7c-6.4,0-12.2-2.7-16.6-7.4l-9.7-9.6
			c-4.4-4.5-10.9-7-17.5-7s-13,2.6-17.5,7L110,132c-9.6,9.6-9.6,25.3,0,34.8l9.4,9.4c5,4.5,7.8,10.2,7.8,16.7
			c0,12.8-10.4,23.2-22.8,23.2H89.2C75.5,216,64,227.2,64,240.8V256v15.2c0,13.5,11.5,24.8,25.2,24.8h15.2
			c12.4,0,22.8,10.4,22.8,23.2c0,6.4-2.8,12.3-7.8,16.8l-9.4,9.2c-9.6,9.6-9.6,25.2,0,34.8l22.3,22.2c4.4,4.5,10.9,7,17.5,7
			c6.6,0,13-2.6,17.5-7l9.7-9.6c4.2-4.7,10.1-7.4,16.5-7.4c12.8,0,23.4,10.4,23.4,22.7v15.2c0,13.5,11,25.1,24.7,25.1h30.4
			c13.6,0,24.9-11.5,24.9-25.1v-15.2c0-12.3,10.5-22.7,23.3-22.7c6.4,0,12.3,2.8,16.9,7.7l9.4,9.4c4.5,4.4,10.9,7,17.5,7
			c6.6,0,13-2.6,17.5-7l22.3-22.2c9.6-9.6,9.6-25.3,0-34.9l-9.8-9.6c-4.8-4.3-7.5-10.4-7.5-16.7c0-12.8,10.4-23.6,22.8-23.6h15.2
			c13.6,0,23.3-10.3,23.3-23.9V256v-15.2C447.8,227.2,438.1,216,424.5,216z M432,256v15.1c0,4.2-2.3,7.9-7.3,7.9h-15.2
			c-10.3,0-20.1,4.4-27.5,12c-7.3,7.5-11.3,17.4-11.3,27.8c0,10.8,4.4,20.8,12.5,28.2l9.5,9.4c3.3,3.4,3.3,9,0,12.3l-22.3,22.2
			c-1.6,1.5-3.9,2.4-6.3,2.4c-2.4,0-4.8-0.9-6.3-2.4l-9.1-9.1c-7.7-8.1-17.8-12.6-28.5-12.6c-10.4,0-20,4-27.5,11.2
			c-7.6,7.4-11.6,17.1-11.6,27.5v15.2c0,4.9-4.3,9.1-8.9,9.1h-30.4c-4.6,0-8.7-4.2-8.7-9.1v-15.2c0-10.3-4.1-20.1-11.7-27.5
			c-7.5-7.2-17.3-11.2-27.6-11.2c-10.6,0-20.8,4.5-28.1,12.4l-9.3,9.3c-1.6,1.5-3.9,2.4-6.3,2.4c-2.4,0-4.8-0.8-6.1-2.2l-0.1-0.1
			l-0.1-0.1l-22.3-22.2c-3.3-3.3-3.3-8.8,0-12.2l9.1-9c8.2-7.6,12.7-17.7,12.7-28.5c0-10.4-4-19.9-11.3-27.4
			c-7.4-7.6-17.2-11.5-27.5-11.5H89.2c-5,0-9.2-4.3-9.2-8.8V256v-15.2c0-4.5,4.2-8.8,9.2-8.8h15.2c10.3,0,20.1-3.9,27.5-11.5
			c7.3-7.5,11.3-17.2,11.3-27.5c0-10.8-4.5-20.9-12.7-28.4l-9.2-9.1c-2.2-2.2-2.5-4.7-2.5-6.1c0-1.3,0.3-3.9,2.5-6.1l22.2-22.1
			c1.6-1.5,3.9-2.4,6.3-2.4c2.4,0,4.8,0.8,6.1,2.2l0.1,0.1l0.1,0.1l9.4,9.4c7.4,8,17.4,12.4,28.1,12.4c10.4,0,20.1-4,27.6-11.2
			c7.6-7.4,11.8-17.1,11.8-27.5V89.1c0-4.9,4-9.1,8.5-9.1H272c4.5,0,8,4.2,8,9.1v15.2c0,10.3,4.4,20.1,12,27.5
			c7.5,7.2,17.4,11.2,27.8,11.2c10.8,0,21-4.5,28.6-12.6l9.1-9.1c1.6-1.5,3.9-2.4,6.3-2.4c2.4,0,4.8,0.9,6.3,2.3l22.3,22.1
			c1.6,1.6,2.6,3.8,2.6,6.1c0,2.3-0.9,4.5-2.5,6.1l-9.5,9.4c-8,7.4-12.5,17.4-12.5,28.2c0,10.4,4,19.9,11.3,27.4
			c7.4,7.6,17.2,11.5,27.5,11.5h15.2c5.4,0,7.4,5,7.5,9V256z"/>
		</g>
	</g>`;
	this.settingSVG.setAttribute("transform", "scale(0.07, 0.07)");
	this.defs.appendChild(this.settingSVG);
}
