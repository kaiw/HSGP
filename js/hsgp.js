"use strict";


function HSGPCanvas(canvas) {
    this._init(canvas);
}

HSGPCanvas.prototype = {

    _init : function (canvas) {
        this.canvasElement = canvas;
        this.stateValues = new StateValues(4);
        this.updateStateValues();
    },

    updateStateValues : function (values) {
        if (values !== null && values !== undefined) {
            this.stateValues.setValues(values);
        }
        this.layout = new RecursiveLayout(this.stateValues.dimensions,
                                          this.stateValues.numStates);
        this.colours = new ColourHandler(this.stateValues);
        this.highlights = [];
        this.selected = null;

        this.canvasSizeChanged();
    },

    updateHighlights : function () {
        var selectedState = this.getSelectedState();
        if (selectedState === null) {
            this.highlights = [];
            // FIXME: jquery brokenness
            $("#SelectedStateLabel").html("None");
        }
        else {
            this.highlights = State.neighbours(selectedState);
            $("#SelectedStateLabel").html("[" + State.toString(selectedState) + "]");
        }

        this.draw();
    },

    validPoint : function (point) {
        if (point === null || point === undefined ||
            point.x < 0 || point.y < 0 ||
            point.x > _.last(this.xIndexCoord) ||
            point.y > _.last(this.yIndexCoord)) {
            return false;
        }
        return true;
    },

    setSelectedPoint : function (point) {
        this.selected = this.validPoint(point) ? point : null;
        this.updateHighlights();
    },

    getSelectedState : function () {
        if (this.validPoint(this.selected)) {
            return this.layout.pointToState(this.selected);
        }
        return null;
    },

    canvasSizeChanged : function () {
        var i,
            width = this.canvasElement.width,
            height = this.canvasElement.height,
            grid = this.calculateGrid(this.layout.width, this.layout.height);
        var summedLineWidths = grid[0],
            summedLineHeights = grid[1],
            totalGridWidth = _.last(summedLineWidths),
            totalGridHeight = _.last(summedLineHeights);
        this.pointWidth = Math.floor((width - totalGridWidth) / this.layout.width);
        this.pointHeight = Math.floor((height - totalGridHeight) / this.layout.height);
        this.totalWidth = this.pointWidth * this.layout.width + totalGridWidth;
        this.totalHeight = this.pointHeight * this.layout.height + totalGridHeight;

        this.xIndexCoord = new Array(this.layout.width + 1);
        for (i = 0; i < this.layout.width; i++) {
            this.xIndexCoord[i] = (i * this.pointWidth) + summedLineWidths[i];
        }
        this.xIndexCoord[i] = this.xIndexCoord[i - 1] + this.pointWidth;

        this.yIndexCoord = new Array(this.layout.height + 1);
        for (i = 0; i < this.layout.height; i++) {
            this.yIndexCoord[i] = (i * this.pointHeight) + summedLineHeights[i];
        }
        this.yIndexCoord[i] = this.yIndexCoord[i - 1] + this.pointHeight;
        this.draw();
    },



    calculateGrid : function (width, height) {
        var line_increment = 1;
        var borderWidth = 4;
        var widthDimension = Math.log(width) / Math.LN2;
        var heightDimension = Math.log(height) / Math.LN2;
        var i, j;

        var running_total = borderWidth;
        var summedLineWidths = [running_total];
        for (i = 1; i < width; ++i) {
            for (j = 0; j < widthDimension; j++) {
                if (i % (1 << j) === 0) {
                    running_total += line_increment;
                }
            }
            summedLineWidths.push(running_total);
        }
        running_total += borderWidth;
        summedLineWidths.push(running_total);


        running_total = borderWidth;
        var summedLineHeights = [running_total];
        for (i = 1; i < height; ++i) {
            for (j = 0; j < heightDimension; j++) {
                if (i % (1 << j) === 0) {
                    running_total += line_increment;
                }
            }
            summedLineHeights.push(running_total);
        }
        running_total += borderWidth;
        summedLineHeights.push(running_total);
        return [summedLineWidths, summedLineHeights];
    },

    draw : function () {
        var canvas = this.canvasElement.getContext("2d");
        canvas.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        canvas.fillStyle = "black";
        canvas.fillRect(0, 0, this.totalWidth, this.totalHeight);
        this.drawBase(canvas);
        this.drawHighlights(canvas);
    },

    drawBase : function (canvas) {
        var i, len, state, stateValue, coord;
        for (i = 0, len = this.stateValues.states.length; i < len; ++i) {
            state = this.stateValues.states[i];
            stateValue = this.stateValues.valueInt(i);
            coord = this.layoutToCanvas(this.layout.stateToPoint(state));
            canvas.fillStyle = this.colours.grey(stateValue);
            canvas.fillRect(coord.x, coord.y, this.pointWidth, this.pointHeight);
        }
    },

    drawHighlights : function (canvas) {
        var coord;
        var targetValue = 0;
        if (this.validPoint(this.selected)) {
            targetValue = this.stateValues.value(this.layout.pointToState(this.selected));
            canvas.fillStyle = this.colours.green(targetValue);
            coord = this.layoutToCanvas(this.selected);
            canvas.fillRect(coord.x, coord.y, this.pointWidth, this.pointHeight);
        }

        for (var i = 0, len = this.highlights.length; i < len; i++) {
            var col;
            var point = this.layout.stateToPoint(this.highlights[i]);
            var value = this.stateValues.value(this.highlights[i]);

            if (value === targetValue) {
                col = this.colours.blue(value);
            } else {
                col = this.colours.red(value);
            }

            coord = this.layoutToCanvas(point);
            canvas.fillStyle = col;
            canvas.fillRect(coord.x, coord.y, this.pointWidth, this.pointHeight);
        }
    },

    layoutToCanvas : function (point) {
        return {"x" : this.xIndexCoord[point.x],
                "y" : this.yIndexCoord[point.y]};
    },

    canvasToLayout : function (coord) {
        if (this.validPoint(coord)) {
            return {"x" : _.sortedIndex(this.xIndexCoord, coord.x) - 1,
                    "y" : _.sortedIndex(this.yIndexCoord, coord.y) - 1};
        }
    }
};



