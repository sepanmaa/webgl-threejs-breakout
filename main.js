//"use strict";

var blocks = [],
    width = 400,
    height = 400,
    ROWS = 10,
    COLS = 5,
    blockWidth = 80,
    blockHeight = 10,
    renderer = null,
    scene = null,
    camera = null;

var paddle = {
    width: 80,
    height: 10,
    speed: 200,
    x: 0,
    y: 0,    
    dir: 0,
    mesh: null
};

var ball = {
    x: 0,
    y: 0,
    radius: 7,
    velocity: {x: 0, y: 250},
    mesh: null
};

var game = {
    state: "ready",
    blockCount: ROWS*COLS,   
    score: 0,
    lives: 3
};

start();

function initEdges() {
    var sidegeometry = new THREE.BoxGeometry(1, 400, 100);
    var sidematerial = new THREE.MeshPhongMaterial(
	{color: 0x2222aa,
	 specular: 0x333333,
	 shininess: 5}
    );
    var leftbox = new THREE.Mesh(sidegeometry, sidematerial);
    var topGeometry = new THREE.BoxGeometry(400, 1, 100);
    var rightbox = new THREE.Mesh(sidegeometry, sidematerial);
    var backbox = new THREE.Mesh(new THREE.BoxGeometry(400, 400, 1),
				 sidematerial);
    var botbox = new THREE.Mesh(topGeometry, sidematerial);
    var topbox = new THREE.Mesh(topGeometry, sidematerial);
    leftbox.position.set(-1, 200, 0);
    rightbox.position.set(width, 200, 0);
    backbox.position.set(200, 200, -49);
    botbox.position.set(200, 0, 0);
    topbox.position.set(200, 400, 0);
    scene.add(botbox);
    scene.add(leftbox);
    scene.add(rightbox);
    scene.add(backbox);
    scene.add(topbox);
}

function initLights() {
    var light = new THREE.DirectionalLight(0xffffff, 0.7);
    var ambient = new THREE.AmbientLight(0xffffff, 0.2);
    light.position.set(50, 10, 100);
    scene.add(light);
    scene.add(ambient);
}

function initStatusText() {
    var status = document.createElement("div");
    status.id = "status";
    status.style.position = "absolute";
    status.style.top = "0px";
    status.style.padding = "10px";
    status.style.width = "200px";
    status.style.height = "100px";
    status.style.fontFamily = "monospace";
    status.innerHTML = "Score: " + game.score + " Lives: " + game.lives;
    status.style.color = "white";
    document.body.appendChild(status);
}

function drawText(msg) {
    var text = document.createElement("div");
    text.id = "message";
    text.style.position = "absolute";
    text.style.top = window.innerHeight/2 + "px";
    text.style.fontSize = 48;
    text.style.left = window.innerWidth/3 + "px";
    text.innerHTML = msg;
    text.style.color = "white";
    text.style.fontFamily = "arial";
    document.body.appendChild(text);
}

function start() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    camera.position.z = 400;
    camera.position.x = 300;
    camera.position.y = 200;
    camera.rotation.y = 10 * Math.PI / 180;
    initLights();
    initEdges();
    initStatusText();
    initGame();
    initKeys();
    var time = 0;
    function mainLoop(timestamp) {
	requestAnimationFrame(mainLoop);
	renderer.render(scene, camera);
	var delta = timestamp - time;
	time = timestamp;
	var paddleDelta = paddle.speed*delta/1000;
    	if ((paddle.dir === -1 && paddle.x > paddleDelta) ||
    	    (paddle.dir === 1 && paddle.x + paddleDelta + paddle.width < width))
    	    paddle.x += paddleDelta * paddle.dir;
	if (game.state === "running") {
	    ball.x += ball.velocity.x * delta / 1000;
    	    ball.y += ball.velocity.y * delta / 1000;
    	    detectCollisions();
	} else  {
    	    ball.x = paddle.x+paddle.width/2;
    	    ball.y = paddle.y+paddle.height+ball.radius;
    	} 
	if (ball) {
	    ball.mesh.position.x = ball.x;
	    ball.mesh.position.y = ball.y;
	}
	if (paddle) {
	    paddle.mesh.position.x = paddle.x+paddle.width/2
	    paddle.mesh.position.y = paddle.y+paddle.height/2;
	}
    }
    mainLoop();
}

function updateStatus() {
    var s = document.getElementById("status");
    if (game.lives === 0) {
	drawText("GAME OVER");
	resetGame();
	game.state = "over";
    } else if (game.blockCount === 0) {
	drawText("YOU WIN");
	resetGame();
	game.state = "over";
    } 
    s.innerHTML = 'Score: ' + game.score + ' Lives: ' + game.lives;
}

