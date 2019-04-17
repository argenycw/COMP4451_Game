// #================================================================#
// #                            CONN.JS                             #
// #----------------------------------------------------------------#
// # This module is to handle P2P connection among two players      #
// #================================================================#

// # Global objects and variables
var peer = null;
var conn = null;
var lastPeerId = null;

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
	initialize(randString);
	return randString;
}

function generateRandomId() {
	return 'comp4451-' + Math.random().toString(36).substring(5);
}

// Create the connection between the two Peers.
function join(peerId=null) {
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
	    		process(data);
	    	} catch (err) {
	    		console.error("Invalid JSON format:", err);
	    	}
	    });
	    conn.on('close', function () {
	        console.log("Connection closed");
	    });
    });
};

// Triggered once a connection has been achieved.
function hostReady() {
    conn.on('data', function (data) {
    	try {
    		var data = JSON.parse(msg);
    		process(data);
    	} catch (err) {
    		console.error("Invalid JSON format:", err);
    	}
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

// Process the data in json
function process(data) {
	if (data.error) console.error(data.error);
	if (data.action) {
		processAction(data.action);
	}
}

function processAction(action) {
	let hostStatus = widget.getWidget("hostStatus");
	let joinStatus = widget.getWidget("joinStatus");
	if (hostStatus) hostStatus.textContent = action;
	else if (joinStatus) joinStatus.textContent = action;
}