function StateValues(dimensions) {
    this._init(dimensions);
}

StateValues.prototype = {
    _init : function (dimensions) {
        var i, len,
            values = new Array(1 << dimensions);
        for (i = 0, len = values.length; i < len; ++i) {
            values[i] = Math.floor(Math.random() * 4);
        }
        this.setValues(values);
    },

    setValues : function (values_) {
        this.values = values_;
        this.minValue = _.min(values_);
        this.maxValue = _.max(values_);
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
        this.heightDims = (this.dims - this.dims % 2) / 2;
        this.width = 1 << this.widthDims;
        this.height = 1 << this.heightDims;
    },

    stateToPoint : function (state) {
        if (state.length !== this.dims) {
            return null;
        }
        var x = 0, y = 0;
        _.each(_.range(0, state.length, 2), function (index) {
            x += state[index] ? 1 << (index / 2) : 0;
        });
        _.each(_.range(1, state.length, 2), function (index) {
            y += state[index] ? 1 << ((index - 1) / 2) : 0;
        });
        return {"x" : x, "y" : y};
    },

    pointToState : function (point) {
        if (point.x > this.width - 1 || point.y > this.height - 1 ||
            point.x < 0 || point.y < 0) {
            return null;
        }
        var i;
        var state = new Array(this.dims);
        for (i = 0; i < this.widthDims; ++i) {
            state[i * 2] = Boolean(point.x & 1 << i);
        }
        for (i = 0; i < this.heightDims; ++i) {
            state[i * 2 + 1] = Boolean(point.y & 1 << i);
        }
        return state;
    }
};



function ColourHandler(view) {
    this._init(view);
}

ColourHandler.prototype = {
    _init : function (view) {
        // Grey level offset to distinguish bottom level from gridlines
        this.gridOffset = 0.3;
        this.minValue = view.minValue;
        this.range = view.maxValue - view.minValue;
    },

    getLevel : function (value) {
        var proportion;
        if (this.range === 0.0) {
            proportion = 1.0;
        } else {
            proportion = (value - this.minValue) / this.range;
        }
        return this.gridOffset + (1 - this.gridOffset) * proportion;
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
