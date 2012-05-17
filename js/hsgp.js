

// FIXME: improve class
// Used for both Layout-related and Canvas-related coordinates
function Point(x_, y_) {
    this.x = x_;
    this.y = y_;

    this.valid = function () {
        return (this.x >= 0 && this.y >= 0);
    }
}



function HSGPCanvas(canvas) {
    this._init(canvas);
}

HSGPCanvas.prototype = {
    _init : function (canvas) {
        this.canvasElement = canvas;
        this.canvas = this.canvasElement.getContext("2d");
        this.stateValues = new StateValues(4);
        this.updateStateValues();
    },

    updateStateValues : function (values) {
        if (values !== null && values !== undefined) {
            this.stateValues.setValues(values);
        }
        this.layout = new RecursiveLayout(this.stateValues.dimensions, this.stateValues.numStates);
        this.colours = new ColourHandler(this.stateValues);
        this.highlights = [];
        this.selected = null;

        this.canvasSizeChanged();
    },

    updateHighlights : function (highlights) {
        this.highlights = highlights;
    },

    setSelectedPoint : function (point) {
        if (point !== null && point.valid()) {
            this.selected = point;
        }
        else {
            this.selected = null;
        }
    },

    getSelectedState : function () {
        if (this.selected !== null && this.selected.valid()) {
            return this.layout.pointToState(this.selected);
        }
        return null;
    },

    draw : function () {
        this.canvas.fillStyle = "black";
        this.canvas.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        this.drawBase();
        this.drawHighlights();
    },

    canvasSizeChanged : function () {
        var width = this.canvasElement.width;
        var height = this.canvasElement.height;
        var grid = new Grid(this.layout.width, this.layout.height);
        var totalGridWidth = grid.summedLineWidths[grid.summedLineWidths.length - 1];
        var totalGridHeight = grid.summedLineHeights[grid.summedLineHeights.length - 1];
        this.pointWidth = Math.floor((width - totalGridWidth) / this.layout.width);
        this.pointHeight = Math.floor((height - totalGridHeight) / this.layout.height);

        this.xIndexCoord = new Array(this.layout.width + 1);
        for (var i = 0; i < this.layout.width; i++) {
            this.xIndexCoord[i] = (i * this.pointWidth) + grid.summedLineWidths[i];
        }
        this.xIndexCoord[this.layout.width] = this.xIndexCoord[this.layout.width - 1] + this.pointWidth;

        this.yIndexCoord = new Array(this.layout.height + 1);
        for (var i = 0; i < this.layout.height; i++) {
            this.yIndexCoord[i] = (i * this.pointHeight) + grid.summedLineHeights[i];
        }
        this.yIndexCoord[this.layout.height] = this.yIndexCoord[this.layout.height - 1] + this.pointHeight;
        this.draw();
    },

    drawBase : function () {
        for (var i = 0, len = this.stateValues.states.length; i < len; ++i) {
            var state = this.stateValues.states[i];
            var stateValue = this.stateValues.valueInt(i);
            var coord = this.layoutToCanvas(this.layout.stateToPoint(state));
            this.canvas.fillStyle = this.colours.grey(stateValue);
            this.canvas.fillRect(coord.x, coord.y, this.pointWidth, this.pointHeight);
        }
    },

    drawHighlights : function () {
        var targetValue = 0;
        if (this.selected !== null && this.selected.valid ()) {
            targetValue = this.stateValues.value(this.layout.pointToState(this.selected));
            var coord = this.layoutToCanvas(this.selected);
            this.canvas.fillStyle = this.colours.green(targetValue);
            this.canvas.fillRect(coord.x, coord.y, this.pointWidth, this.pointHeight);
        }

        for (var i = 0, len = this.highlights.length; i < len; i++) {
            var col;
            var point = this.layout.stateToPoint(this.highlights[i]);
            var value = this.stateValues.value(this.highlights[i]);

            if (value === targetValue) {
                col = this.colours.blue(value);
            }
            else {
                col = this.colours.red(value);
            }

            var coord = this.layoutToCanvas(point);
            this.canvas.fillStyle = col;
            this.canvas.fillRect(coord.x, coord.y, this.pointWidth, this.pointHeight);
        }
    },

    layoutToCanvas : function (point) {
        return new Point(this.xIndexCoord[point.x], this.yIndexCoord[point.y]);
    },

    canvasToLayout : function (coord) {
        if (coord.x < 0 || coord.y < 0 ||
            coord.x > this.xIndexCoord[this.xIndexCoord.length - 1] ||
            coord.y > this.yIndexCoord[this.yIndexCoord.length - 1]) {
            return null;
        }
        var x = 0, y = 0;
        while (coord.x > this.xIndexCoord[x + 1]) {
            x++;
        }
        while (coord.y > this.yIndexCoord[y + 1]) {
            y++;
        }
        return new Point(x, y);
    }
};



