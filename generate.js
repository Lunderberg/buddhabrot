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


var Buddhabrot = function(canvas, n_points_x, n_points_y) {
    // Range of mandelbrot set.
    this.xmin = -2;
    this.xmax = +2;
    this.ymin = -2;
    this.ymax = +2;

    this.n_points_x = n_points_x;
    this.n_points_y = n_points_y;

    this.canvas = canvas;


    this.stop_next = false;
    this.running = false;

    this.display_iteration_num = null;
    this.display_generation_stage = null;

    // Limits of the view window.
    // Not necessarily those of the iterated points.
    var xmin = -2;
    var xmax = +2;
    var ymin = -2;
    var ymax = +2;
    var width = this.canvas.width;
    var height = this.canvas.height;
    this.hist_mandelbrot = new Histogram(width, xmin, xmax,
                                         height, ymin, ymax);
    this.hist_all = new Histogram(width, xmin, xmax,
                                  height, ymin, ymax);
    this.hist_diverged = new Histogram(width, xmin, xmax,
                                       height, ymin, ymax);

    this.reset();
};

Buddhabrot.prototype.start = function() {
    if(!this.running) {
        this.running = true;
        this.callback();
    }
};

Buddhabrot.prototype.stop = function() {
    if(this.running) {
        this.stop_next = true;
    }
};

Buddhabrot.prototype.reset = function() {
    this.iter_since_redraw = 0;
    this.num_iterations = 0;

    this.mandelbrot =
        Array(this.n_points_x)
        .fill(null)
        .map( (_,i) =>
              Array(this.n_points_y)
              .fill(null)
              .map( (_,j) =>
                    new MandelbrotPoint(
                        this.xmin + (this.xmax-this.xmin)*(i/this.n_points_x),
                        this.ymin + (this.ymax-this.ymin)*(j/this.n_points_y)))).flatten();

    this.hist_mandelbrot.clear();
    this.hist_all.clear();
    this.hist_diverged.clear();
    this.current_stage = 'Preliminary';
};

Buddhabrot.prototype.enter_final_stage = function() {
    this.num_iterations = 0;
    this.current_stage = 'Final';

    this.mandelbrot = this.mandelbrot
        .filter(point => point.diverged)
        .map( point => new MandelbrotPoint(
            point.orig_real, point.orig_imag
        ));
};

Buddhabrot.prototype.callback = function() {
    var max_iter = document.getElementById('num-iterations').value;
    var update_every = document.getElementById('redraw-every').value;
    var delay = document.getElementById('delay').value;

    if(this.stop_next ||
       (this.num_iterations > max_iter && this.current_stage === 'Final')) {
        this.running = false;
        this.stop_next = false;
        return;
    }

    if(this.num_iterations > max_iter && this.current_stage === 'Preliminary') {
        this.enter_final_stage();
    }

    this.iterate();

    if(this.current_stage === 'Preliminary') {
        this.update_histograms_preliminary();
    } else if(this.current_stage === 'Final') {
        this.update_histograms_final();
    }


    if(this.iter_since_redraw > update_every) {
        this.draw();
    }

    window.setTimeout( () => {this.callback();}, delay);
};

Buddhabrot.prototype.iterate = function() {
    this.mandelbrot.forEach(
        point => point.iterate()
    );
    this.iter_since_redraw++;
    this.num_iterations++;

    if(this.display_iteration_num !== null) {
        this.display_iteration_num.innerHTML = this.num_iterations;
    }

};

Buddhabrot.prototype.update_histograms_preliminary = function() {
    this.hist_mandelbrot.clear();
    this.mandelbrot
        .filter(point => !point.diverged)
        .forEach((point) => {
            this.hist_mandelbrot.fill(point.orig_real, point.orig_imag);
            this.hist_all.fill(point.real, point.imag);
        });
};

Buddhabrot.prototype.update_histograms_final = function() {
    this.mandelbrot
        .filter(point => !point.diverged)
        .forEach((point) => {
            this.hist_diverged.fill(point.real, point.imag);
        });
};

Buddhabrot.prototype.draw = function() {
    context = this.canvas.getContext('2d');

    var img_data = context.createImageData(this.canvas.width, this.canvas.height);
    this.hist_mandelbrot.normalized().forEach((val,i) => {
        img_data.data[4*i+0] = 255*(1-val);
        img_data.data[4*i+1] = 255*(1-val);
        img_data.data[4*i+2] = 255*(1-val);
        img_data.data[4*i+3] = 255;
    });
    createImageBitmap(img_data).then(function(bitmap) {
        context.drawImage(bitmap, 0, 0);
    });


    var img_data = context.createImageData(this.canvas.width, this.canvas.height);
    this.hist_all.normalized().forEach((val,i) => {
        img_data.data[4*i+0] = 255;
        img_data.data[4*i+1] = 0;
        img_data.data[4*i+2] = 0;
        img_data.data[4*i+3] = 255*val;
    });
    createImageBitmap(img_data).then(function(bitmap) {
        context.drawImage(bitmap, 0, 0);
    });


    var img_data = context.createImageData(this.canvas.width, this.canvas.height);
    this.hist_diverged.normalized().forEach((val,i) => {
        img_data.data[4*i+0] = 0;
        img_data.data[4*i+1] = 0;
        img_data.data[4*i+2] = 255;
        img_data.data[4*i+3] = 255*val;
    });
    createImageBitmap(img_data).then(function(bitmap) {
        context.drawImage(bitmap, 0, 0);
    });


    this.iter_since_redraw = 0;
};

var canvas = document.getElementById('buddhabrot-canvas');
var buddha = new Buddhabrot(canvas, 4*canvas.width, 4*canvas.height);
buddha.display_iteration_num = document.getElementById('iteration-num');
buddha.display_generation_stage = document.getElementById('generation-stage');
buddha.start();


document.getElementById('button-start').addEventListener(
    'click',
    function() { buddha.start(); }
);

document.getElementById('button-stop').addEventListener(
    'click',
    function() { buddha.stop(); }
);

document.getElementById('button-reset').addEventListener(
    'click',
    function() { buddha.reset(); }
);