function resetGame() {
    game.lives = 3
    game.score = 0
    game.blockCount = ROWS*COLS;
    scene.remove(paddle.mesh);
    scene.remove(ball.mesh);
    for (var i = 0; i < ROWS; i++)
	for (var j = 0; j < COLS; j++)
	    scene.remove(blocks[i][j].object);
    initGame();
}

function detectCollisions() {
    // walls
    if (ball.x+ball.radius > width) {
	ball.velocity.x = -ball.velocity.x;
	ball.x = width-ball.radius;
    }
    if (ball.x-ball.radius < 0) {
	ball.velocity.x = -ball.velocity.x;
	ball.x = ball.radius;
    }
    if (ball.y+ball.radius > height) {
	ball.velocity.y = -ball.velocity.y;
	ball.y = height-ball.radius;
    }
    
    // paddle
    if (ball.y-ball.radius < paddle.y+paddle.height
	&& game.state === "running") {
	if (ball.x >= paddle.x && ball.x < paddle.x+paddle.width) {
	    ball.velocity.x += paddle.dir*50;
	    ball.velocity.y = -ball.velocity.y;
	    ball.y = paddle.y+paddle.height+ball.radius;
	} else {
	    game.lives--;
	    game.score = 0;
	    resetPaddle();
	    game.state = "ready";
	    updateStatus();
	}
    }
    
    // blocks
    if (ball.y+ball.radius < height-ROWS*blockHeight)
	return false;
    var col = Math.floor((ball.x-ball.radius)/blockWidth);
    var row = Math.floor((height-ball.y-ball.radius)/blockHeight);
    if (row < 0 || col < 0 || blocks[row][col].status === 1)
	return false;
    var x = col*blockWidth;
    var y = height-row*blockHeight;
    if (ball.x+ball.radius >= x && ball.x-ball.radius < x+blockWidth
	&& ball.y+ball.radius > y-blockHeight && ball.y-ball.radius < y) {
	ball.velocity.y = -ball.velocity.y;
	blocks[row][col].status = 1;
	scene.remove(blocks[row][col].object);
	game.score++;
	game.blockCount--;
	updateStatus();
	return true;
    }
    return false;
}

function initKeys() {
    document.addEventListener("keydown", (e) => {
	if (e.keyCode === 39)
	    paddle.dir = 1;
	else if (e.keyCode === 37)
	    paddle.dir = -1;
	else if (e.keyCode === 32 && game.state === "ready") {
	    ball.velocity.x += paddle.dir * 25;
	    if (ball.velocity.x > width)
		ball.velocity.x = width;
	    game.state = "running";
	}
	if (game.state === "over") {
	    var elem = document.getElementById("message");
	    elem.parentNode.removeChild(elem);
	    game.state = "ready";
	}
    }, false);
    document.addEventListener("keyup", (e) => {
	if ((e.keyCode === 39 && paddle.dir === 1) ||
	    (e.keyCode === 37 && paddle.dir === -1))
    	    paddle.dir = 0;
    }, false);
}

function resetPaddle() {
    paddle.x = width/2-paddle.width/2;
    paddle.y = 0;
    paddle.mesh.position.x = paddle.x+paddle.width/2;
    paddle.mesh.position.y = paddle.height/2;
    paddle.dir = 0;
    ball.x = paddle.x+paddle.width/2;
    ball.y = paddle.y+paddle.height+ball.radius;
    ball.mesh.position.x = ball.x;
    ball.mesh.position.y = ball.y;
    ball.velocity.x = Math.random()*200-100;
    ball.velocity.y = 250;
}

function initGame() {
    var geometry = new THREE.BoxGeometry(blockWidth, blockHeight, 100);
    for (var i = 0; i < ROWS; i++) {
	blocks[i] = [];
	for (var j = 0; j < COLS; j++) {
	    var material = new THREE.MeshPhongMaterial(
		{color: new THREE.Color(randColor(),
					randColor(),
					randColor())
		});
	    var object = new THREE.Mesh(geometry, material);
	    blocks[i][j] = { status: 0,
			     object: object
			   };
	    object.position.set(j*blockWidth+paddle.width/2,
				height-(i*blockHeight+paddle.height/2), 0);
	    scene.add(object);
	}
    }
    var material = new THREE.MeshPhongMaterial({color: 0x00ff00});
    var paddleGeometry = new THREE.BoxGeometry(paddle.width, paddle.height, 50);
    paddle.mesh = new THREE.Mesh(paddleGeometry, material);
    scene.add(paddle.mesh);
    ball.mesh = new THREE.PointLight(0xffffff, 1, 200);
    var ballGeometry = new THREE.SphereGeometry(ball.radius);
    var ballMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
    ball.mesh.add(new THREE.Mesh(ballGeometry, ballMaterial));
    scene.add(ball.mesh);
    game.state = "ready";
    resetPaddle();
}

function randColor() {
    return 0.3 + 0.7*Math.random();
}