function StateValues(dimensions) {
    this._init(dimensions);
}

StateValues.prototype = {
    _init : function (dimensions) {
        var values = new Array(1 << dimensions);
        for (var i = 0, len = values.length; i < len; ++i) {
            values[i] = Math.floor(Math.random() * 4);
        }
        this.setValues(values);
    },

    setValues : function (values_) {
        this.values = values_;
        this.minValue = Math.min.apply(null, values_);
        this.maxValue = Math.max.apply(null, values_);
        this.numStates = values_.length;
        this.dimensions = Math.round(Math.log(this.numStates) / Math.log(2));

        this.states = new Array(this.numStates);
        for (var i = 0, len = this.numStates; i < len; ++i) {
            this.states[i] = State.fromInt(this.dimensions, i);
        }
    },

    value : function (state) {
        return this.values[State.asInt(state)];
    },

    valueInt : function (integer) {
        return this.values[integer];
    }
};



function RecursiveLayout(dimensions) {
    this._init(dimensions);
}

RecursiveLayout.prototype = {
    _init : function (dimensions) {
        this.dims = dimensions;
        this.widthDims = (this.dims + this.dims % 2) / 2;
        this.heightDims = (this.dims - this.dims % 2) / 2
        this.width = 1 << this.widthDims;
        this.height = 1 << this.heightDims;
    },

    stateToPoint : function (state) {
        if (state.length !== this.dims) {
            return null;
        }
        var x = 0, y = 0;
        for (var i = 0; i < this.dims; ++i) {
            if (state[i]) {
                if (i % 2 === 0) {
                    x += 1 << (i / 2);
                }
                else {
                    y += 1 << ((i - 1) / 2);
                }
            }
        }
        return new Point(x, y);
    },

    pointToState : function (point) {
        if (point.x > this.width - 1 || point.y > this.height - 1 ||
            point.x < 0 || point.y < 0) {
            return null;
        }
        var state = new Array(this.dims);
        for (var i = 0; i < this.widthDims; ++i) {
            state[i * 2] = Boolean(point.x & 1 << i);
        }
        for (var i = 0; i < this.heightDims; ++i) {
            state[i * 2 + 1] = Boolean(point.y & 1 << i);
        }
        return state;
    }
};



function Grid(width, height) {
    this._init(width, height);
}

Grid.prototype = {
    _init : function (width, height) {
        var borderWidth = 4;
        var widthDimension = Math.log(width) / Math.LN2;
        var heightDimension = Math.log(height) / Math.LN2;

        this.summedLineWidths = new Array(width + 1);
        this.summedLineWidths[0] = borderWidth;
        for (var i = 1; i < width; ++i) {
            this.summedLineWidths[i] = this.summedLineWidths[i - 1];
            for (var j = 0; j < widthDimension; j++) {
                if (i % (1 << j) === 0) {
                    this.summedLineWidths[i] += 2;
                }
            }
        }
        this.summedLineWidths[width] = this.summedLineWidths[i - 1] + borderWidth;

        this.summedLineHeights = new Array(height + 1);
        this.summedLineHeights[0] = borderWidth;
        for (var i = 1; i < height; ++i) {
            this.summedLineHeights[i] = this.summedLineHeights[i - 1];
            for (var j = 0; j < heightDimension; j++) {
                if (i % (1 << j) === 0) {
                    this.summedLineHeights[i] += 2;
                }
            }
        }
        this.summedLineHeights[height] = this.summedLineHeights[i - 1] + borderWidth;
    }
};



function ColourHandler(view) {
    this._init(view);
}

ColourHandler.prototype = {
    _init : function (view) {
        this.gridLevelOffset = 0.3; // Grey level offset to distinguish bottom level from gridlines
        this.minValue = view.minValue;
        this.maxValue = view.maxValue;
    },

    getLevel : function (value) {
        var lvl;
        if (this.maxValue === this.minValue) {
            return 1.0;
        }
        lvl = this.gridLevelOffset + (1 - this.gridLevelOffset) *
            ((value - this.minValue) / (this.maxValue - this.minValue));
        return lvl;
    },

    grey : function (value) {
        var lvl = Math.floor(255 * this.getLevel(value));
        return "rgb(" + lvl + "," + lvl + "," + lvl + ")";
    },

    red : function (value) {
        var lvl = Math.floor(127 * this.getLevel(value));
        return "rgb(255," + lvl + "," + lvl + ")";
    },

    green : function (value) {
        var lvl = Math.floor(127 * this.getLevel(value));
        return "rgb(" + lvl + ",255," + lvl + ")";
    },

    blue : function (value) {
        var lvl = Math.floor(127 * this.getLevel(value));
        return "rgb(" + lvl + "," + lvl + ",255)";
    }
};
