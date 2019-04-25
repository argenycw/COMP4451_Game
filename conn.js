// #================================================================#
// #                            CONN.JS                             #
// #----------------------------------------------------------------#
// # This module is to handle P2P connection among two players      #
// #================================================================#

// # Global objects and variables
var multiplaying = false;
var gameid = 1; // 1 for host, 2 for join
var peer = null;
var conn = null;
var lastPeerId = null;

var loseInMult = false;
var winInMult = false;
var peerEnd = false;

var playMissed = 0;
var peerMissed = 0;

// avoid incoherence bounce due to network latency
var collision = false;

// Create the Peer object for our end of the connection.
function initialize(peerId=null) {
    // Create own peer object with connection to shared PeerJS server
    peer = new Peer(peerId, {debug: 3});
    peer.on('open', function (id) {
        // Workaround for peer.reconnect deleting previous id
        if (peer.id === null) {
            console.log('Received null id from peer open');
            peer.id = lastPeerId;
        } else {
            lastPeerId = peer.id;
        }
        console.log('Peer created with ID: ' + peer.id);
    });
    // When the passive side connects
    peer.on('connection', function(c) {
		// Allow only a single connection
        if (conn) {
            c.on('open', function() {
                c.send('{"error": "Already connected to another client"}');
                setTimeout(function() { c.close(); }, 500);
            });
            return;
        }
        conn = c;
        let hostStatus = widget.getWidget("hostStatus");
        hostStatus.textContent = "Connected to: " + conn.peer;
        hostReady();
    });
    peer.on('disconnected', function () {
        console.log('Connection lost. Please reconnect');
        // Workaround for peer.reconnect deleting previous id
        if (peer) {
	        peer.id = lastPeerId;
	        peer._lastServerId = lastPeerId;
	        peer.reconnect();
	    }
    });
    peer.on('close', function() {
        conn = null;
        console.log('Connection destroyed. Please refresh.');
    });
    peer.on('error', function (err) {
    	let hostStatus = widget.getWidget("hostStatus");
    	let joinStatus = widget.getWidget("joinStatus");
    	if (hostStatus) hostStatus.textContent = "Connection Failed";
    	else if (joinStatus) joinStatus.textContent = "Connection Failed";
        console.log(err);
        alert('' + err);
    });
};

// Initialize and await for joining
function host() {
	// randomly generate a string
	let randString = generateRandomId();
    gameid = 1;
	initialize(randString);
	return randString;
}

function generateRandomId() {
	return 'comp4451-' + Math.random().toString(36).substring(5);
}

// Create the connection between the two Peers.
function join(peerId=null) {
    gameid = 2;
	randString = generateRandomId();
	initialize(randString);

    // Close old connection
    if (conn) {
        conn.close();
    }

    // Create connection to destination peer specified in the input field
    if (peerId.length == 0) return;
    // update the join status into waiting
    let joinStatus = widget.getWidget("joinStatus");
    joinStatus.textContent = "Connecting...";

    // Wait until peer initialization finishes
    peer.on("open", function() {
    	conn = peer.connect(peerId);
	    conn.on('open', function () {
	        console.log("Connected to: " + conn.peer);
	        // update the join status displayed on the menu
	        let joinStatus = widget.getWidget("joinStatus");
	        joinStatus.textContent = "Connected to " + peerId;
	        // Check URL params for comamnds that should be sent immediately
	        // should not happen in the game
	        var command = getUrlParam("command");
	        if (command) conn.send(command);
	    });
	    // Handle incoming data
	    conn.on('data', function (msg) {
	    	// convert the message into json
	    	try {
	    		var data = JSON.parse(msg);
	    	} catch (err) {
	    		console.error("Invalid JSON format:", err);
                console.log("data received:", msg);
	    	}
            process(data);
	    });
	    conn.on('close', function () {
	        console.log("Connection closed");
	    });
    });
};

// Triggered once a connection has been achieved.
function hostReady() {
    conn.on('data', function (msg) {
    	try {
    		var data = JSON.parse(msg);
    	} catch (err) {
    		console.error("Invalid JSON format:", err);
            console.log("Original message: ", msg);
            return;
    	}
        process(data);        
    });
    conn.on('close', function () {
        console.log("connection reset...");
        conn = null;
        //start(true);
    });
    // Enable the "Start" button of the host
    enableMultiplayerStart();
}


// Get first "GET style" parameter from href. This enables delivering an initial command upon page load.
// Called internally by PeerJS
function getUrlParam(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.href);
    if (results == null)
        return null;
    else
        return results[1];
};

// To close all connection
function terminateConnection() {
	if (peer) peer.destroy();
	conn = null;
	peer = null;
}

// Send a signal via the peer connection. Only occur if the connection is still alive.
function signal(msg) {
    if (conn.open) {
        conn.send(msg);
    }
}

