// From https://stackoverflow.com/a/10865042/2689797
Array.prototype.flatten = function() {
    return [].concat.apply([], this);
};

var Histogram = function(xbins, xmin, xmax,
                         ybins, ymin, ymax) {
    this.xbins = xbins;
    this.xmin = xmin;
    this.xmax = xmax;
    this.ybins = ybins;
    this.ymin = ymin;
    this.ymax = ymax;

    this.clear();
};

Histogram.prototype.clear = function() {
    this.data = Array(this.xbins * this.ybins).fill(0);
};

Histogram.prototype.fill = function(x,y) {
    if(x < this.xmin ||
       x > this.xmax ||
       y < this.ymin ||
       y > this.ymax) {
        return;
    }

    var i = Math.floor(this.xbins * (x-this.xmin) / (this.xmax - this.xmin));
    var j = Math.floor(this.ybins * (y-this.ymin) / (this.ymax - this.ymin));
    var index = j*this.xbins + i;

    this.data[index]++;
};

Histogram.prototype.normalized = function() {
    var max = this.data.reduce((a,b) => Math.max(a,b),
                               0);
    return this.data.map(x => x/max);
};

var MandelbrotPoint = function(real, imag) {
    this.orig_real = real;
    this.orig_imag = imag;

    this.real = real;
    this.imag = imag;

    this.iter = 0;
    this.diverged = false;
};

MandelbrotPoint.prototype.iterate = function() {
    if(this.diverged) {
        return;
    }

    var sq_real = this.real*this.real - this.imag*this.imag;
    var sq_imag = 2*this.real*this.imag;

    this.real = sq_real + this.orig_real;
    this.imag = sq_imag + this.orig_imag;
    this.iter += 1;

    if(this.magnitude() > 2) {
        this.diverged = true;
    }
};

MandelbrotPoint.prototype.magnitude = function() {
    return this.real*this.real + this.imag*this.imag;
};

MandelbrotPoint.prototype.go_until = function(max_iter) {
    while(this.iter < max_iter &&
          !this.diverged) {
        this.iterate();
    }
};


var Buddhabrot = function(n_points_x, n_points_y) {
    // Range of mandelbrot set.
    var xmin = -2;
    var xmax = +2;

    var ymin = -2;
    var ymax = +2;

    this.mandelbrot =
        Array(n_points_x)
        .fill(null)
        .map( (_,i) =>
              Array(n_points_y)
              .fill(null)
              .map( (_,j) =>
                    new MandelbrotPoint(
                        xmin + (xmax-xmin)*(i/n_points_x),
                        ymin + (ymax-ymin)*(j/n_points_y)))).flatten();
};

Buddhabrot.prototype.iterate = function() {
    this.mandelbrot.forEach(
        point => point.iterate()
    );
};

Buddhabrot.prototype.draw = function(canvas) {
    // Limits of the view window.
    // Not necessarily those of the iterated points.
    var xmin = -2;
    var xmax = +2;
    var ymin = -2;
    var ymax = +2;

    width = canvas.width;
    height = canvas.height;

    context = canvas.getContext('2d');


    //img_data.data.fill(255);

    // function get_index(x,y) {
    //     var i = Math.floor(width *  (x-xmin) / (xmax-xmin) );
    //     var j = Math.floor(height * (y-ymin) / (ymax-ymin) );

    //     return 4*(j*img_data.width + i);
    // }

    var hist = new Histogram(width, xmin, xmax,
                             height, ymin, ymax);
    hist.clear();
    this.mandelbrot
        .filter(point => !point.diverged)
        .forEach(function(point) {
            hist.fill(point.orig_real, point.orig_imag);
        });
    var img_data = context.createImageData(width, height);
    hist.normalized().forEach((val,i) => {
        img_data.data[4*i+0] = 255*(1-val);
        img_data.data[4*i+1] = 255*(1-val);
        img_data.data[4*i+2] = 255*(1-val);
        img_data.data[4*i+3] = 255;
    });
    context.putImageData(img_data, 0, 0);




    hist.clear();
    this.mandelbrot
        .filter(point => !point.diverged)
        .forEach(function(point) {
            hist.fill(point.real, point.imag);
        });
    var img_data = context.createImageData(width, height);
    hist.normalized().forEach((val,i) => {
        img_data.data[4*i+0] = 255;
        img_data.data[4*i+1] = 0;
        img_data.data[4*i+2] = 0;
        img_data.data[4*i+3] = 255*val;
    });
    createImageBitmap(img_data).then(function(bitmap) {
        context.drawImage(bitmap, 0, 0);
    });
    //context.putImageData(img_data, 0, 0);


    // this.mandelbrot
    //     .filter(point => !point.diverged)
    //     .map(point => {return {x: point.orig_real,
    //                            y: point.orig_imag} })
    // n    .forEach(point => {
    //         var index = get_index(point.x, point.y);

    //         var color = {r: 0,
    //                      g: 0,
    //                      b: 0,
    //                      a: 255};

    //         img_data.data[index+0] = color.r;
    //         img_data.data[index+1] = color.g;
    //         img_data.data[index+2] = color.b;
    //         img_data.data[index+3] = color.a;
    //     });

    // this.mandelbrot
    //     .filter(point => !point.diverged)
    //     .map(point => {return {x: point.real,
    //                            y: point.imag} })
    //     .forEach(point => {
    //         var index = get_index(point.x, point.y);

    //         var color = {r: 255,
    //                      g: 0,
    //                      b: 0,
    //                      a: 255};

    //         img_data.data[index+0] = color.r;
    //         img_data.data[index+1] = color.g;
    //         img_data.data[index+2] = color.b;
    //         img_data.data[index+3] = color.a;
    //     });

    //context.putImageData(img_data, 0, 0);
};

var canvas = document.getElementById('buddhabrot-canvas');
var buddha = new Buddhabrot(4*canvas.width, 4*canvas.height);

var i = 0;
function iter() {
    buddha.iterate();
    buddha.draw(canvas);
    i++;
    console.log(i);
    if(i < 100) {
        window.setTimeout(iter, 0);
    }
}
iter();
