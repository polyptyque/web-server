jQuery(document).ready(function($){

    var position = 10,
        min = 1,
        center = 10,
        max = 19,
        side = max-center,
        width, height, ratio,
        wrapper = $('.demo-wrapper'),
        imgBaseUrl = wrapper.data('imgbaseurl'),
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
                imgWidth = img.naturalWidth,
                imgHeight = img.naturalHeight;
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
        var n = i == center ? '0':
                i < center ? 'r' + (center-i) :
                             'l' + (i-center),
            imgUrl = imgBaseUrl+n+'.jpg',
            img = new Image();
        function onLoad(e){
            if(e.type == "error") return;
            images[i] = img;
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
    // $(window).on('mousemove',function(e){
    //     var n = e.pageX/wrapper.width(),
    //         id = Math.round(center + ((n-1/2)*side*2));
    //     SetImage(id);
    // });
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
                var axe = ratio < 1 ? gamma : beta;
                var n = (Math.min(Math.max(-1,axe/-40),1)+1)/2;
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