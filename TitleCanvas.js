function TitleCanvas(width, height, name, source, imageFile) {
	this.titleXPos = 0;
	this.canvasElement = document.createElement('canvas');
	this.canvasElement.id = "titleCanvas";
	this.canvasElement.width = window.innerWidth;
	this.canvasElement.height = window.innerHeight;
	this.canvasElement.style.zIndex = 8;
	this.canvasElement.style.position = "absolute";
	this.canvasElement.style.top = 0;
	this.canvasElement.style.left = 0;
	this.width = width;
	this.height = height;
	this.image;
	this.t = -Math.pow(window.innerWidth/2+this.width, 1/3);
	this.imageFile = imageFile;
	this.duration = 5000;

	var myself = this;

	// move with equation y=x^3
  	this.moveTitle = function() {
		if (myself.t < Math.pow(window.innerWidth, 1/3)) {
		  	myself.drawTitle(myself.t*myself.t*myself.t + window.innerWidth/2 - myself.width/2 , window.innerHeight/2 - myself.height/1.2, myself.width, myself.height);
		  	myself.t += 0.04;
		  	setTimeout(myself.moveTitle, 10);
		} else { myself.removeCanvas(); }
  	}

  	this.drawTitle = function(x, y, width, height) {
	  	let ctx = myself.canvasElement.getContext('2d');
		ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
	        ctx.drawImage(myself.image, x, y, width, height);
	        //draw a box over the top
	        ctx.font = "20px cubic";
	        ctx.fillStyle = 'white';
	        ctx.textAlign = "center"; 
	        ctx.fillText(name, x+width/2 ,y+height+25);
		    ctx.strokeStyle = '#a00020';
		    ctx.lineWidth = 2;
		    ctx.strokeText(name, x+width/2 ,y+height+25);
	        ctx.fillStyle = 'white';
	        ctx.textAlign = "center"; 
	        ctx.fillText(source, x+width/2 ,y+height+50);
		    ctx.strokeText(source, x+width/2 ,y+height+50);

  	}

  	this.removeCanvas = function() {
  		myself.canvasElement.parentNode.removeChild(myself.canvasElement);
  	}	

	document.body.appendChild(myself.canvasElement);

	myself.image = new Image();
	myself.image.src = imageFile;

    myself.image.onload = function () {
		myself.moveTitle();
    }
}
