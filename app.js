var example = (function(){
    "use strict";

    Physijs.scripts.worker = 'js/physijs_worker.js';
    Physijs.scripts.ammo = 'ammo.js';

    var camera, scene, renderer, material, light = new THREE.DirectionalLight( 0xffffff,.5), mouse = new THREE.Vector2(), raycaster, loader = new THREE.FontLoader(), clock = new THREE.Clock();
    var groundMirror, tile = new THREE.CubeGeometry( 100, 1, 100), stats, combinations = 0, prevSecond = null;
    var map = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0,],
        [0, 0, 0, 0, 0, 0, 0, 0, 0,],
        [0, 0, 0, 0, 0, 0, 0, 0, 0,],
        [0, 0, 0, 0, 0, 0, 0, 0, 0,],
        [0, 0, 0, 0, 0, 0, 0, 0, 0,],
        [0, 0, 0, 0, 0, 0, 0, 0, 0,],
        [0, 0, 0, 0, 0, 0, 0, 0, 0,],
        [0, 0, 0, 0, 0, 0, 0, 0, 0,],
        [0, 0, 0, 0, 0, 0, 0, 0, 0,],
    ], mapW = map.length, mapH = map[0].length, unit = 100, floor, skyBox;

    var fShader = THREE.FresnelShader, fresnelUniforms, dustMaterial; var iterations = 60;
    var controlls, random = 10, ballCount = 3, score = 0, scoreText = null, bounceSpeed = 10.5, particleGroup, particleAttributes, running = true, time = clock.getDelta(), now;
    var INTERSECTED, balls = [], tiles = [], lines = [], dust = [], nextColorStack = [], nextBallStack = [], bussySectors = 0, ballsToCollect = 3, bonusTime = 0;
    var easystar;
    var textMesh, spriteMaterial, sprite;
    var bussySectors = [], matched = [], colors = [ 0xf4a460, 0x7f0000, 0xffff00, 0x00ff00, 0x0000ff, 0xff69b4, 0xd3d3d3, 0xadd8e6, 0x98fb98 ];
    var textFont;
    var movementSpeed = 180, boom;
    var totalObjects = 1000;
    var objectSize = 10, ballMovement = null;
    var sizeRandomness = 4000;
    var colors = [0xFF0FFF, 0xCCFF00, 0xFF000F, 0x996600, 0xFFFFFF];
    /////////////////////////////////
    var dirs = [], parts = [];
    ///////////
    var bg, bgMaterial, bgGeometry, bgTexture, canvas, ctx, noise = new ImprovedNoise(), displayTime = Math.random()*10,
        noisePos = Math.random()*1000, normalsHelper;
    loader.load( 'fonts/helvetiker_regular.typeface.js', function ( font ) {

        textFont = font;
        init( );
        animate();

    } );

    function init( ) {

        scene = new Physijs.Scene;
        scene.setGravity(new THREE.Vector3( 0, -900, 0 ));
        camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 10000);


        camera.position.set(400,2000,0);
        camera.up = new THREE.Vector3(0,2000,1);
        camera.lookAt(new THREE.Vector3(400,0,450));


        var pointLight = new THREE.PointLight( 0xffffff,.5 );
        pointLight.position.set(500,500,600);
        pointLight.lookAt(new THREE.Vector3(450,0,450));
        pointLight.castShadow = true;


        light.position.set( 750, 2000, 0 );
        light.castShadow = true;
        scene.add(light);
        scene.add(pointLight);

        renderer = new THREE.WebGLRenderer({antialias:true});
        renderer.setClearColor( 0xf0f0f0 );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.shadowMap.enabled = true;
        renderer.shadowMapWidth = 1024;
        renderer.shadowMapHeight = 1024;
        renderer.setSize( window.innerWidth - 4, window.innerHeight - 4 );
        document.getElementById("game-container").appendChild(renderer.domElement);
        window.addEventListener( 'resize', onWindowResize, false );
        document.addEventListener( 'click', onMouseClick, false );
        document.addEventListener( 'mousedown', onDocumentMouseDown, false );

        //stats = new Stats();
        //stats.showPanel( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
        //document.body.appendChild( stats.dom );

        raycaster = new THREE.Raycaster();

        spriteMaterial = new THREE.SpriteMaterial(
            {
                map: new THREE.TextureLoader().load( 'textures/glow.png' ),
                color: 0x0000ff, transparent: false, blending: THREE.AdditiveBlending
            });
        sprite = new THREE.Sprite( spriteMaterial );
        sprite.scale.set(150, 150, 1.0);

        var planeGeo = new THREE.PlaneBufferGeometry( 900.1, 900.1 );

        groundMirror = new THREE.Mirror( renderer, camera, { clipBias: 1, textureWidth: window.innerWidth, textureHeight: window.innerHeight, color: 0x777777 } );

        var mirrorMesh = new THREE.Mesh( planeGeo, groundMirror.material );
        mirrorMesh.add( groundMirror );
        mirrorMesh.rotateX( - Math.PI / 2 );
        mirrorMesh.position.set( 450, -1, 450);
        scene.add( mirrorMesh );

        material = Physijs.createMaterial(
            new THREE.MeshPhongMaterial( { map: new THREE.TextureLoader().load('textures/tile1.jpg'), opacity: .7, transparent: true  } ),
            .8,
            .4
        );

        canvas = document.createElement('canvas');
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx = canvas.getContext('2d');

        bgTexture = new THREE.TextureLoader().load( 'textures/aqua.jpg' );
        bgTexture.minFilter = bgTexture.magFilter = THREE.LinearFilter;
        buildBackground();

        //controlls = new THREE.OrbitControls( camera, renderer.domElement);
        changeScore( score );
        createEnemies( ballCount, unit, balls );
        createMap();
        //buildWalls();

        dustMaterial = new THREE.MeshBasicMaterial( {opacity:.5, transparent: true} );

        buildCup();
    }


    function animate() {
        //stats.begin();

        bounceTimer();
        updateBg();


        //skyBox.rotation.y += .0001;

        camera.updateMatrixWorld();
        groundMirror.render();


        balls.forEach(function(b){
            if( b.bouncing ){
                b.position.y += bounceSpeed;
                if( b.position.y >= 130 ){
                    bounceSpeed = -bounceSpeed;
                }
                if( b.position.y <= 30 ){
                    bounceSpeed = -bounceSpeed;
                }
            }

            if( b.scale.x < 1 ){
                b.scale.x = b.scale.x + 0.1;
                b.scale.y = b.scale.y + 0.1;
                b.scale.z = b.scale.z + 0.1;
            }
        });
        nextBallStack.forEach(function(b){
            if( b.scale.x < 1 ){
                b.scale.x = b.scale.x + 0.1;
                b.scale.y = b.scale.y + 0.1;
                b.scale.z = b.scale.z + 0.1;
            }
        });

        if( dust.length != 0 ){

            //var time = 4 * clock.getElapsedTime();
            dust.forEach(function(d){
                d.position.x = d.position.x + (4 * Math.random() - 2);
                d.position.y = d.position.y - (.5 * Math.random());
                d.position.z = d.position.z +(6 * Math.random() - 3);
                //d.rotation.y = time * 0.75;
            });





            //dust.forEach(function(d){
            //    for ( var c = 0; c < d.children.length; c ++ )
            //    {
            //        var sprite = d.children[ c ];
            //
            //        var a = particleAttributes.randomness[c] + 1;
            //        var pulseFactor = Math.sin(a * time) * 0.1 + 0.9;
            //        sprite.position.x = particleAttributes.startPosition[c].x * pulseFactor;
            //        sprite.position.y = particleAttributes.startPosition[c].y * pulseFactor;
            //        sprite.position.z = particleAttributes.startPosition[c].z * pulseFactor;
            //    }
            //
            //    d.rotation.y = time * 0.75;
            //});
        }


        if( bonusTime > 0 ){
            if( now === undefined || now + 1 <= Math.round( new Date().getTime() / 1000 ) ){
                now = Math.round(new Date().getTime() / 1000);
                addTimer( bonusTime - now )
            }
        }






        TWEEN.update();
        var pCount = parts.length;
        while(pCount--) {
            parts[pCount].update();
        }
        //stats.end();
        render();
        requestAnimationFrame( animate );
    }

    function render() {
        scene.simulate();
        renderer.render( scene, camera );
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
        render();
    }

    function onMouseClick( e ) {

        boom = false;

        mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

        raycaster.setFromCamera( mouse, camera );

        var intersects = raycaster.intersectObjects( balls );
        if ( intersects.length > 0 ) {
            if ( INTERSECTED != intersects[ 0 ].object ) {

                if ( INTERSECTED ) {INTERSECTED.bouncing = false;INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );}
                INTERSECTED = intersects[ 0 ].object;
                INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
                INTERSECTED.material.emissive.setHex( 0xff0000 );
                INTERSECTED.bouncing = true;

                INTERSECTED.add(sprite);

            }
        } else {
            if ( INTERSECTED ) {INTERSECTED.remove(sprite);INTERSECTED.bouncing = false;INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );}
            INTERSECTED = null;

        }

    }

    function onDocumentMouseDown( e ) {
        var ball;
        var m = new THREE.Vector2();
        m.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        m.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

        var ray = new THREE.Raycaster();
        ray.setFromCamera( m, camera );
        var selected = ray.intersectObjects( tiles );
        if ( selected.length > 0 && INTERSECTED != null ) {
            ball = INTERSECTED;
            var mapCoordinates = getMapSector(selected[0].point.x, selected[0].point.z);

            var ballCoordinates = getMapSector(ball.position.x, ball.position.z);
            easystar.findPath(ballCoordinates.x, ballCoordinates.y, mapCoordinates.x, mapCoordinates.y, function(path){
                if (path !== null) {
                    matchSector( ball, false );
                    $.each( path, function( i, val ){
                        setTimeout(function(){

                        //var next = path[i + 1] !== undefined ? path[i + 1] : path[i];
                        if( path.length - 1 !== i){

                            var endPoint = {
                                x: 1000 - ((val.x * unit) + unit / 2),
                                y: 40,
                                z: 1000 - ((val.y * unit) + unit / 2)
                            };

                            //ballMovement = {
                            //    x: next.x > ballCoordinates.x,
                            //    z: next.y > ballCoordinates.y
                            //}

                            //console.log( endPoint.x );
                            //var startPoint = ball.position;
                            //createLine( startPoint, endPoint);
                            createBubbles(ball.position, endPoint, i );
                            }
                            var r = new TWEEN.Tween( ball.position ).to( {
                                x: 900 - ((val.x * unit) + unit / 2),
                                y: 40,
                                z: 900 - ((val.y * unit) + unit / 2) }, 200 )
                                .easing( TWEEN.Easing.Back.InOut).start().onComplete( function(){

                                    if( path[path.length - 1].x == val.x &&
                                        path[path.length - 1].y == val.y ){
                                        matchSector( ball, true );

                                        checkNeighboors( val, ball );
                                        if( !boom ){
                                            createEnemies( ballCount, unit, balls );
                                        }
                                        //ballMovement = null

                                    }
                                } );


                        }, i * 200);

                    });
                }
            });
            easystar.calculate();
        }
    }

    function buildBackground(){
        bgMaterial = new THREE.MeshPhongMaterial( {
            color: 0x666666,
            specular: 0xdddddd,
            shininess: 20,
            map: bgTexture,
            specularMap: bgTexture,
            transparent: true,
            opacity:1,
            side: THREE.DoubleSide
        });

        bgGeometry = new THREE.PlaneGeometry( window.innerWidth * 4.5, window.innerHeight * 4.5, 20, 20 );
        bg = new THREE.Mesh( bgGeometry, bgMaterial );
        bg.rotation.x = Math.PI / 2;
        bg.position.set(500,-700,700);

        scene.add( bg );
        perturbVerts();

        // normalsHelper = new THREE.FaceNormalsHelper( bg, 10, 0x00ff00, 1 );
        // scene.add( normalsHelper );
        // normalsHelper.visible = false;
    }

    function perturbVerts(){

        bgGeometry.vertices.forEach( function(vert) {
            vert.z = getZPos(vert);
        });

        bgGeometry.verticesNeedUpdate = true;
        bgGeometry.computeFaceNormals();
        bgGeometry.computeVertexNormals();
        bgGeometry.normalsNeedUpdate = true;

    }

    function getZPos(vert){
        var noiseScale = 0.0012;
        var zpos = noise.noise(vert.x  * noiseScale + noisePos,
                vert.y  * noiseScale + noisePos, 0)  * 110;
        return zpos ;
    }

    function updateBg(){
        displayTime += 0.01;

        //bg.rotation.x = Math.cos(displayTime/2) * 0.4 * 1;
        //bg.rotation.x += .01; console.log(bg.rotation.x)
        bg.rotation.y  = Math.sin(displayTime/2) * 0.2 * 1;
        bg.rotation.z  = Math.sin(displayTime/2 + 0.6) * 0.15 * 1;

        perturbVerts();

        noisePos += 0.015;
    }

    function createMap(){
        for (var x = 0; x < mapW; x++) {
            for (var z = 0; z < mapW; z++) {
                buildFloor( scene, x, z );
            }
        }
        easystar = new EasyStar.js();

        easystar.setGrid(map);
        easystar.disableDiagonals();
        easystar.disableCornerCutting();
        easystar.disableSync();
        easystar.setAcceptableTiles([0]);
    }

    function buildFloor( scene, x, z ){

        floor = new Physijs.BoxMesh(tile, material, 0 );
        floor.castShadow = true;
        floor.receiveShadow = true;
        floor.shit = Math.random() * 0xffffff;
        floor.position.x = ( x * unit) + unit/2;
        floor.position.z = ( z * unit) + unit/2;
        scene.add( floor );
        tiles.push(floor);
        floor.name = floor.position.x + '_' + floor.position.z;
        floor.addEventListener('collision', function( other_object ) {

        });
    }


    function createEnemies( ballCount, unit, balls ){
        var bussy = false;

        if( bussySectors > (mapH * mapW) - ballCount){
            gameOver(); running = false;
        }else{
            for( var i = 0; i < ballCount; i++){
                var x = (randomIntFromInterval( 0, 8 ) * unit) + unit / 2;
                var z = (randomIntFromInterval( 0, 8 ) * unit) + unit / 2;


                for( var j = 0; j < balls.length; j++){
                    if( balls[j].position.x == x && balls[j].position.z == z ){
                        bussy = true;
                        i--;
                        break;
                    }else{
                        bussy = false;
                    }
                }

                if( bussy != true ){
                    addBall( x , z );
                }
            }
            nextColors();
        }
    }

    function colorCheck(){
        var color;
        if( nextColorStack.length > 0 ){
            color = nextColorStack[0];
            nextColorStack.shift();
            scene.remove(nextBallStack[0]);
            nextBallStack.shift();
        }else{
            color = colors[Math.floor(Math.random() * colors.length)];
        }
        return color
    }

    function addBall( x , z ){

        var geometry = new THREE.SphereGeometry( 35, 35, 35 );

        geometry.verticesNeedUpdate = true;
        geometry.dynamic = true;

        var material = new THREE.MeshLambertMaterial( {color: colorCheck()  } );
        var sphere = new THREE.Mesh( geometry, material );
        sphere.position.x = x;
        sphere.position.y = 40;
        sphere.position.z = z;
        sphere.scale.set( 0, 0, 0 );

        sphere.castShadow = true;
        sphere.receiveShadow = true;
        sphere.bouncing = false;
        scene.add( sphere );
        balls.push(sphere);
        matchSector( sphere, true );

    }

    function matchSector( ball, active){
        var sector = getMapSector( ball.position.x, ball.position.z);
        if( active == true ){
            map[sector.y][sector.x] = 1;
            bussySectors++;
            checkNeighboors( sector, ball );
        }else{
            bussySectors--;
            map[sector.y][sector.x] = 0;
        }

        if( bussySectors > (mapH * mapW) - ballCount && running){
            gameOver(); running = false;
        }

    }

    function checkNeighboors( val, ball ){

        var removeBall = false;
        var i = balls.indexOf(ball);
        if(i != -1) {
            balls.splice(i, 1);
        }

        checkRight( val, ball );
        checkLeft( val, ball );
        removeBall = checkMachedCount(removeBall, ball);
        checkDown( val, ball );
        checkUp( val, ball );
        removeBall = checkMachedCount(removeBall, ball);

        for (var x = val.x + 1, y = val.y + 1; x < mapW, y < mapW; x++, y++) {
            var empty = true;
            for (var bIndex = 0; bIndex < balls.length; bIndex++) {

                if( 900 - ((x * unit) + unit/2 ) == balls[bIndex].position.x
                    && ball != balls[bIndex]
                    && 900 - ((y * unit) + unit/2 ) == balls[bIndex].position.z
                    && ball.material.color.getHex() == balls[bIndex].material.color.getHex()
                ){
                    empty = false;
                    matched.push(balls[bIndex]);
                }
            }
            if( empty ){
                break;
            }
        }

        for (var minusx = val.x - 1, minusy = val.y - 1; minusx > -1, minusy > -1; minusx--,  minusy--) {
            var empty = true;
            for (var bIndex = 0; bIndex < balls.length; bIndex++) {

                if( 900 - ((minusx * unit) + unit/2) == balls[bIndex].position.x
                    && ball != balls[bIndex]
                    && 900 - ((minusy * unit) + unit/2) == balls[bIndex].position.z
                    && ball.material.color.getHex() == balls[bIndex].material.color.getHex()
                ){
                    empty = false;
                    matched.push(balls[bIndex]);
                }
            }
            if( empty ){
                break;
            }
        }
        removeBall = checkMachedCount(removeBall, ball);
        /*-------------------------------------------------------------------------
         ->
         -
         <-
         -------------------------------------------------------------------------*/

        for (var x = val.x + 1, minusy = val.y - 1; x < mapW, minusy > -1; x++, minusy--) {
            var empty = true;
            for (var bIndex = 0; bIndex < balls.length; bIndex++) {

                if( 900 - ((x * unit) + unit/2 ) == balls[bIndex].position.x
                    && ball != balls[bIndex]
                    && 900 - ((minusy * unit) + unit/2) == balls[bIndex].position.z
                    && ball.material.color.getHex() == balls[bIndex].material.color.getHex()
                ){
                    empty = false;
                    matched.push(balls[bIndex]);
                }
            }
            if( empty ){
                break;
            }
        }

        for (var minusx = val.x - 1, y = val.y + 1; minusx > -1, y < mapW; minusx--, y++) {
            var empty = true;
            for (var bIndex = 0; bIndex < balls.length; bIndex++) {

                if( 900 - ((minusx * unit) + unit/2 ) == balls[bIndex].position.x
                    && ball != balls[bIndex]
                    && 900 - ((y * unit) + unit/2 ) == balls[bIndex].position.z
                    && ball.material.color.getHex() == balls[bIndex].material.color.getHex()
                ){
                    empty = false;
                    matched.push(balls[bIndex]);
                }
            }
            if( empty ){
                break;
            }
        }

        /*-------------------------------------------------------------------------*/

        removeBall = checkMachedCount(removeBall, ball);

        if( removeBall ){
            matchSector( ball, false );
            score++;changeScore( score );
            scene.remove(ball);
            ball = null;
            boom = true;
        }else{
            balls.push(ball);
        }
    }


    function explodeAnimation(x,y,z)
    {
        var geometry = new THREE.Geometry();

        for (var i = 0; i < totalObjects; i ++)
        {
            var vertex = new THREE.Vector3();
            vertex.x = x;
            vertex.y = y;
            vertex.z = z;

            geometry.vertices.push( vertex );
            dirs.push({x:(Math.random() * movementSpeed)-(movementSpeed/2),y:(Math.random() * movementSpeed)-(movementSpeed/2),z:(Math.random() * movementSpeed)-(movementSpeed/2)});
        }
        var material = new THREE.PointsMaterial( {
            map: new THREE.TextureLoader().load( 'textures/troll.png' ),
            size: objectSize,
            transparent: true
            //color: colors[Math.round(Math.random() * colors.length)]
        });
        var particles = new THREE.ParticleSystem( geometry, material );

        this.object = particles;
        this.status = true;

        this.xDir = (Math.random() * movementSpeed)-(movementSpeed/2);
        this.yDir = (Math.random() * movementSpeed)-(movementSpeed/2);
        this.zDir = (Math.random() * movementSpeed)-(movementSpeed/2);

        scene.add( this.object  );

        this.update = function(){
            if (this.status == true){
                var pCount = totalObjects;
                while(pCount--) {
                    var particle =  this.object.geometry.vertices[pCount];
                    particle.y += ((dirs[pCount].y) / 3) * 2;
                    particle.x += ((dirs[pCount].x) / 3) * 2;
                    particle.z += ((dirs[pCount].z) / 3) * 2;
                }
                this.object.geometry.verticesNeedUpdate = true;
            }
        }

        setTimeout(function(){
            scene.remove( this.object );
        }, 2000);
    }

    function gameOver(){

        var textMaterial = Physijs.createMaterial(
            new THREE.MeshPhongMaterial({ color: 0xdddddd, shading: THREE.FlatShading })
        );
        var text = new THREE.TextGeometry('GAME OVER', {
            font: textFont,
            size: 90,
            height: 50,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 5,
            bevelSize: 4
        });

        textMesh = new Physijs.BoxMesh( text, textMaterial, 10 );
        textMesh.rotation.y = Math.PI + .025;
        textMesh.rotation.x =( Math.PI / 2)- .25;
        textMesh.position.set(800, 300, 500);
        scene.add( textMesh );

        // $.ajax({
        //     url: '/save-score',
        //     data: {score: score},
        //     success: function (data) {
        //         console.log(data);
        //     }
        // });
    }

    function changeScore( score ){
        if( scoreText != null ){
            scene.remove(scoreText);
        }

        var textMaterial = new THREE.MeshPhongMaterial({
            color: 0xdddddd, shading: THREE.FlatShading
        });
        var text = new THREE.TextGeometry('Score: ' + score, {
            font: textFont,
            size: 90,
            height: 50,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 5,
            bevelSize: 4
        });

        textMesh = new THREE.Mesh( text, textMaterial );
        //textMesh.rotation.y = Math.PI;
        //textMesh.rotation.x = Math.PI / 2;
        textMesh.position.set(680, 40, 920);
        textMesh.rotation.x = -2.0425738412262717;
        textMesh.rotation.z = -Math.PI;
        //textMesh.lookAt(light.position);console.log(textMesh.rotation);
        scoreText = textMesh;
        scene.add( scoreText );
    }

    function createLine( start, end ){

        var material = new THREE.LineBasicMaterial({
            color: 0x0000ff
        });

        var geometry = new THREE.Geometry();
        geometry.verticesNeedUpdate = true;
        geometry.vertices.push(
            new THREE.Vector3( start.x, start.y, start.z ),
            new THREE.Vector3( end.x, end.y, end.z )
        );

        var line = new THREE.Line( geometry, material );
        lines.push(line);
        scene.add( line );

        var particleTexture = THREE.ImageUtils.loadTexture( 'textures/spark.png' );

        particleGroup = new THREE.Object3D();
        particleAttributes = { startSize: [], startPosition: [], randomness: [] };

        var totalParticles = 200;
        var radiusRange = 50;
        for( var i = 0; i < totalParticles; i++ )
        {
            var spriteMaterial = new THREE.SpriteMaterial( { map: particleTexture, useScreenCoordinates: false, color: 0xffffff } );

            var sprite = new THREE.Sprite( spriteMaterial );
            sprite.scale.set( 16, 16, 1.0 );
            sprite.position.set(  Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 );

            sprite.position.setLength( radiusRange * (Math.random() * 0.1 + 0.9) );

            sprite.material.color.setHSL( Math.random(), 0.9, 0.7 );

            sprite.material.blending = THREE.AdditiveBlending;

            particleGroup.add( sprite );

            particleAttributes.startPosition.push( sprite.position.clone() );
            particleAttributes.randomness.push( Math.random() );
        }
        particleGroup.position.set( start.x, start.y, start.z );
        particleGroup.rotation.x = Math.PI / 2;
        scene.add( particleGroup );
        dust.push(particleGroup);

    }

    function nextColors(){

        //if( nextColorStack.length != 0 ){
        //    nextColorStack.length = 0;
        //    nextBallStack.forEach(function(b){
        //        scene.remove(b);
        //    });
        //    nextBallStack.length = 0;
        //}


        for( var i = 0; i < ballCount; i++){
            var color = colors[Math.floor(Math.random() * colors.length)];
            nextColorStack.push(color);

            var geometry = new THREE.SphereGeometry( 35, 35, 35 );
            var material = Physijs.createMaterial( new THREE.MeshLambertMaterial( {color: color  } ), 3.2, 1.6 );
            var sphere = new Physijs.BoxMesh(geometry, material, 0 );
            sphere.position.x = -75;
            sphere.position.y = 40;
            sphere.position.z = 800 - i * 100;

            sphere.addEventListener('collision', function( other_object ) {

            });

            //buildFloor( scene, -1, 7 - i );

            sphere.scale.set( 0, 0, 0 );
            scene.add( sphere );
            nextBallStack.push(sphere);
        }
    }

    function checkMachedCount(removeBall, ball){
        var seconds = Math.round( new Date().getTime() / 1000 );

        if( seconds > bonusTime ){
            ballsToCollect = 3;
        }
        if( matched.length > ballsToCollect ){
            combinations++;
            var delta = Math.round(clock.getDelta());
            if( combinations == 5 && delta < 50){

                if( bonusTime > seconds ){
                    bonusTime += 30;
                }else{
                    bonusTime = seconds + 30;
                }
                ballsToCollect = 2;
                combinations = 0;
                //animateBonusTime( bonusTime )
            }


            matched.forEach(function(m){
                matchSector( m, false );
                var i = balls.indexOf(m);
                if(i != -1) {
                    balls.splice(i, 1);
                }
                score++;changeScore( score );
                scene.remove(m);
            });
            parts.push(new explodeAnimation(ball.position.x, ball.position.y, ball.position.z));
            removeBall = true;
        }
        matched.length = 0;
        return removeBall;
    }

    function animateBonusTime( bonusTime ){

        for( var i = 0; i < 60; i++){
            (function (x) {
                setTimeout(function () {
                    addTimer( x );
                },x * 1000);
            })(i);
        }
    }

    function addTimer( x ){


        if( prevSecond != null ){

            scene.remove(prevSecond);
        }

        var textMaterial = new THREE.MeshPhongMaterial({
            color: 0xdddddd, shading: THREE.FlatShading
        });
        var text = new THREE.TextGeometry( x, {
            font: textFont,
            size: 90,
            height: 50,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 5,
            bevelSize: 4
        });

        textMesh = new THREE.Mesh( text, textMaterial );
        textMesh.position.set(1100, 40, 720);
        textMesh.rotation.x = -1.92;
        textMesh.rotation.z = -Math.PI  ;
        textMesh.rotation.y = -0.16;
        textMesh.name = 'TimerMesh';
        prevSecond = textMesh;
        scene.add( prevSecond );

        if( x == 1 ){
            setTimeout(function () {
                scene.remove(prevSecond);
                bonusTime = 0;
            }, 1000);
        }
    }

    function bounceTimer(){
        if( prevSecond ){
            prevSecond.position.x -= 1;
            prevSecond.position.y += 3;
            prevSecond.position.z -= 1.20;
        }
    }

    function buildWalls(){

        var imagePrefix = "textures/dawnmountain-";
        var directions  = ["xpos", "xneg", "ypos", "yneg", "zpos", "zneg"]; //yneg apaksa
        var imageSuffix = ".png";
        var skyGeometry = new THREE.CubeGeometry( 5000, 5000, 5000 );

        var materialArray = [];
        for (var i = 0; i < 6; i++)
            materialArray.push( new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load( imagePrefix + directions[i] + imageSuffix ),
                side: THREE.BackSide
            }));
        var skyMaterial = new THREE.MeshFaceMaterial( materialArray );
        skyBox = new THREE.Mesh( skyGeometry, skyMaterial );
        skyBox.rotation.x = Math.PI / 2;
        scene.add( skyBox );

    }

    function checkRight( val, ball ){
        for (var x = val.x + 1; x < mapW; x++) {
            var empty = true;
            for (var bIndex = 0; bIndex < balls.length; bIndex++) {

                if( 900 - ((x * unit) + unit/2 ) == balls[bIndex].position.x
                    && ball != balls[bIndex]
                    && ball.position.z == balls[bIndex].position.z
                    && ball.material.color.getHex() == balls[bIndex].material.color.getHex()
                ){
                    empty = false;
                    matched.push(balls[bIndex]);
                }
            }
            if( empty ){
                break;
            }
        }
    }

    function checkLeft( val, ball ){
        for (var minusx = val.x - 1; minusx > -1; minusx--) {
            var empty = true;
            for (var bIndex = 0; bIndex < balls.length; bIndex++) {

                if( 900 - ((minusx * unit) + unit/2) == balls[bIndex].position.x
                    && ball != balls[bIndex]
                    && ball.position.z == balls[bIndex].position.z
                    && ball.material.color.getHex() == balls[bIndex].material.color.getHex()
                ){
                    empty = false;
                    matched.push(balls[bIndex]);
                }
            }
            if( empty ){
                break;
            }
        }
    }

    function checkDown( val, ball ){
        for (var y = val.y + 1; y < mapW; y++) {
            var empty = true;
            for (var bIndex = 0; bIndex < balls.length; bIndex++) {
                if( 900 - ((y * unit) + unit/2 ) == balls[bIndex].position.z
                    && ball != balls[bIndex]
                    && ball.position.x == balls[bIndex].position.x
                    && ball.material.color.getHex() == balls[bIndex].material.color.getHex()
                ){
                    empty = false;
                    matched.push(balls[bIndex]);
                }
            }
            if( empty ){
                break;
            }
        }
    }

    function checkUp( val, ball ){
        for (var minusy = val.y - 1; minusy > -1; minusy--) {
            var empty = true;
            for (var bIndex = 0; bIndex < balls.length; bIndex++) {

                if( 900 - ((minusy * unit) + unit/2) == balls[bIndex].position.z
                    && ball != balls[bIndex]
                    && ball.position.x == balls[bIndex].position.x
                    && ball.material.color.getHex() == balls[bIndex].material.color.getHex()
                ){
                    empty = false;
                    matched.push(balls[bIndex]);
                }
            }
            if( empty ){
                break;
            }
        }
    }
    //
    function createBubbles(start, end, step ){


        var c = 100 / step;
        step = (step + (100 - c)) / 5;

        for( var i = 0; i < step; i++){
            var sphereGeometry = new THREE.SphereGeometry( 3 * Math.random() - 3 );
            var d = new THREE.Mesh( sphereGeometry, dustMaterial );
            d.position.x = start.x + ( 60 * Math.random() - 30 );
            d.position.y = start.y + ( 60 * Math.random() - 30 );
            d.position.z = start.z + ( 60 * Math.random() - 30 );
            scene.add(d);
            dust.push(d);
        }

        if( dust.length != 0 ){

            var time = 4 * clock.getElapsedTime();
            dust.forEach(function(d){
                d.position.x = d.position.x + (6 * Math.random() - 3);
                d.position.y = d.position.y - (.5 * Math.random());
                d.position.z = d.position.z +(6 * Math.random() - 3);
                d.rotation.y = time * 0.75;
            });

            for( var i = 0; i < dust.length; i++ ){
                (function (x) {
                    setTimeout(function(){
                        scene.remove(dust[x]);
                    }, (Math.random() * 3 ) * 200);
                })(i);
            }

        }
    }

    function buildCup() {
        var loader = new THREE.ObjectLoader();
        loader.load("textures/cup.json",function ( obj ) {
            obj.position.set(-300, 0, 100);
            scene.add( obj );
        });

    }
});

window.onload = function(){
    if( document.getElementById("game-container") ){
        example();
    }
};

