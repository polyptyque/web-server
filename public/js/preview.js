jQuery(document).ready(function($){

    var position = 9,
        min = 0,
        center = 9,
        max = 18,
        side = max-center,
        width, height, ratio,
        wrapper = $('.demo-wrapper'),
        uid = wrapper.data('uid'),
        imgBaseUrl = '/uploads/'+uid+'/',
        $canvas = $('canvas'),
        canvas = $canvas.get(0),
        ctx = canvas.getContext('2d'),
        images = [],
        patterns = [];

    function Setup(){
        LoadImage(min,function(){
            Resize();
            $(window).resize(Resize);
        });
    }

    function Resize(){
        width = wrapper.width();
        height = wrapper.height();
        ratio = width/height;
        ctx.canvas.width = width;
        ctx.canvas.height = height;
        patterns = [];
        DrawImage(position);
    }

    function DrawImage(i){
        var pattern = patterns[i];
        if(!pattern) {
            var img = images[i],
                imgWidth = img.naturalWidth || 720,
                imgHeight = img.naturalHeight || 1280;
            console.log(img.src, imgWidth, imgHeight);
            ctx.clearRect(0,0,width,height);
            var imgRatio = imgWidth/imgHeight,
                scaleY = imgRatio / ratio,
                vCrop = imgRatio < ratio,
                targetHeight = Math.round(vCrop ? imgHeight : imgHeight*scaleY),
                targetY = Math.round((imgHeight-targetHeight)/2),
                targetWidth = Math.round(vCrop ? imgWidth/scaleY : imgWidth),
                targetX = Math.round((imgWidth - targetWidth)/2),
                offsetX = 0, offsetY = 0,
                destWidth = width,
                destHeight = height;
            if(targetX < 0){
                targetX = 0;
                targetWidth = imgWidth;
                destWidth = Math.round(height*imgRatio);
                offsetX = Math.round((width-destWidth)/2);
                console.log(targetX);
                console.log(imgWidth,targetWidth,destWidth);
            }else if(targetY<0){
                targetY = 0;
                targetHeight = imgHeight;
                destHeight = Math.round(width/imgRatio);
                offsetY = Math.round((height-destHeight)/2);
            }
            ctx.fillStyle = 'red';
            //ctx.fillRect(offsetX,offsetY,destWidth,destHeight);
            ctx.drawImage(img,targetX,targetY,targetWidth,targetHeight,offsetX,offsetY,destWidth,destHeight);
            pattern = ctx.createPattern(canvas,'repeat');
            patterns[i] = pattern;
        }else{
            ctx.fillStyle = pattern;
            ctx.fillRect(0,0,width,height);
        }
    }

    function SetImage(i){
        if(i!=position){
            position = i;
            DrawImage(i);
        }
    }

    function LoadImage(i,callback){
        var imgUrl = imgBaseUrl+i+'.jpg',
            img = new Image();
        console.log(imgUrl);
        function onLoad(e){
            if(e.type == "error"){
                var defaultCanvas = document.createElement('canvas');
                defaultCanvas.width = 720;
                defaultCanvas.height = 1280;
                var ctx = canvas.getContext("2d");
                ctx.rect(0, 0, defaultCanvas.width, defaultCanvas.height);
                ctx.fillStyle = "red";
                ctx.fill();
                ctx.rect(20, 20, defaultCanvas.width-40, defaultCanvas.height-40);
                ctx.fillStyle = "black";
                ctx.fill();
            }else{
                images[i] = img;
            }
            if(i<max){
                LoadImage(i+1,callback);
            }else{
                callback();
            }
        }
        img.addEventListener('load',onLoad);
        img.addEventListener('error',onLoad);
        img.src = imgUrl;
    }
    if (window.DeviceMotionEvent==undefined) {
        // pas de support de devicemotion
        //console.log('mouse');

    }else{
        function deviceOrientationHandler(event) {
            var alpha = event.alpha || 0,
                beta = event.beta || 0,
                gamma = event.gamma || 0;
            //$('.alpha').text(alpha);
            //$('.beta').text(beta);
            //$('.gamma').text(gamma);
            //console.log(event)
            if(alpha){
                var axe = gamma;
                switch(location.hash){
                    case "#beta":  axe = beta; break;
                    case "#alpha":  axe = alpha; break;
                    case "#gamma":  axe = gamma; break;
                }
                console.log(location.hash)
                //var axe = ratio < 1 ? gamma : beta;
                var n = (Math.min(Math.max(-1,axe/-20),1)+1)/2;
                var id = Math.round(center + ((n-1/2)*side*2));
                console.log(id,n)
                SetImage(id);
            }
        }
        window.addEventListener('deviceorientation', deviceOrientationHandler, false);
        deviceOrientationHandler({});
    }

    Setup();

});