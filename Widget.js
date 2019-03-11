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
	this.createRectButton = function(textContent, x, y, width, height, classListBtn=[], onclick=function(){}) {
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
		for (var i = 0; i < classListBtn.length; i++) {
			group.classList.add(classListBtn[i]);
		}
		group.addEventListener("click", onclick);
		// Create text at the center of the button
		var text = document.createElementNS(svgns, "text");
		text.setAttribute("x", "50%");
		text.setAttribute("y", "50%");
		text.classList.add("unselectable");
		text.style.textAnchor = "middle";
		text.style.alignmentBaseline = "middle";
		text.appendChild(document.createTextNode(textContent));

		// Append the elements into the group
		group.appendChild(btn);
		group.appendChild(text);
		return group;
	}	

	// Return a rectangular button with a text embedded in the middle that is already on the screen
	this.showRectButton = function(textContent, x, y, width, height, classListBtn=[], onclick=function(){},
									id="w-"+Object.keys(myself.widgets).length) {
		// Create a rect button
		var group = myself.createRectButton(textContent, x, y, width, height, classListBtn, onclick);
		// append the text into the widget dictionary
		myself.widgets[id] = group;
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
		return text;
	}

	// Return an svg text that is already on the screen
	this.showSimpleText = function(content, x, y, classList=[], size=0, id="w-"+Object.keys(myself.widgets).length) {
		var text = myself.createSimpleText(content, x, y, classList, size);
		// append the text into the widget dictionary
		myself.widgets[id] = text;
		myself.screen.appendChild(text);
		return text;
	}

	// Blink the text. Content should be an array of text to blink
	this.blinkSimpleText = function(content, x, y, classList=[], size=0, time=1000) {
		for (var i = 0; i < content.length; i++) {
			let textContent = content[i];
			var id = "w_" + i;
			setTimeout(function() {myself.showSimpleText(textContent, x, y, classList, size, id);}, time * i);
			setTimeout(function() {myself.remove(id);}, time * (i+1));
		}
		// return the time needed to wait for
		return content.length * time; 
	}

	this.showDefinedSVG = function(x, y, classList=[], onclick=null, id="w-"+Object.keys(myself.widgets).length) {
		var use = document.createElementNS(svgns, "use");
		use.setAttribute("x", x);
		use.setAttribute("y", y);
		use.setAttribute("href", "#svg-pause");
		if (onclick) use.addEventListener("click", onclick);
		for (var i = 0; i < classList.length; i++) {
			use.classList.add(classList[i]);
		}
		// append the svg into the widget dictionary
		myself.widgets[id] = use;
		myself.screen.appendChild(use);
		return use;
	}

	this.fadeScreenWhite = function(fadeTime) {
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
			if (opacity < 0.8) 
				setTimeout(fade.fadeWhite, fadeTime / c_FPS);
		};
		setTimeout(fade.fadeWhite, fadeTime / c_FPS);
		myself.screen.appendChild(fade);
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
}