// Build the information to communicate during the progress of the stage
function sendGameData() {
    if (paused) return;
    let data = {
        "game": {
            "position": [player.position.x, player.position.y, player.position.z],
            "velocity": [player.velocityX, player.velocityY, player.velocityZ],
            "time": resourceLoader.song.currentTime,
            "missed": playMissed,
            "collision": collision
        }
    };
    collision = false; // reset the flag of collision detech
    if (loseInMult) {
        data.game.lost = loseInMult;
    }
    if (winInMult) {
        data.game.win = winInMult;
    }
    signal(JSON.stringify(data));
}

// Process the data in json
function process(data) {
	if (data.error) console.error(data.error);
	if (data.action) {
		processAction(data.action);
	}
    if (data.game) {
        processGameData(data.game);
    }
}

// Action: only available in menu and stage selection
function processAction(action) {
	let hostStatus = widget.getWidget("hostStatus");
	let joinStatus = widget.getWidget("joinStatus");
	if (hostStatus) hostStatus.textContent = action.type;
	else if (joinStatus) joinStatus.textContent = action.type;

    if (action.type == "starting") {
        widget.remove("join-dialog");
        widget.remove("fade");
        clearInterval(animationInterval);
        scene = new THREE.Scene();
        renderer.render(scene, camera);
        startMulti(action.stage);
    }
    else if (action.type == "loaded") {
        // unlock resource loader when peer finishes loading
        resourceLoader.locked = false;
    }
    else if (action.type == "end") {
        stageEndMulti();
    }
    else if (action.type == "restart") {
        restart();
    }
    else if (action.type == "back") {
        backMulti(true);
    }
    else if (action.type == "quit") {
        quitMulti(true);
    }
}

// To control the peer charcater according to data received
function processGameData(data) {
    if (!peerPlayer) return;
    // Check if peer has won/lost
    if (!peerEnd && (data.lost || data.win)) {
        peerEnd = true;
        // When both player finishes (win/lose)
        if (loseInMult || winInMult) {
            signal('{"action": {"type": "end"}}');
            stageEndMulti();
        }
        return;
    }
    // Set the collision flag
    collision = data.collision;
    // Set the position
    peerPlayer.position.set(data.position[0], data.position[1], data.position[2]);
    // Set the facing direction
    if (data.velocity[0]) peerPlayer.rotation.y = ((data.velocity[0] < 0.001) ? -1 : 1) * Math.PI / 2;
    else if (data.velocity[2]) peerPlayer.rotation.y = ((data.velocity[2] < 0.001) ? 1 : 0) * Math.PI;
    // to make sure the song is synchronized (unsafe)
    //let diff = resourceLoader.song.currentTime - data.time;
    // if (Math.abs(diff) > 0.2) {
    //     if (diff > 0) resourceLoader.song.currentTime -= 0.1;
    // }
    // Set the animation frame
    let anim = peerPlayer.mixer.existingAction(peerPlayer.animations[0]);
    if (anim) {
        if (Math.abs(data.velocity[0]) < 0.0001 && Math.abs(data.velocity[2] < 0.0001)) {
            anim.stop();
        } 
        else {
            anim.play();
            const delta = clock.getDelta();
            peerPlayer.mixer.update(delta * c_fallSpeed / c_jumpInitVelocity);
        }        
    }
    // update the count of missed notes
    if (data.missed && data.missed > peerMissed) peerMissed = data.missed;
    solveCollision(data);
}

// When peerPlayer and player collide, solve the collision and bounce off.
function solveCollision(data) {

    // check collision
    playerBoundingBox = new THREE.Box3().setFromObject(player);
    peerPlayerBoundingBox = new THREE.Box3().setFromObject(peerPlayer);
    let collisionHere = playerBoundingBox.intersectsBox(peerPlayerBoundingBox);

    // player not moving
    if (collisionHere && player.velocityY == 0) {
        if(collisionHere) console.log("collision detected");
        // peer collide horizontally
        if(Math.abs(data.velocity[0]) > 0.0001) {
            // from right
            if(player.position.x < peerPlayer.position.x)
                collidePlayer(directionX.RIGHT, directionZ.NULL);
            // from left
            else 
                collidePlayer(directionX.LEFT, directionZ.NULL);
        // peer collide vertically
        } else if (Math.abs(data.velocity[2]) > 0.0001) {
            // from bottom
            if(player.position.z > peerPlayer.position.z) 
                collidePlayer(directionX.NULL, directionZ.UP);
            // from above
            else 
                collidePlayer(directionX.NULL, directionZ.DOWN);
        }
    }
    //jumping
        else if(collisionHere && player.velocityY != 0) {
        //pull back
        var size = new THREE.Vector3( 0, 0, 0);
        peerPlayerBoundingBox.getSize(size);
        if(playerX > prevPlayerX) 
            player.position.x = peerPlayer.position.x - size.x;
        else if(playerX < prevPlayerX) 
            player.position.x = peerPlayer.position.x + size.x;
        if(playerZ > prevPlayerZ) 
            player.position.z = peerPlayer.position.z - size.z;
        else if(playerZ < prevPlayerZ) 
            player.position.z = peerPlayer.position.z + size.z;
        playerX = prevPlayerX;
        playerZ = prevPlayerZ;
        player.velocityX = -player.velocityX;
        player.velocityZ = -player.velocityZ;
    }
}