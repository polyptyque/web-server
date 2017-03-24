jQuery(document).ready(function($){

    var position = 10,
        min = 1,
        center = 10,
        max = 19,
        side = max-center,
        wrapper = $('.demo-wrapper'),
        img = $('img');

    function LoadImage(id){
        console.log(id);
        img.attr('src','img/demo/'+id+'.jpg')
    }
    $(window).on('mousemove',function(e){
        var n = e.pageX/wrapper.width(),
            id = Math.round(center + ((n-1/2)*side*2));
        LoadImage(id);
    });
    if (window.DeviceMotionEvent==undefined) {
        // pas de support de devicemotion
        console.log('mouse');

    }else{
        var ax,ay,az,
            rotation,
            arAlpha,
            arBeta,
            arGamma
        window.ondevicemotion = function(e) {
            ax = event.accelerationIncludingGravity.x
            ay = event.accelerationIncludingGravity.y
            az = event.accelerationIncludingGravity.z
            rotation = event.rotationRate;
            if (rotation != null) {
                arAlpha = Math.round(rotation.alpha);
                arBeta = Math.round(rotation.beta);
                arGamma = Math.round(rotation.gamma);
            }
        }
    }

    LoadImage(position);

});